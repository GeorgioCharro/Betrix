import type { WebSocketServer, WebSocket } from 'ws';
import type Redis from 'ioredis';
import db from '@repo/db';
import { userManager } from '../../user/user.service';
import {
  computeCrashMultiplier,
  generateCrashClientSeed,
  generateCrashServerSeed,
  getServerSeedHash,
} from './crash.provably-fair';

type RoundState = 'WAITING' | 'RUNNING' | 'CRASHED';

interface CrashBet {
  amount: number;
  cashedOut: boolean;
  cashoutMultiplier: number | null;
  cashoutAt?: number;
  hasPlacedBetThisRound: boolean;
  hasCashedOutThisRound: boolean;
}

// Abstraction for balance operations so we can plug in a real DB-backed implementation.
// In production, these should be implemented with atomic SQL like:
// UPDATE users SET balance = balance - :amount WHERE id = :userId AND balance >= :amount;
// and the inverse for crediting payouts.
export interface BalanceService {
  tryDebitForBet(userId: string, amount: number): Promise<boolean>;
  creditPayout(userId: string, amount: number): Promise<void>;
}

type BalanceChangeCallback = (userId: string, balanceInCents: number) => void;

// Placeholder implementation – always succeeds. Useful in tests.
export class NoopBalanceService implements BalanceService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async tryDebitForBet(userId: string, amount: number): Promise<boolean> {
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async creditPayout(userId: string, amount: number): Promise<void> {}
}

// Real balance implementation backed by the main user balance column.
// Amounts passed in are in major units; balances are stored as integer cents.
export class DbBalanceService implements BalanceService {
  constructor(private readonly onBalanceChange?: BalanceChangeCallback) {}

  async tryDebitForBet(userId: string, amount: number): Promise<boolean> {
    const betAmountInCents = Math.round(amount * 100);
    if (!Number.isFinite(betAmountInCents) || betAmountInCents <= 0) {
      return false;
    }

    const userInstance = await userManager.getUser(userId);

    const updatedBalance = await db.$transaction(async tx => {
      const row = await tx.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });
      if (!row) return null;

      const currentBalance = parseInt(row.balance, 10);
      if (Number.isNaN(currentBalance) || currentBalance < betAmountInCents) {
        return null;
      }

      const newBalance = (currentBalance - betAmountInCents).toString();
      const updated = await tx.user.update({
        where: { id: userId },
        data: { balance: newBalance },
        select: { balance: true },
      });
      return updated.balance;
    });

    if (updatedBalance == null) {
      return false;
    }

    userInstance.setBalance(updatedBalance);

    const balanceInCents = parseInt(updatedBalance, 10);
    if (Number.isFinite(balanceInCents) && this.onBalanceChange) {
      this.onBalanceChange(userId, balanceInCents);
    }

    return true;
  }

  async creditPayout(userId: string, amount: number): Promise<void> {
    const payoutInCents = Math.round(amount * 100);
    if (!Number.isFinite(payoutInCents) || payoutInCents <= 0) {
      return;
    }

    const userInstance = await userManager.getUser(userId);

    const updatedBalance = await db.$transaction(async tx => {
      const row = await tx.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });
      if (!row) return null;

      const currentBalance = parseInt(row.balance, 10);
      if (Number.isNaN(currentBalance)) {
        return null;
      }

      const newBalance = (currentBalance + payoutInCents).toString();
      const updated = await tx.user.update({
        where: { id: userId },
        data: { balance: newBalance },
        select: { balance: true },
      });
      return updated.balance;
    });

    if (updatedBalance == null) {
      return;
    }

    userInstance.setBalance(updatedBalance);

    const balanceInCents = parseInt(updatedBalance, 10);
    if (Number.isFinite(balanceInCents) && this.onBalanceChange) {
      this.onBalanceChange(userId, balanceInCents);
    }
  }
}

const WAITING_DURATION_MS = 5000;
const POST_CRASH_DELAY_MS = 2000;
const TICK_INTERVAL_MS = 33; // ~30fps for smoother animation
const MIN_BET = 1; // adjust as appropriate
const MAX_BET = 10_000; // adjust as appropriate
const SEED_ROUND_LIMIT = 1000;

export class CrashEngine {
  private wss: WebSocketServer | null;
  private redisPublisher: Redis | null;
  private balanceService: BalanceService;
  private state: RoundState = 'WAITING';
  private serverSeed: string;
  private clientSeed: string;
  private nonce = 0;
  private crashPoint = 1.0;
  private hash = '';
  private roundStartTime: number | null = null;
  private currentTick = 0;
  // Use a gentler growth rate; deterministic and smooth.
  private readonly growthRate = 0.085;
  // Bets are keyed by userId; WebSockets are mapped to userIds separately.
  private bets = new Map<string, CrashBet>();
  private nextRoundBets = new Map<string, CrashBet>();
  private wsToUser = new Map<WebSocket, string>();
  private serverSeedHash: string;
  private roundsWithCurrentSeed = 0;
  private lastBroadcastMultiplier = 0;
  private lastActionByUser = new Map<string, number>();

  constructor(
    wss: WebSocketServer | null,
    balanceService: BalanceService = new DbBalanceService(),
    redisPublisher: Redis | null = null,
  ) {
    this.wss = wss;
    this.redisPublisher = redisPublisher;
    this.balanceService = balanceService;
    this.serverSeed = generateCrashServerSeed();
    this.clientSeed = generateCrashClientSeed();
    this.serverSeedHash = getServerSeedHash(this.serverSeed);
    // Broadcast the hash of the server seed so clients can verify later when it is revealed.
    this.broadcast('crash:seed_hash', { serverSeedHash: this.serverSeedHash });
  }

  registerConnection(ws: WebSocket, userId: string): void {
    this.wsToUser.set(ws, userId);
  }

  start(): void {
    this.startNewRound();
    // Tick loop to broadcast multiplier while running
    setInterval(() => {
      void this.tick();
    }, TICK_INTERVAL_MS);
  }

  private broadcast(type: string, payload: unknown): void {
    const data = JSON.stringify({ type, ...payload });
    if (this.redisPublisher) {
      void this.redisPublisher.publish('crash_state', data);
      return;
    }

    if (!this.wss) return;

    this.wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(data);
      }
    });
  }

  private async tick(): Promise<void> {
    if (this.state !== 'RUNNING' || this.roundStartTime == null) return;

    const now = Date.now();
    const elapsedMs = now - this.roundStartTime;
    if (elapsedMs < 0) return;

    const tick = Math.floor(elapsedMs / TICK_INTERVAL_MS);
    if (tick <= this.currentTick) return;

    this.currentTick = tick;

    const elapsedSec = (tick * TICK_INTERVAL_MS) / 1000;
    const multiplier = this.getCurrentMultiplier(elapsedSec);

    // Auto‑cashout: any bet with a cashoutAt threshold that has been reached.
    this.bets.forEach((bet, userId) => {
      const ws = this.getWsForUser(userId);
      if (!ws) return;
      if (
        !bet.cashedOut &&
        typeof bet.cashoutAt === 'number' &&
        multiplier >= bet.cashoutAt &&
        multiplier < this.crashPoint
      ) {
        void this.performCashout(ws, bet, userId, true);
      }
    });

    if (multiplier >= this.crashPoint) {
      this.handleCrash(this.crashPoint);
      return;
    }

    if (multiplier !== this.lastBroadcastMultiplier) {
      this.lastBroadcastMultiplier = multiplier;
      this.broadcast('crash:multiplier', { multiplier });
    }
  }

  getCurrentState(): {
    state: RoundState;
    multiplier: number;
    roundStartTime: number | null;
    waitingMs: number | null;
    crashPoint: null;
    hash: string;
    clientSeed: string;
    nonce: number;
    history: {
      crashMultiplier: number;
      hash: string;
      nonce: number;
      timestamp: number;
      clientSeed: string;
      serverSeedHash: string;
    }[];
  } {
    let multiplier = 1;

    if (this.state === 'RUNNING' && this.roundStartTime != null) {
      const now = Date.now();
      const elapsedMs = now - this.roundStartTime;
      if (elapsedMs >= 0) {
        const tick = Math.floor(elapsedMs / TICK_INTERVAL_MS);
        const elapsedSec = (tick * TICK_INTERVAL_MS) / 1000;
        multiplier = this.getCurrentMultiplier(elapsedSec);
      }
    }

    return {
      state: this.state,
      multiplier,
      roundStartTime: this.roundStartTime,
      waitingMs: this.state === 'WAITING' ? WAITING_DURATION_MS : null,
      crashPoint: null,
      hash: this.hash,
      clientSeed: this.clientSeed,
      nonce: this.nonce,
      history: this.history.slice(),
    };
  }

  private getCurrentMultiplier(tSec: number): number {
    // Deterministic exponential curve: 1.00x at t=0, modest growth afterwards.
    const m = Math.exp(this.growthRate * tSec);
    return Math.max(1.0, Math.floor(m * 100) / 100);
  }

  private startNewRound(): void {
    this.state = 'WAITING';

    // Activate queued bets for the upcoming round and clear any leftover bets.
    this.bets.clear();
    this.nextRoundBets.forEach((bet, userId) => {
      bet.cashedOut = false;
      bet.cashoutMultiplier = null;
      bet.hasPlacedBetThisRound = true;
      bet.hasCashedOutThisRound = false;
      this.bets.set(userId, bet);
    });
    this.nextRoundBets.clear();

    this.roundsWithCurrentSeed += 1;
    this.currentTick = 0;
    this.nonce += 1;
    const { hash, crashMultiplier } = computeCrashMultiplier(
      this.serverSeed,
      this.clientSeed,
      this.nonce,
    );
    this.hash = hash;
    this.crashPoint = crashMultiplier;
    this.lastBroadcastMultiplier = 0;

    this.broadcast('crash:round_state', {
      state: this.state,
      waitingMs: WAITING_DURATION_MS,
      nextHash: this.hash,
    });

    setTimeout(() => {
      this.state = 'RUNNING';
      this.roundStartTime = Date.now();
      this.currentTick = 0;
      this.broadcast('crash:round_start', {
        state: this.state,
        hash: this.hash,
        clientSeed: this.clientSeed,
        nonce: this.nonce,
        roundStartTime: this.roundStartTime,
        growthRate: this.growthRate,
      });
    }, WAITING_DURATION_MS);
  }

  private handleCrash(multiplierAtCrash: number): void {
    if (this.state !== 'RUNNING') return;
    this.state = 'CRASHED';
    this.broadcast('crash:crashed', {
      state: this.state,
      multiplier: multiplierAtCrash,
    });

    // Unified crash event for triggering animations on the frontend.
    this.broadcast('crash:event', { type: 'explode', multiplier: multiplierAtCrash });

    // Append to history for clients to display recent rounds.
    this.appendHistoryEntry(multiplierAtCrash);

    // Seed rotation: after SEED_ROUND_LIMIT rounds, reveal the current seed and rotate.
    if (this.roundsWithCurrentSeed >= SEED_ROUND_LIMIT) {
      this.broadcast('crash:seed_reveal', {
        serverSeed: this.serverSeed,
        clientSeed: this.clientSeed,
      });
      this.serverSeed = generateCrashServerSeed();
      this.clientSeed = generateCrashClientSeed();
      this.serverSeedHash = getServerSeedHash(this.serverSeed);
      this.broadcast('crash:seed_hash', { serverSeedHash: this.serverSeedHash });
      this.roundsWithCurrentSeed = 0;
      this.nonce = 0;
    }

    // In a real money setup, settle non‑cashed bets here.

    setTimeout(() => {
      this.startNewRound();
    }, POST_CRASH_DELAY_MS);
  }

  async placeBet(ws: WebSocket, amount: number, cashoutAt?: number): Promise<void> {
    const userId = this.wsToUser.get(ws);
    if (!userId) {
      ws.send(JSON.stringify({ type: 'crash:place_bet_result', ok: false, error: 'Unknown user' }));
      return;
    }
    const now = Date.now();
    const lastAction = this.lastActionByUser.get(userId) ?? 0;
    if (now - lastAction < 200) {
      // Rate limited – ignore silently to avoid spamming responses.
      return;
    }
    this.lastActionByUser.set(userId, now);

    if (this.state === 'WAITING') {
      if (this.bets.has(userId) && this.bets.get(userId)?.hasPlacedBetThisRound) {
        ws.send(
          JSON.stringify({
            type: 'crash:place_bet_result',
            ok: false,
            error: 'Bet already placed this round',
          }),
        );
        return;
      }
    } else {
      if (this.nextRoundBets.has(userId)) {
        ws.send(
          JSON.stringify({
            type: 'crash:place_bet_result',
            ok: false,
            error: 'Bet already queued for next round',
          }),
        );
        return;
      }
    }
    if (!Number.isFinite(amount) || amount < MIN_BET || amount > MAX_BET) {
      ws.send(
        JSON.stringify({
          type: 'crash:place_bet_result',
          ok: false,
          error: `Invalid bet amount (min ${MIN_BET}, max ${MAX_BET})`,
        }),
      );
      return;
    }
    if (!(await this.balanceService.tryDebitForBet(userId, amount))) {
      ws.send(
        JSON.stringify({
          type: 'crash:place_bet_result',
          ok: false,
          error: 'Insufficient balance',
        }),
      );
      return;
    }

    const existing = this.bets.get(userId);
    const normalizedCashoutAt =
      typeof cashoutAt === 'number' && isFinite(cashoutAt) && cashoutAt > 1 ? cashoutAt : undefined;
    const bet: CrashBet = {
      ...(existing ?? {}),
      amount,
      cashedOut: false,
      cashoutMultiplier: null,
      cashoutAt: normalizedCashoutAt,
      hasPlacedBetThisRound: this.state === 'WAITING',
      hasCashedOutThisRound: false,
    };

    if (this.state === 'WAITING') {
      this.bets.set(userId, bet);
      this.broadcastBets();
      ws.send(JSON.stringify({ type: 'crash:place_bet_result', ok: true }));
    } else {
      this.nextRoundBets.set(userId, bet);
      this.broadcastBets();
      ws.send(
        JSON.stringify({
          type: 'crash:place_bet_result',
          ok: true,
          queued: true,
        }),
      );
    }
  }

  async cashOut(ws: WebSocket): Promise<void> {
    const userId = this.wsToUser.get(ws);
    if (!userId) {
      ws.send(JSON.stringify({ type: 'crash:cashout_result', ok: false, error: 'Unknown user' }));
      return;
    }

    const now = Date.now();
    const lastAction = this.lastActionByUser.get(userId) ?? 0;
    if (now - lastAction < 200) {
      // Rate limited – ignore silently.
      return;
    }
    this.lastActionByUser.set(userId, now);
    const bet = this.bets.get(userId);
    if (!bet) {
      ws.send(JSON.stringify({ type: 'crash:cashout_result', ok: false, error: 'No active bet' }));
      return;
    }
    if (bet.cashedOut) {
      ws.send(JSON.stringify({ type: 'crash:cashout_result', ok: false, error: 'Already cashed out' }));
      return;
    }
    if (this.state !== 'RUNNING' || this.roundStartTime == null) {
      ws.send(JSON.stringify({ type: 'crash:cashout_result', ok: false, error: 'Round not running' }));
      return;
    }
    if (bet.hasCashedOutThisRound) {
      ws.send(JSON.stringify({ type: 'crash:cashout_result', ok: false, error: 'Already cashed out this round' }));
      return;
    }

    await this.performCashout(ws, bet, userId, false);
  }

  removeClient(ws: WebSocket): void {
    // Don't delete bet; just drop the ws mapping so we can still settle balances.
    this.wsToUser.delete(ws);
  }

  private broadcastBets(): void {
    const players = this.bets.size + this.nextRoundBets.size;
    const totalBet =
      Array.from(this.bets.values()).reduce((sum, b) => sum + b.amount, 0) +
      Array.from(this.nextRoundBets.values()).reduce((sum, b) => sum + b.amount, 0);
    this.broadcast('crash:bets_update', {
      players,
      totalBet,
    });
  }

  private async performCashout(
    ws: WebSocket,
    bet: CrashBet,
    userId: string,
    auto: boolean,
  ): Promise<void> {
    if (this.state !== 'RUNNING' || this.roundStartTime == null) return;

    const elapsedMs = Date.now() - this.roundStartTime;
    if (elapsedMs < 0) {
      return;
    }

    const tick = Math.floor(elapsedMs / TICK_INTERVAL_MS);
    const elapsedSec = (tick * TICK_INTERVAL_MS) / 1000;
    const multiplier = this.getCurrentMultiplier(elapsedSec);
    if (multiplier >= this.crashPoint) {
      ws.send(
        JSON.stringify({
          type: 'crash:cashout_result',
          ok: false,
          error: 'Too late to cash out',
        }),
      );
      return;
    }

    bet.cashedOut = true;
    bet.cashoutMultiplier = multiplier;
    bet.hasCashedOutThisRound = true;
    const payout = bet.amount * multiplier;

    // Prepare for atomic DB integration: credit payout via balance service.
    await this.balanceService.creditPayout(userId, payout);

    this.broadcastBets();
    ws.send(
      JSON.stringify({
        type: 'crash:cashout_result',
        ok: true,
        payout,
        multiplier,
        auto,
      }),
    );
  }

  // Simple in‑memory history; consider persisting in DB for production.
  private history: {
    crashMultiplier: number;
    hash: string;
    nonce: number;
    timestamp: number;
    clientSeed: string;
    serverSeedHash: string;
  }[] = [];

  private appendHistoryEntry(crashMultiplier: number): void {
    const entry = {
      crashMultiplier,
      hash: this.hash,
      nonce: this.nonce,
      timestamp: Date.now(),
      clientSeed: this.clientSeed,
      serverSeedHash: this.serverSeedHash,
    };
    this.history.unshift(entry);
    if (this.history.length > 50) {
      this.history.pop();
    }
    this.broadcast('crash:history_update', { history: this.history });
    void this.persistRound(entry);
  }

  private getWsForUser(userId: string): WebSocket | null {
    for (const [ws, id] of this.wsToUser.entries()) {
      if (id === userId && ws.readyState === 1) {
        return ws;
      }
    }
    return null;
  }

  // Placeholder persistence; wire this to Prisma/SQL in production so completed rounds
  // are durable and can be audited even after restarts.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async persistRound(entry: {
    crashMultiplier: number;
    hash: string;
    nonce: number;
    timestamp: number;
    clientSeed: string;
    serverSeedHash: string;
  }): Promise<void> {
    // Implement with your ORM, e.g. CrashRound.create({ ...entry })
  }
}

