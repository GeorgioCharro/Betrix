import {
  TOTAL_TILES,
  DEFAULT_DIFFICULTY,
  type ChickenRoadDifficulty,
} from '@repo/common/game-utils/chicken-road/constants.js';
import type {
  ChickenRoadGameOverResponse,
  ChickenRoadHiddenState,
  ChickenRoadPlayRoundResponse,
  ChickenRoadRevealedState,
} from '@repo/common/game-utils/chicken-road/types.js';
import {
  getMultiplierAfterHops,
  generateOutcomesFromFloats,
} from '@repo/common/game-utils/chicken-road/utils.js';
import db from '@repo/db';
import { Game, type Bet } from '@prisma/client';
import { userManager } from '../../user/user.service';
import { BadRequestError } from '../../../errors';

class ChickenRoadManager {
  private static instance: ChickenRoadManager | undefined;
  private games: Map<string, ChickenRoad>;

  private constructor() {
    this.games = new Map();
  }

  static getInstance(): ChickenRoadManager {
    if (!ChickenRoadManager.instance) {
      ChickenRoadManager.instance = new ChickenRoadManager();
    }
    return ChickenRoadManager.instance;
  }

  async getGame(userId: string): Promise<ChickenRoad | null> {
    if (!this.games.has(userId)) {
      const bet = await db.bet.findFirst({
        where: { userId, active: true, game: Game.chicken_road },
      });
      if (!bet) return null;
      const game = new ChickenRoad(bet);
      this.games.set(userId, game);
    }
    return this.games.get(userId) ?? null;
  }

  async createGame({
    betAmount,
    userId,
    difficulty = DEFAULT_DIFFICULTY,
  }: {
    betAmount: number;
    userId: string;
    difficulty?: ChickenRoadDifficulty;
  }): Promise<{ game: ChickenRoad; newBalance: string }> {
    const userInstance = await userManager.getUser(userId);
    const balanceInCents = userInstance.getBalanceAsNumber();
    if (balanceInCents < betAmount) {
      throw new BadRequestError('Insufficient balance');
    }
    const floats = userInstance.generateFloats(TOTAL_TILES);
    const outcomes = generateOutcomesFromFloats(floats, difficulty);
    const newBalanceInCents = balanceInCents - betAmount;

    const createdBet = await db.$transaction(async tx => {
      const bet = await tx.bet.create({
        data: {
          active: true,
          betAmount,
          betNonce: userInstance.getNonce(),
          game: Game.chicken_road,
          provablyFairStateId: userInstance.getProvablyFairStateId(),
          state: { outcomes, hopsCompleted: 0, difficulty } as ChickenRoadHiddenState,
          userId: userInstance.getUser().id,
          payoutAmount: 0,
        },
      });
      await userInstance.updateNonce(tx);
      const userWithNewBalance = await tx.user.update({
        where: { id: userId },
        data: { balance: newBalanceInCents.toString() },
      });
      return { bet, newBalance: userWithNewBalance.balance };
    });

    const game = new ChickenRoad(createdBet.bet);
    this.games.set(createdBet.bet.userId, game);
    userInstance.setBalance(createdBet.newBalance);
    return { game, newBalance: createdBet.newBalance };
  }

  deleteGame(userId: string): void {
    this.games.delete(userId);
  }
}

class ChickenRoad {
  private bet: Bet;

  constructor(bet: Bet) {
    this.bet = bet;
  }

  getBet(): Bet {
    return this.bet;
  }

  /** Try to cross to the next lane. Returns play response or game over if crashed. */
  async cross(): Promise<ChickenRoadPlayRoundResponse | ChickenRoadGameOverResponse> {
    const state = this.bet.state as unknown as ChickenRoadHiddenState;
    if (!state?.outcomes || state.hopsCompleted == null) {
      throw new BadRequestError('Game state not found');
    }
    const nextHopIndex = state.hopsCompleted;
    if (nextHopIndex >= state.outcomes.length) {
      throw new BadRequestError('No more hops');
    }
    const survived = state.outcomes[nextHopIndex];
    if (!survived) {
      return this.getGameOverState(this.bet.userId, nextHopIndex);
    }
    const newHopsCompleted = nextHopIndex + 1;
    const difficulty = state.difficulty ?? DEFAULT_DIFFICULTY;
    const currentMultiplier = getMultiplierAfterHops(newHopsCompleted, difficulty);
    const newState: ChickenRoadHiddenState = {
      outcomes: state.outcomes,
      hopsCompleted: newHopsCompleted,
      difficulty,
    };
    await db.bet.update({
      where: { id: this.bet.id, active: true },
      data: { state: newState },
    });
    // Update in-memory bet so the next cross() sees the new state (same instance is cached in manager)
    (this.bet as { state: ChickenRoadHiddenState }).state = newState;
    return {
      id: this.bet.id,
      active: true,
      state: { hopsCompleted: newHopsCompleted },
      betAmount: this.bet.betAmount / 100,
      currentMultiplier,
      hopsCompleted: newHopsCompleted,
      difficulty,
    };
  }

  async cashOut(userId: string): Promise<ChickenRoadGameOverResponse> {
    const state = this.bet.state as unknown as ChickenRoadHiddenState;
    if (!state?.outcomes || state.hopsCompleted == null) {
      throw new BadRequestError('Game state not found');
    }
    const difficulty = state.difficulty ?? DEFAULT_DIFFICULTY;
    const payoutMultiplier = getMultiplierAfterHops(state.hopsCompleted, difficulty);
    return this.getGameOverState(userId, undefined, payoutMultiplier);
  }

  private async getGameOverState(
    userId: string,
    crashedAtHop?: number,
    cashOutMultiplier?: number
  ): Promise<ChickenRoadGameOverResponse> {
    const userInstance = await userManager.getUser(userId);
    const state = this.bet.state as unknown as ChickenRoadHiddenState;
    const payoutMultiplier = cashOutMultiplier ?? 0;
    const payoutAmountInCents = Math.round(
      (this.bet.betAmount * payoutMultiplier)
    );
    const userBalanceInCents = userInstance.getBalanceAsNumber();
    const newBalance = (userBalanceInCents + payoutAmountInCents).toString();

    const balance = await db.$transaction(async tx => {
      await tx.bet.update({
        where: { id: this.bet.id },
        data: {
          payoutAmount: payoutAmountInCents,
          active: false,
          state: state ?? {},
        },
      });
      const u = await tx.user.update({
        where: { id: userId },
        data: { balance: newBalance },
      });
      return u.balance;
    });
    userInstance.setBalance(balance);

    return {
      id: this.bet.id,
      state: state ?? { outcomes: [], hopsCompleted: 0 },
      payoutMultiplier,
      payout: Number((payoutAmountInCents / 100).toFixed(2)),
      balance: Number((parseInt(balance, 10) / 100).toFixed(2)),
      active: false,
      crashedAtHop,
    };
  }
}

export const chickenRoadManager = ChickenRoadManager.getInstance();
