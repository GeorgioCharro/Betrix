import type { User, Prisma } from '@prisma/client';
import db from '@repo/db';
import {
  RouletteBetTypes,
  BetsSchema,
  validateBets,
} from '@repo/common/game-utils/roulette/index.js';
import type {
  RouletteBet,
  RouletteFormattedBet,
  RoulettePlaceBetResponse,
} from '@repo/common/game-utils/roulette/index.js';
import { BlackjackActions } from '@repo/common/game-utils/blackjack/types.js';
import type { DiceCondition } from '@repo/common/game-utils/dice/types.js';
import type { KenoRisk } from '@repo/common/game-utils/keno/types.js';
import { userManager } from '../../../../features/user/user.service';
import { minesManager } from '../../../../features/games/mines/mines.service';
import { chickenRoadManager } from '../../../../features/games/chicken-road/chicken-road.service';
import { blackjackManager } from '../../../../features/games/blackjack/blackjack.service';
import { getResult as getDiceResult } from '../../../../features/games/dice/dice.service';
import { getResult as getLimboResult } from '../../../../features/games/limbo/limbo.service';
import { calculateOutcome } from '../../../../features/games/plinkoo/plinkoo.service';
import { getResult as getKenoResult } from '../../../../features/games/keno/keno.service';
import {
  spinWheel,
  calculatePayout,
} from '../../../../features/games/roulette/roulette.service';
import type { Risk } from '../../../../features/games/plinkoo/plinkoo.constants';
import { BadRequestError } from '../../../../errors';
import type { Context } from '../../common';

export const placeDiceBet = async (
  _: unknown,
  args: { target: number; condition: DiceCondition; betAmount: number },
  { req }: Context
) => {
  if (!req.isAuthenticated()) {
    throw new Error('Unauthorized');
  }

  const { target, condition, betAmount } = args;

  if (betAmount <= 0) {
    throw new BadRequestError('Bet amount must be greater than 0');
  }

  const user = req.user as User;
  const userInstance = await userManager.getUser(user.id);
  const betAmountInCents = Math.round(betAmount * 100);
  const userBalanceInCents = userInstance.getBalanceAsNumber();
  if (userBalanceInCents < betAmountInCents) {
    throw new BadRequestError('Insufficient balance');
  }

  const result = getDiceResult({ userInstance, target, condition });
  const { payoutMultiplier } = result;
  const payoutInCents =
    payoutMultiplier > 0 ? Math.round(betAmountInCents * payoutMultiplier) : 0;
  const balanceChangeInCents = payoutInCents - betAmountInCents;

  const { balance, id } = await db.$transaction(async tx => {
    const bet = await tx.bet.create({
      data: {
        active: false,
        betAmount: betAmountInCents,
        betNonce: userInstance.getNonce(),
        game: 'dice',
        payoutAmount: payoutInCents,
        provablyFairStateId: userInstance.getProvablyFairStateId(),
        state: result.state,
        userId: user.id,
      },
    });

    await userInstance.updateNonce(tx);

    const newBalance = (userBalanceInCents + balanceChangeInCents).toString();
    const userWithNewBalance = await tx.user.update({
      where: { id: user.id },
      data: {
        balance: newBalance,
      },
    });

    return { balance: userWithNewBalance.balance, id: bet.id };
  });

  userInstance.setBalance(balance);

  return {
    ...result,
    balance: userInstance.getBalanceAsNumber() / 100,
    id,
    payout: payoutInCents / 100,
  };
};

export const placeKenoBet = async (
  _: unknown,
  args: { betAmount: number; selectedTiles: number[]; risk: KenoRisk },
  { req }: Context
) => {
  if (!req.isAuthenticated()) {
    throw new Error('Unauthorized');
  }

  const { betAmount, selectedTiles, risk } = args;
  const user = req.user as User;
  const userInstance = await userManager.getUser(user.id);
  const betAmountInCents = Math.round(betAmount * 100);
  const userBalanceInCents = userInstance.getBalanceAsNumber();

  if (userBalanceInCents < betAmountInCents) {
    throw new BadRequestError('Insufficient balance');
  }

  const result = getKenoResult({ userInstance, selectedTiles, risk });
  const payoutInCents =
    result.payoutMultiplier > 0
      ? Math.round(betAmountInCents * result.payoutMultiplier)
      : 0;
  const balanceChangeInCents = payoutInCents - betAmountInCents;

  const { balance, id } = await db.$transaction(async tx => {
    const bet = await tx.bet.create({
      data: {
        active: false,
        betAmount: betAmountInCents,
        betNonce: userInstance.getNonce(),
        game: 'keno',
        payoutAmount: payoutInCents,
        provablyFairStateId: userInstance.getProvablyFairStateId(),
        state: result.state,
        userId: user.id,
      },
    });

    await userInstance.updateNonce(tx);

    const newBalance = (userBalanceInCents + balanceChangeInCents).toString();
    const userWithNewBalance = await tx.user.update({
      where: { id: user.id },
      data: {
        balance: newBalance,
      },
    });

    return { balance: userWithNewBalance.balance, id: bet.id };
  });

  userInstance.setBalance(balance);

  return {
    ...result,
    balance: userInstance.getBalanceAsNumber() / 100,
    id,
    payout: payoutInCents / 100,
  };
};

export const startMines = async (
  _: unknown,
  args: { betAmount: number; minesCount: number },
  { req }: Context
) => {
  if (!req.isAuthenticated()) {
    throw new Error('Unauthorized');
  }

  const user = req.user as User;
  const userInstance = await userManager.getUser(user.id);
  const betAmountInCents = Math.round(args.betAmount * 100);
  const userBalanceInCents = userInstance.getBalanceAsNumber();

  if (userBalanceInCents < betAmountInCents) {
    throw new BadRequestError('Insufficient balance');
  }

  const game = await minesManager.createGame({
    betAmount: betAmountInCents,
    minesCount: args.minesCount,
    userId: user.id,
  });

  const bet = game.getBet();

  return {
    id: bet.id,
    active: true,
    state: { mines: null, minesCount: args.minesCount, rounds: [] },
    betAmount: bet.betAmount / 100,
  };
};

export const playMinesRound = async (
  _: unknown,
  args: { selectedTileIndex: number },
  { req }: Context
) => {
  if (!req.isAuthenticated()) {
    throw new Error('Unauthorized');
  }
  const user = req.user as User;
  const game = await minesManager.getGame(user.id);
  if (!game?.getBet().active) {
    throw new BadRequestError('Game not found');
  }
  const state = await game.playRound(args.selectedTileIndex);
  if (!state.active) {
    minesManager.deleteGame(user.id);
  }
  return state;
};

export const cashOutMines = async (
  _: unknown,
  __: unknown,
  { req }: Context
) => {
  if (!req.isAuthenticated()) {
    throw new Error('Unauthorized');
  }
  const userId = (req.user as User).id;
  const game = await minesManager.getGame(userId);
  if (!game?.getBet().active) {
    throw new BadRequestError('Game not found');
  }
  const state = await game.cashOut(userId);
  minesManager.deleteGame(userId);
  return state;
};

const CHICKEN_ROAD_DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'] as const;

export const startChickenRoad = async (
  _: unknown,
  args: { betAmount: number; difficulty?: string },
  { req }: Context
) => {
  if (!req.isAuthenticated()) {
    throw new Error('Unauthorized');
  }
  const user = req.user as User;
  const betAmountInCents = Math.round(args.betAmount * 100);
  const rawDifficulty =
    typeof args.difficulty === 'string' ? args.difficulty.toLowerCase() : '';
  const difficulty = CHICKEN_ROAD_DIFFICULTIES.includes(
    rawDifficulty as (typeof CHICKEN_ROAD_DIFFICULTIES)[number]
  )
    ? (rawDifficulty as (typeof CHICKEN_ROAD_DIFFICULTIES)[number])
    : 'medium';
  const { game, newBalance } = await chickenRoadManager.createGame({
    betAmount: betAmountInCents,
    userId: user.id,
    difficulty,
  });
  const bet = game.getBet();
  return {
    id: bet.id,
    active: true,
    state: { hopsCompleted: 0 },
    betAmount: bet.betAmount / 100,
    currentMultiplier: 1,
    hopsCompleted: 0,
    difficulty,
  };
};

export const crossChickenRoad = async (
  _: unknown,
  __: unknown,
  { req }: Context
) => {
  if (!req.isAuthenticated()) {
    throw new Error('Unauthorized');
  }
  const userId = (req.user as User).id;
  const game = await chickenRoadManager.getGame(userId);
  if (!game?.getBet().active) {
    throw new BadRequestError('Game not found');
  }
  const result = await game.cross();
  if (!result.active) {
    chickenRoadManager.deleteGame(userId);
  }
  return result;
};

export const cashOutChickenRoad = async (
  _: unknown,
  __: unknown,
  { req }: Context
) => {
  if (!req.isAuthenticated()) {
    throw new Error('Unauthorized');
  }
  const userId = (req.user as User).id;
  const game = await chickenRoadManager.getGame(userId);
  if (!game?.getBet().active) {
    throw new BadRequestError('Game not found');
  }
  const state = await game.cashOut(userId);
  chickenRoadManager.deleteGame(userId);
  return state;
};

export const placeRouletteBet = async (
  _: unknown,
  args: { bets: RouletteBet[] },
  { req }: Context
) => {
  if (!req.isAuthenticated()) {
    throw new Error('Unauthorized');
  }

  const { bets } = args;

  const validationResult = BetsSchema.safeParse({ bets });
  if (!validationResult.success) {
    throw new BadRequestError('Invalid request for bets');
  }

  const validBets = validateBets(validationResult.data.bets);
  if (validBets.length === 0) {
    throw new BadRequestError('No valid bets placed');
  }

  const userInstance = await userManager.getUser((req.user as User).id);
  const user = userInstance.getUser();
  const totalBetAmountInCents = Math.round(
    validBets.reduce((sum, b) => sum + b.amount, 0) * 100
  );

  const userBalanceInCents = userInstance.getBalanceAsNumber();

  if (userBalanceInCents < totalBetAmountInCents) {
    throw new BadRequestError('Insufficient balance');
  }

  const winningNumber = await spinWheel(user.id);
  const payout = calculatePayout(validBets, winningNumber);

  const formattedBets: RouletteFormattedBet[] = validBets.map(bet => {
    switch (bet.betType) {
      case RouletteBetTypes.STRAIGHT:
      case RouletteBetTypes.DOZEN:
      case RouletteBetTypes.COLUMN:
        return {
          ...bet,
          selection: Array.isArray(bet.selection)
            ? bet.selection
            : [bet.selection],
        } as RouletteFormattedBet;

      case RouletteBetTypes.SPLIT:
      case RouletteBetTypes.CORNER:
      case RouletteBetTypes.STREET:
      case RouletteBetTypes.SIXLINE:
        return { ...bet } as RouletteFormattedBet;

      case RouletteBetTypes.BLACK:
      case RouletteBetTypes.RED:
      case RouletteBetTypes.EVEN:
      case RouletteBetTypes.ODD:
      case RouletteBetTypes.HIGH:
      case RouletteBetTypes.LOW:
        return bet as RouletteFormattedBet;

      default:
        return bet as RouletteFormattedBet;
    }
  });

  const gameState: Prisma.JsonObject = {
    bets: formattedBets as unknown as Prisma.JsonArray,
    winningNumber: String(winningNumber),
  };

  const payoutInCents = Math.round(payout * 100);
  const balanceChangeInCents = payoutInCents - totalBetAmountInCents;

  const newBalance = (userBalanceInCents + balanceChangeInCents).toString();

  const { balance, id } = await db.$transaction(async tx => {
    const bet = await tx.bet.create({
      data: {
        active: false,
        betAmount: totalBetAmountInCents,
        betNonce: userInstance.getNonce(),
        game: 'roulette',
        payoutAmount: payoutInCents,
        provablyFairStateId: userInstance.getProvablyFairStateId(),
        state: gameState as Prisma.InputJsonValue,
        userId: user.id,
      },
    });

    await userInstance.updateNonce(tx);

    const userWithNewBalance = await tx.user.update({
      where: { id: user.id },
      data: {
        balance: newBalance,
      },
    });

    return {
      balance: userWithNewBalance.balance,
      id: bet.id,
    };
  });

  userInstance.setBalance(balance);

  return {
    id,
    state: gameState as unknown as RoulettePlaceBetResponse['state'],
    payoutMultiplier: payoutInCents / totalBetAmountInCents,
    payout: payoutInCents / 100,
    balance: userInstance.getBalanceAsNumber() / 100,
  };
};

export const blackjackBet = async (
  _: unknown,
  args: { betAmount: number },
  { req }: Context
) => {
  if (!req.isAuthenticated()) {
    throw new Error('Unauthorized');
  }
  const user = req.user as User;

  const { game, newBalance } = await blackjackManager.createGame({
    betAmount: Math.round(args.betAmount * 100),
    userId: user.id,
  });

  const dbUpdateObject = game.getDbUpdateObject();
  if (dbUpdateObject) {
    await db.bet.update(dbUpdateObject);
  }

  const response = game.getPlayRoundResponse();
  return {
    ...response,
    balance: parseInt(newBalance, 10) / 100,
  };
};

export const blackjackNext = async (
  _: unknown,
  args: { action: BlackjackActions },
  { req }: Context
) => {
  if (!req.isAuthenticated()) {
    throw new Error('Unauthorized');
  }
  const userId = (req.user as User).id;
  const game = await blackjackManager.getGame(userId);

  if (!game?.getBet().active) {
    throw new BadRequestError('Game not found');
  }

  const userInstance = await userManager.getUser(userId);
  const bet = game.getBet();
  const balanceInCents = userInstance.getBalanceAsNumber();
  const betAmountInCents = bet.betAmount;

  if (args.action === BlackjackActions.DOUBLE || args.action === BlackjackActions.SPLIT) {
    if (balanceInCents < betAmountInCents) {
      throw new BadRequestError('Insufficient balance to double or split');
    }
  }
  if (args.action === BlackjackActions.INSURANCE) {
    if (balanceInCents < Math.floor(betAmountInCents / 2)) {
      throw new BadRequestError('Insufficient balance for insurance');
    }
  }

  game.playRound(args.action);
  const dbUpdateObject = game.getDbUpdateObject();
  const response = game.getPlayRoundResponse();

  // Additional wager deductions: double = +1x bet, split = +1x bet, insurance = +0.5x bet
  let deductionCents = 0;
  if (args.action === BlackjackActions.DOUBLE) {
    deductionCents += bet.betAmount;
  }
  if (args.action === BlackjackActions.SPLIT) {
    deductionCents += bet.betAmount;
  }
  if (args.action === BlackjackActions.INSURANCE) {
    deductionCents += Math.floor(bet.betAmount / 2);
  }

  const userBalanceInCents = userInstance.getBalanceAsNumber();
  const payoutInCents = Math.round((response.payout ?? 0) * 100);
  const balanceChange = -deductionCents + (response.active ? 0 : payoutInCents);

  await db.$transaction(async tx => {
    if (dbUpdateObject) {
      await tx.bet.update(dbUpdateObject);
    }
    // Apply deduction for double/split/insurance, and credit payout when game ends
    if (balanceChange !== 0) {
      const newBalance = (userBalanceInCents + balanceChange).toString();
      const userWithNewBalance = await tx.user.update({
        where: { id: userId },
        data: { balance: newBalance },
      });
      userInstance.setBalance(userWithNewBalance.balance);
    }
  });

  if (!response.active) {
    blackjackManager.deleteGame(userId);
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { balance: true },
  });
  const balanceInDollars = user
    ? parseInt(user.balance, 10) / 100
    : userInstance.getBalanceAsNumber() / 100;
  return {
    ...response,
    balance: balanceInDollars,
  };
};

export const plinkooOutcome = async (
  _: unknown,
  args: {
    clientSeed?: string;
    betamount: number;
    rows?: number;
    risk?: Risk;
  },
  { req }: Context
) => {
  if (!req.isAuthenticated()) {
    throw new Error('Unauthorized');
  }

  const { clientSeed = '', betamount, rows = 16, risk } = args;

  if (betamount <= 0) {
    throw new BadRequestError('Bet amount must be greater than 0');
  }

  const user = req.user as User;
  const userInstance = await userManager.getUser(user.id);
  const betAmountInCents = Math.round(betamount * 100);
  const userBalanceInCents = userInstance.getBalanceAsNumber();

  if (userBalanceInCents < betAmountInCents) {
    throw new BadRequestError('Insufficient balance');
  }

  const result = calculateOutcome(clientSeed, rows, risk);
  const payoutMultiplier = result.multiplier;
  const payoutInCents =
    payoutMultiplier > 0 ? Math.round(betAmountInCents * payoutMultiplier) : 0;
  const balanceChangeInCents = payoutInCents - betAmountInCents;

  const { balance, id } = await db.$transaction(async tx => {
    const bet = await tx.bet.create({
      data: {
        active: false,
        betAmount: betAmountInCents,
        betNonce: userInstance.getNonce(),
        game: 'plinkoo',
        payoutAmount: payoutInCents,
        provablyFairStateId: userInstance.getProvablyFairStateId(),
        state: result as unknown as Prisma.InputJsonValue,
        userId: user.id,
      },
    });

    await userInstance.updateNonce(tx);

    const newBalance = (userBalanceInCents + balanceChangeInCents).toString();

    const userWithNewBalance = await tx.user.update({
      where: { id: user.id },
      data: { balance: newBalance },
    });

    return { balance: userWithNewBalance.balance, id: bet.id };
  });

  userInstance.setBalance(balance);

  return {
    id,
    state: result,
    payoutMultiplier,
    payout: payoutInCents / 100,
    balance: userInstance.getBalanceAsNumber() / 100,
  };
};

export const playLimbo = (
  _: unknown,
  args: { clientSeed?: string },
  __: Context
) => {
  return getLimboResult(args.clientSeed || '');
};

export const placeLimboBet = async (
  _: unknown,
  args: { betAmount: number; targetMultiplier: number },
  { req }: Context
) => {
  if (!req.isAuthenticated()) {
    throw new Error('Unauthorized');
  }

  const { betAmount, targetMultiplier } = args;

  if (betAmount <= 0) {
    throw new BadRequestError('Bet amount must be greater than 0');
  }

  const user = req.user as User;
  const userInstance = await userManager.getUser(user.id);
  const betAmountInCents = Math.round(betAmount * 100);
  const userBalanceInCents = userInstance.getBalanceAsNumber();

  if (userBalanceInCents < betAmountInCents) {
    throw new BadRequestError('Insufficient balance');
  }

  // For Limbo we treat the provably-fair float as the roll in (0,1)
  const [roll] = userInstance.generateFloats(1);

  const {
    clampTargetMultiplier,
    resolveLimboBet,
  } = await import('@repo/common/game-utils/limbo/utils.js');

  const target = clampTargetMultiplier(targetMultiplier);
  const { payoutMultiplier, winChance } = resolveLimboBet({
    targetMultiplier: target,
    roll,
  });

  const payoutInCents =
    payoutMultiplier > 0 ? Math.round(betAmountInCents * payoutMultiplier) : 0;
  const balanceChangeInCents = payoutInCents - betAmountInCents;

  const state: Prisma.JsonObject = {
    targetMultiplier: target,
    roll,
    winChance,
  };

  const { balance, id } = await db.$transaction(async tx => {
    const bet = await tx.bet.create({
      data: {
        active: false,
        betAmount: betAmountInCents,
        betNonce: userInstance.getNonce(),
        game: 'dice', // NOTE: keep as 'dice' until Game enum is extended with 'limbo'
        payoutAmount: payoutInCents,
        provablyFairStateId: userInstance.getProvablyFairStateId(),
        state: state as Prisma.InputJsonValue,
        userId: user.id,
      },
    });

    await userInstance.updateNonce(tx);

    const newBalance = (userBalanceInCents + balanceChangeInCents).toString();

    const userWithNewBalance = await tx.user.update({
      where: { id: user.id },
      data: { balance: newBalance },
    });

    return { balance: userWithNewBalance.balance, id: bet.id };
  });

  userInstance.setBalance(balance);

  return {
    id,
    state,
    payoutMultiplier,
    payout: payoutInCents / 100,
    balance: userInstance.getBalanceAsNumber() / 100,
  };
};
