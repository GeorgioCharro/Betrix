import type { Request } from 'express';
import type { User } from '@prisma/client';
import db from '@repo/db';
import type { MinesHiddenState } from '@repo/common/game-utils/mines/types.js';
import type { RouletteBet } from '@repo/common/game-utils/roulette/validations.js';
import type { BlackjackActions } from '@repo/common/game-utils/blackjack/types.js';
import type { DiceCondition } from '@repo/common/game-utils/dice/types.js';
import type { KenoRisk } from '@repo/common/game-utils/keno/types.js';
import { userManager, getUserBets } from '../features/user/user.service';
import { getResult as getDiceResult } from '../features/games/dice/dice.service';
import { getResult as getLimboResult } from '../features/games/limbo/limbo.service';
import {
  calculateOutcome,
  type PlinkooOutcome,
} from '../features/games/plinkoo/plinkoo.service';
import { getResult as getKenoResult } from '../features/games/keno/keno.service';
import { minesManager } from '../features/games/mines/mines.service';
import {
  spinWheel,
  calculatePayout,
} from '../features/games/roulette/roulette.service';
import { blackjackManager } from '../features/games/blackjack/blackjack.service';
import { BadRequestError } from '../errors';

interface Context {
  req: Request;
}

export const resolvers = {
  Query: {
    currentUser: (_: unknown, __: unknown, { req }: Context) => {
      const user = req.user as User | undefined;
      if (!user) return null;
      // remove password and convert balance to a number
      const { password: _password, balance, ...rest } = user;
      return { ...rest, balance: parseInt(balance, 10) / 100 };
    },
    balance: async (_: unknown, __: unknown, { req }: Context) => {
      const user = req.user as User | undefined;
      if (!user) return null;
      const instance = await userManager.getUser(user.id);
      return instance.getBalanceAsNumber() / 100;
    },
    activeMines: async (_: unknown, __: unknown, { req }: Context) => {
      if (!req.isAuthenticated()) {
        throw new Error('Unauthorized');
      }
      const userId = (req.user as User).id;
      const game = await minesManager.getGame(userId);
      if (!game || !game.getBet().active) return null;
      const bet = game.getBet();
      return {
        id: bet.id,
        active: bet.active,
        state: {
          mines: null,
          rounds: game.getRounds(),
          minesCount: (bet.state as unknown as MinesHiddenState).minesCount,
        },
        betAmount: bet.betAmount / 100,
      };
    },
    blackjackActive: async (_: unknown, __: unknown, { req }: Context) => {
      if (!req.isAuthenticated()) {
        throw new Error('Unauthorized');
      }
      const userId = (req.user as User).id;
      const game = await blackjackManager.getGame(userId);
      if (!game || !game.getBet().active) return null;
      return game.getPlayRoundResponse();
    },
    provablyFairState: async (_: unknown, __: unknown, { req }: Context) => {
      if (!req.isAuthenticated()) {
        throw new Error('Unauthorized');
      }
      const userInstance = await userManager.getUser((req.user as User).id);
      return {
        clientSeed: userInstance.getClientSeed(),
        hashedServerSeed: userInstance.getHashedServerSeed(),
        hashedNextServerSeed: userInstance.getHashedNextServerSeed(),
        nonce: userInstance.getNonce(),
      };
    },
    revealedServerSeed: async (
      _: unknown,
      args: { hashedServerSeed: string },
      { req }: Context
    ) => {
      if (!req.isAuthenticated()) {
        throw new Error('Unauthorized');
      }
      const userInstance = await userManager.getUser((req.user as User).id);
      const serverSeed = await userInstance.getRevealedServerSeedByHash(
        args.hashedServerSeed
      );
      return { serverSeed };
    },
    userBetHistory: async (
      _: unknown,
      args: { page: number; pageSize: number },
      { req }: Context
    ) => {
      if (!req.isAuthenticated()) {
        throw new Error('Unauthorized');
      }
      const result = await getUserBets({
        userId: (req.user as User).id,
        page: args.page,
        pageSize: args.pageSize,
      });
      return result;
    },
  },
  Mutation: {
    placeDiceBet: async (
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
        payoutMultiplier > 0
          ? Math.round(betAmountInCents * payoutMultiplier)
          : 0;
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

        const newBalance = (
          userBalanceInCents + balanceChangeInCents
        ).toString();
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
    },

    placeKenoBet: async (
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

        const newBalance = (
          userBalanceInCents + balanceChangeInCents
        ).toString();
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
    },

    startMines: async (
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
    },

    playMinesRound: async (
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
    },

    cashOutMines: async (_: unknown, __: unknown, { req }: Context) => {
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
    },

    placeRouletteBet: async (
      _: unknown,
      args: { bets: RouletteBet[] },
      { req }: Context
    ) => {
      if (!req.isAuthenticated()) {
        throw new Error('Unauthorized');
      }

      const { bets } = args;
      const userInstance = await userManager.getUser((req.user as User).id);
      const user = userInstance.getUser();
      const totalBetAmountInCents = Math.round(
        bets.reduce((sum, b) => sum + b.amount, 0) * 100
      );

      const userBalanceInCents = userInstance.getBalanceAsNumber();

      if (userBalanceInCents < totalBetAmountInCents) {
        throw new BadRequestError('Insufficient balance');
      }

      const winningNumber = await spinWheel(user.id);
      const payout = calculatePayout(args.bets, winningNumber);

      const gameState = {
        bets,
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
            state: gameState,
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
        state: gameState,
        payoutMultiplier: payoutInCents / totalBetAmountInCents,
        payout: payoutInCents / 100,
        balance: userInstance.getBalanceAsNumber() / 100,
      };
    },

    blackjackBet: async (
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
    },

    blackjackNext: async (
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
    },

    plinkooOutcome: (
      _: unknown,
      _args: { clientSeed?: string },
      __: Context
    ): PlinkooOutcome => {
      const result = calculateOutcome();
      return result;
    },

    playLimbo: (_: unknown, args: { clientSeed?: string }, __: Context) => {
      return getLimboResult(args.clientSeed || '');
    },
    rotateSeed: async (
      _: unknown,
      args: { clientSeed: string },
      { req }: Context
    ) => {
      if (!req.isAuthenticated()) {
        throw new Error('Unauthorized');
      }
      const userInstance = await userManager.getUser((req.user as User).id);
      const seed = await userInstance.rotateSeed(args.clientSeed);
      return seed;
    },
  },
};
