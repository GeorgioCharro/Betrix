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
import type { BlackjackActions } from '@repo/common/game-utils/blackjack/types.js';
import type { DiceCondition } from '@repo/common/game-utils/dice/types.js';
import type { KenoRisk } from '@repo/common/game-utils/keno/types.js';
import { userManager } from '../../../../features/user/user.service';
import { minesManager } from '../../../../features/games/mines/mines.service';
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

  const game = await blackjackManager.createGame({
    betAmount: Math.round(args.betAmount * 100),
    userId: user.id,
  });

  const dbUpdateObject = game.getDbUpdateObject();
  if (dbUpdateObject) {
    await db.bet.update(dbUpdateObject);
  }

  return game.getPlayRoundResponse();
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

  game.playRound(args.action);
  const dbUpdateObject = game.getDbUpdateObject();

  if (dbUpdateObject) {
    await db.bet.update(dbUpdateObject);
  }

  return game.getPlayRoundResponse();
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
