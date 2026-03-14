import type { User } from '@prisma/client';
import db from '@repo/db';
import { getGeneratedFloats } from '@repo/common/game-utils/provably-fair/utils.js';
import {
  createOrderedDeck,
  shuffleDeck,
  createDeckWithFirstCard,
  floatToNextCard,
  compareHiloCards,
  getHiloProbabilities,
  getHiloMultipliers,
} from '@repo/common/game-utils/hilo/utils.js';
import type { HiloCard, HiloChoice } from '@repo/common/game-utils/hilo/types.js';
import type { UserInstance } from '../../user/user.service';
import { addPlayerXpInTransaction } from '../../user/user.service';

export interface HiloStartCardResult {
  card: HiloCard;
  /** Nonce used to create the deck (for provably fair verification). */
  roundNonce: number;
}

/** Active round state stored in bet.state. Uses cumulative multiplier: payout = stake * totalMultiplier. */
interface HiloActiveState {
  currentCard: HiloCard;
  betAmount: number;
  /** Cumulative product of step multipliers (starts at 1, multiplied by each step's mult on win). */
  totalMultiplier: number;
  /** Provably fair shuffled deck; cards drawn sequentially. Present when using deck-based draw. */
  deck?: HiloCard[];
  /** Index into deck of the current card (next card is deck[deckIndex + 1]). */
  deckIndex?: number;
}

const HILO_DECK_MESSAGE = 'hilo-deck';

/**
 * Create or replace the current "choosing start card" session.
 * Uses a provably fair shuffled deck: shuffle once with serverSeed/clientSeed/nonce, then draw sequentially.
 * State: { deck, deckIndex: 0, currentCard: deck[0], betAmount: 0, totalMultiplier: 1 }.
 */
export async function getHiloStartCard(
  userInstance: UserInstance,
  user: User
): Promise<HiloStartCardResult> {
  const serverSeed = userInstance.getServerSeed();
  const clientSeed = userInstance.getClientSeed();
  const nonce = userInstance.getNonce();
  const message = `${clientSeed}:${nonce}:${HILO_DECK_MESSAGE}`;
  const floats = getGeneratedFloats({
    count: 52,
    seed: serverSeed,
    message,
  });
  const getFloat = (i: number) => floats[i] ?? 0;
  const deck = shuffleDeck(createOrderedDeck(), getFloat);
  const card = deck[0]!;
  const state: HiloActiveState = {
    currentCard: card,
    betAmount: 0,
    totalMultiplier: 1,
    deck,
    deckIndex: 0,
  };

  await db.$transaction(async (tx) => {
    await tx.bet.deleteMany({
      where: { userId: user.id, game: 'hilo', active: true },
    });
    await tx.bet.create({
      data: {
        active: true,
        betAmount: 0,
        betNonce: nonce,
        game: 'hilo',
        payoutAmount: 0,
        provablyFairStateId: userInstance.getProvablyFairStateId(),
        state: state as object,
        userId: user.id,
      },
    });
    await userInstance.updateNonce(tx);
  });

  return { card, roundNonce: nonce };
}

async function createNextStartCardFromExisting(
  userInstance: UserInstance,
  userId: string,
  card: HiloCard
): Promise<void> {
  const serverSeed = userInstance.getServerSeed();
  const clientSeed = userInstance.getClientSeed();
  const nonce = userInstance.getNonce();
  const message = `${clientSeed}:${nonce}:${HILO_DECK_MESSAGE}`;
  const floats = getGeneratedFloats({
    count: 52,
    seed: serverSeed,
    message,
  });
  const getFloat = (i: number) => floats[i] ?? 0;
  const deck = createDeckWithFirstCard(card, getFloat);
  const state: HiloActiveState = {
    currentCard: card,
    betAmount: 0,
    totalMultiplier: 1,
    deck,
    deckIndex: 0,
  };

  await db.$transaction(async (tx) => {
    await tx.bet.deleteMany({
      where: { userId, game: 'hilo', active: true },
    });
    await tx.bet.create({
      data: {
        active: true,
        betAmount: 0,
        betNonce: nonce,
        game: 'hilo',
        payoutAmount: 0,
        provablyFairStateId: userInstance.getProvablyFairStateId(),
        state: state as object,
        userId,
      },
    });
    await userInstance.updateNonce(tx);
  });
}

export interface StartHiloRoundParams {
  userInstance: UserInstance;
  userId: string;
  betAmount: number;
}

export interface StartHiloRoundResult {
  id: string;
  currentCard: HiloCard;
  betAmount: number;
  totalMultiplier: number;
  accumulatedProfit: number;
  multiplierHigher: number;
  multiplierLower: number;
  balance: number;
  /** Nonce used for this round (for provably fair verification). */
  roundNonce: number;
}

/**
 * Lock in the bet amount for the current start card: deduct stake from balance
 * but do not draw the next card yet.
 */
export async function startHiloRound(
  params: StartHiloRoundParams
): Promise<StartHiloRoundResult> {
  const { userInstance, userId, betAmount } = params;
  const betAmountCents = Math.round(betAmount * 100);
  if (betAmountCents <= 0) {
    throw new Error('Bet amount must be greater than 0');
  }

  const activeBet = await db.bet.findFirst({
    where: { userId, game: 'hilo', active: true },
  });

  if (!activeBet || !activeBet.state) {
    throw new Error('No start card chosen. Use getHiloStartCard first.');
  }

  const state = activeBet.state as unknown as HiloActiveState;
  const currentCard = state.currentCard;
  if (!currentCard?.rank || !currentCard.suit) {
    throw new Error('Invalid round state');
  }

  // Don't allow starting twice for the same round
  if (activeBet.betAmount && activeBet.betAmount > 0) {
    throw new Error('Round already started');
  }

  const userRow = await db.user.findUnique({
    where: { id: userId },
    select: { balance: true },
  });
  const userBalanceInCents = userRow ? parseInt(userRow.balance, 10) : 0;
  if (userBalanceInCents < betAmountCents) {
    throw new Error('Insufficient balance');
  }

  const newBalanceCents = userBalanceInCents - betAmountCents;
  const newState: HiloActiveState = {
    currentCard,
    betAmount: betAmountCents,
    totalMultiplier: 1,
    ...(state.deck != null ? { deck: state.deck, deckIndex: state.deckIndex ?? 0 } : {}),
  };

  const { balance } = await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { balance: newBalanceCents.toString() },
    });
    await tx.bet.update({
      where: { id: activeBet.id },
      data: {
        betAmount: betAmountCents,
        state: newState as object,
      },
    });
    // Do not increment nonce: this round was created by getHiloStartCard; provablyFair uses bet.betNonce.
    // Award XP based on wager amount (in major currency units)
    await addPlayerXpInTransaction(tx, {
      userId,
      wagerAmount: betAmount,
    });
    const u = await tx.user.findUnique({ where: { id: userId } });
    return { balance: u!.balance };
  });

  userInstance.setBalance(balance);

  const { multiplierHigher, multiplierLower } = getHiloMultipliers(currentCard.rank);

  return {
    id: activeBet.id,
    currentCard,
    betAmount,
    totalMultiplier: newState.totalMultiplier,
    accumulatedProfit: (betAmountCents / 100) * (newState.totalMultiplier - 1),
    multiplierHigher,
    multiplierLower,
    balance: parseInt(balance, 10) / 100,
    roundNonce: activeBet.betNonce,
  };
}

export type GetActiveHiloResult = {
  id: string;
  currentCard: HiloCard;
  betAmount: number;
  totalMultiplier: number;
  accumulatedProfit: number;
  multiplierHigher: number;
  multiplierLower: number;
  /** Nonce used for this round (for provably fair verification). */
  roundNonce: number;
} | null;

export async function getActiveHilo(userId: string): Promise<GetActiveHiloResult | null> {
  const bet = await db.bet.findFirst({
    where: { userId, game: 'hilo', active: true },
  });
  // Only treat as an \"active round\" if a real stake has been placed.
  // Bets created by getHiloStartCard have betAmount = 0 and should not
  // flip the UI into a cash-out state.
  if (!bet?.state || !bet.betAmount || bet.betAmount <= 0) {
    return null;
  }
  const s = bet.state as unknown as HiloActiveState & { accumulatedProfit?: number };
  if (!s.currentCard?.rank || !s.currentCard?.suit) return null;
  // Support old state format: accumulatedProfit was in cents
  const totalMultiplier =
    s.totalMultiplier != null
      ? s.totalMultiplier
      : s.betAmount > 0 && s.accumulatedProfit != null
        ? 1 + s.accumulatedProfit / s.betAmount
        : 1;
  const { multiplierHigher, multiplierLower } = getHiloMultipliers(s.currentCard.rank);
  return {
    id: bet.id,
    currentCard: s.currentCard,
    betAmount: s.betAmount / 100,
    totalMultiplier,
    accumulatedProfit: (s.betAmount / 100) * (totalMultiplier - 1),
    multiplierHigher,
    multiplierLower,
    roundNonce: bet.betNonce,
  };
}

export interface AdvanceHiloParams {
  userInstance: UserInstance;
  userId: string;
  betAmount: number;
  choice: HiloChoice;
}

export interface AdvanceHiloResult {
  id: string;
  active: boolean;
  currentCard: HiloCard;
  betAmount: number;
  totalMultiplier: number;
  accumulatedProfit: number;
  nextCard: HiloCard;
  outcome: 'higher' | 'lower' | 'equal';
  stepProfit: number;
  balance: number;
  lost?: boolean;
  /** Nonce used for this round (for provably fair verification). */
  roundNonce: number;
}

export async function advanceHilo(params: AdvanceHiloParams): Promise<AdvanceHiloResult> {
  const { userInstance, userId, betAmount, choice } = params;
  const betAmountCents = Math.round(betAmount * 100);
  if (betAmountCents <= 0) {
    throw new Error('Bet amount must be greater than 0');
  }

  const activeBet = await db.bet.findFirst({
    where: { userId, game: 'hilo', active: true },
  });

  if (!activeBet || !activeBet.state) {
    throw new Error('No active Hilo round. Get a start card first.');
  }

  const state = activeBet.state as unknown as HiloActiveState & { accumulatedProfit?: number };
  const currentCard = state.currentCard;
  if (!currentCard?.rank || !currentCard?.suit) {
    throw new Error('Invalid round state');
  }

  const isFirstAdvance = state.betAmount === 0;
  // Support old state format: totalMultiplier may be missing (was accumulatedProfit in cents)
  const currentTotalMultiplierFromState =
    state.totalMultiplier != null
      ? state.totalMultiplier
      : state.betAmount > 0 && state.accumulatedProfit != null
        ? 1 + state.accumulatedProfit / state.betAmount
        : 1;

  // Use DB balance as source of truth so we never add/subtract from a stale cached value
  const userRow = await db.user.findUnique({
    where: { id: userId },
    select: { balance: true },
  });
  const userBalanceInCents = userRow ? parseInt(userRow.balance, 10) : 0;

  if (isFirstAdvance) {
    if (userBalanceInCents < betAmountCents) {
      throw new Error('Insufficient balance');
    }
  }

  const deck = state.deck;
  const deckIndex = state.deckIndex ?? 0;
  let nextCard: HiloCard;
  let usedLegacyFloat = false;
  if (deck && deckIndex + 1 < deck.length) {
    nextCard = deck[deckIndex + 1]!;
  } else {
    // Legacy: no deck (old bets) — draw with provably fair float
    const [float] = userInstance.generateFloats(1);
    nextCard = floatToNextCard(currentCard, float);
    usedLegacyFloat = true;
  }
  const outcome = compareHiloCards(currentCard, nextCard);

  const { multiplierHigher, multiplierLower, multiplierEqual } =
    getHiloMultipliers(currentCard.rank);
  const mult =
    choice === 'higher'
      ? multiplierHigher
      : choice === 'lower'
        ? multiplierLower
        : multiplierEqual;

  const currentTotalMultiplier = currentTotalMultiplierFromState;
  const stakeCents = state.betAmount > 0 ? state.betAmount : betAmountCents;

  let newTotalMultiplier = currentTotalMultiplier;
  let stepProfitCents = 0;
  let newCurrentCard: HiloCard = currentCard;
  let active = true;
  let lost = false;

  // Win: outcome matches choice (including outcome === 'equal' && choice === 'equal')
  // Push: outcome === 'equal' but player did NOT choose equal → multiplier unchanged, round continues
  // Lose: outcome !== choice and outcome !== 'equal'
  if (outcome === choice) {
    newTotalMultiplier = currentTotalMultiplier * mult;
    stepProfitCents = Math.round(stakeCents * (newTotalMultiplier - currentTotalMultiplier));
    newCurrentCard = nextCard;
  } else if (outcome === 'equal') {
    // Push: card advances, multiplier unchanged, no balance change
    newTotalMultiplier = currentTotalMultiplier;
    stepProfitCents = 0;
    newCurrentCard = nextCard;
    active = true;
  } else {
    active = false;
    lost = true;
  }

  const newBetAmountCents = isFirstAdvance ? betAmountCents : state.betAmount;
  const actualBalanceChange = isFirstAdvance ? -betAmountCents : 0;
  const finalBalanceCents = userBalanceInCents + actualBalanceChange;

  const newState: HiloActiveState = active
    ? {
        currentCard: newCurrentCard,
        betAmount: newBetAmountCents,
        totalMultiplier: newTotalMultiplier,
        ...(deck ? { deck, deckIndex: deckIndex + 1 } : {}),
      }
    : state;

  const { balance } = await db.$transaction(async (tx) => {
    if (actualBalanceChange !== 0) {
      await tx.user.update({
        where: { id: userId },
        data: { balance: finalBalanceCents.toString() },
      });
    }
    await tx.bet.update({
      where: { id: activeBet.id },
      data: {
        active,
        betAmount: isFirstAdvance ? betAmountCents : activeBet.betAmount,
        payoutAmount: lost ? 0 : activeBet.payoutAmount,
        state: newState as object,
      },
    });
    if (usedLegacyFloat) {
      await userInstance.updateNonce(tx);
    }
    // If this is the first advance and no separate start round was used,
    // award XP based on the wager amount here.
    if (isFirstAdvance) {
      await addPlayerXpInTransaction(tx, {
        userId,
        wagerAmount: betAmount,
      });
    }
    const u = await tx.user.findUnique({ where: { id: userId } });
    return { balance: u!.balance };
  });

  userInstance.setBalance(balance);

  if (lost) {
    // Prepare next round: last drawn card becomes the next start card.
    await createNextStartCardFromExisting(userInstance, userId, nextCard);
  }

  return {
    id: activeBet.id,
    active,
    currentCard: newCurrentCard,
    betAmount: newBetAmountCents / 100,
    totalMultiplier: newTotalMultiplier,
    accumulatedProfit: (newBetAmountCents / 100) * (newTotalMultiplier - 1),
    nextCard,
    outcome,
    stepProfit: stepProfitCents / 100,
    balance: parseInt(balance, 10) / 100,
    lost,
    roundNonce: activeBet.betNonce,
  };
}

export interface CashOutHiloParams {
  userInstance: UserInstance;
  userId: string;
}

export interface CashOutHiloResult {
  id: string;
  payout: number;
  balance: number;
  /** Nonce used for this round (for provably fair verification). */
  roundNonce: number;
}

export async function cashOutHilo(params: CashOutHiloParams): Promise<CashOutHiloResult> {
  const { userInstance, userId } = params;

  const activeBet = await db.bet.findFirst({
    where: { userId, game: 'hilo', active: true },
  });

  if (!activeBet || !activeBet.state) {
    throw new Error('No active Hilo round to cash out.');
  }

  const state = activeBet.state as unknown as HiloActiveState & { accumulatedProfit?: number };
  const totalMultiplier =
    state.totalMultiplier != null
      ? state.totalMultiplier
      : state.betAmount > 0 && state.accumulatedProfit != null
        ? 1 + state.accumulatedProfit / state.betAmount
        : 1;
  const payoutCents = Math.round(state.betAmount * totalMultiplier);
  if (payoutCents <= 0) {
    throw new Error('Nothing to cash out.');
  }

  // Use DB balance as source of truth so we add payout to the actual current balance
  const userRow = await db.user.findUnique({
    where: { id: userId },
    select: { balance: true },
  });
  const userBalanceInCents = userRow ? parseInt(userRow.balance, 10) : 0;
  const newBalanceCents = userBalanceInCents + payoutCents;

  const { balance } = await db.$transaction(async (tx) => {
    await tx.bet.update({
      where: { id: activeBet.id },
      data: { active: false, payoutAmount: payoutCents },
    });
    await tx.user.update({
      where: { id: userId },
      data: { balance: newBalanceCents.toString() },
    });
    const u = await tx.user.findUnique({ where: { id: userId } });
    return { balance: u!.balance };
  });

  userInstance.setBalance(balance);

  const roundNonce = activeBet.betNonce;
  // Prepare next round: current card becomes the next start card (creates new deck and increments nonce).
  await createNextStartCardFromExisting(userInstance, userId, state.currentCard);

  return {
    id: activeBet.id,
    payout: payoutCents / 100,
    balance: parseInt(balance, 10) / 100,
    roundNonce,
  };
}
