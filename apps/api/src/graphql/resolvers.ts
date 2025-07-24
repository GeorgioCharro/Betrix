import type { Request } from 'express';
import db from '@repo/db';
import type { Prisma, User } from '@prisma/client';
import type { MinesHiddenState } from '@repo/common/game-utils/mines/types.js';
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
import { userManager, getUserBets } from '../features/user/user.service';
import { getResult as getDiceResult } from '../features/games/dice/dice.service';
import { getResult as getLimboResult } from '../features/games/limbo/limbo.service';
import { calculateOutcome } from '../features/games/plinkoo/plinkoo.service';
import { getResult as getKenoResult } from '../features/games/keno/keno.service';
import { minesManager } from '../features/games/mines/mines.service';
import {
  spinWheel,
  calculatePayout,
} from '../features/games/roulette/roulette.service';
import { blackjackManager } from '../features/games/blackjack/blackjack.service';
import { BadRequestError } from '../errors';
import type { Risk } from '../features/games/plinkoo/plinkoo.constants';
import { broadcastBalanceUpdate } from '../websocket';

interface Context {
  req: Request;
}
const verifyApiKey = (req: Request) => {
  const apiKey = req.header('x-api-key');
  if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
    throw new Error('Unauthorized');
  }
};

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
    allBets: async (
      _: unknown,
      args: { page: number; pageSize: number },
      { req }: Context
    ) => {
      verifyApiKey(req);
      const page = Math.max(1, args.page || 1);
      const pageSize = Math.min(100, Math.max(1, args.pageSize || 10));

      const totalCount = await db.bet.count();
      const bets = await db.bet.findMany({
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      const formatted = bets.map(bet => ({
        userId: bet.userId,
        betId: bet.betId.toString().padStart(12, '0'),
        game: bet.game,
        createdAt: bet.createdAt,
        updatedAt: bet.updatedAt,
        betAmount: bet.betAmount / 100,
        payoutMultiplier: bet.payoutAmount / bet.betAmount,
        payout: bet.payoutAmount / 100,
        id: bet.id,
        betNonce: bet.betNonce,
        provablyFairStateId: bet.provablyFairStateId,
        state: JSON.stringify(bet.state),
      }));

      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        bets: formatted,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    },
    betsByUser: async (
      _: unknown,
      args: { userId: string; page: number; pageSize: number },
      { req }: Context
    ) => {
      verifyApiKey(req);
      const { userId } = args;
      if (!userId) {
        throw new BadRequestError('Invalid parameters');
      }

      const page = Math.max(1, args.page || 1);
      const pageSize = Math.min(100, Math.max(1, args.pageSize || 10));

      const totalCount = await db.bet.count({ where: { userId } });
      const bets = await db.bet.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      const formatted = bets.map(bet => ({
        userId: bet.userId,
        betId: bet.betId.toString().padStart(12, '0'),
        game: bet.game,
        createdAt: bet.createdAt,
        updatedAt: bet.updatedAt,
        betAmount: bet.betAmount / 100,
        payoutMultiplier: bet.payoutAmount / bet.betAmount,
        payout: bet.payoutAmount / 100,
        id: bet.id,
        betNonce: bet.betNonce,
        provablyFairStateId: bet.provablyFairStateId,
        state: JSON.stringify(bet.state),
      }));

      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        bets: formatted,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    },
    betsByTime: async (
      _: unknown,
      args: { start: string; end: string; page: number; pageSize: number },
      { req }: Context
    ) => {
      verifyApiKey(req);
      const startDate = new Date(args.start);
      const endDate = new Date(args.end);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new BadRequestError('Invalid parameters');
      }

      const page = Math.max(1, args.page || 1);
      const pageSize = Math.min(100, Math.max(1, args.pageSize || 10));

      const totalCount = await db.bet.count({
        where: { createdAt: { gte: startDate, lte: endDate } },
      });
      const bets = await db.bet.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      const formatted = bets.map(bet => ({
        userId: bet.userId,
        betId: bet.betId.toString().padStart(12, '0'),
        game: bet.game,
        createdAt: bet.createdAt,
        updatedAt: bet.updatedAt,
        betAmount: bet.betAmount / 100,
        payoutMultiplier: bet.payoutAmount / bet.betAmount,
        payout: bet.payoutAmount / 100,
        id: bet.id,
        betNonce: bet.betNonce,
        provablyFairStateId: bet.provablyFairStateId,
        state: JSON.stringify(bet.state),
      }));

      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        bets: formatted,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    },
    allWithdraws: async (
      _: unknown,
      args: { page: number; pageSize: number },
      { req }: Context
    ) => {
      verifyApiKey(req);
      const page = Math.max(1, args.page || 1);
      const pageSize = Math.min(100, Math.max(1, args.pageSize || 10));

      const totalCount = await db.withdraw.count();
      const withdraws = await db.withdraw.findMany({
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      const formatted = withdraws.map(w => ({
        userId: w.userId,
        withdrawId: w.withdrawId.toString().padStart(12, '0'),
        amount: w.amount / 100,
        status: w.status,
        withdrawAddress: w.withdrawAddress,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
        id: w.id,
      }));

      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        withdraws: formatted,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    },
    withdrawsByUser: async (
      _: unknown,
      args: { userId: string; page: number; pageSize: number },
      { req }: Context
    ) => {
      verifyApiKey(req);
      const { userId } = args;
      if (!userId) {
        throw new BadRequestError('Invalid parameters');
      }

      const page = Math.max(1, args.page || 1);
      const pageSize = Math.min(100, Math.max(1, args.pageSize || 10));

      const totalCount = await db.withdraw.count({ where: { userId } });
      const withdraws = await db.withdraw.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      const formatted = withdraws.map(w => ({
        userId: w.userId,
        withdrawId: w.withdrawId.toString().padStart(12, '0'),
        amount: w.amount / 100,
        status: w.status,
        withdrawAddress: w.withdrawAddress,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
        id: w.id,
      }));

      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        withdraws: formatted,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    },
    withdrawsByTime: async (
      _: unknown,
      args: { start: string; end: string; page: number; pageSize: number },
      { req }: Context
    ) => {
      verifyApiKey(req);
      const startDate = new Date(args.start);
      const endDate = new Date(args.end);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new BadRequestError('Invalid parameters');
      }

      const page = Math.max(1, args.page || 1);
      const pageSize = Math.min(100, Math.max(1, args.pageSize || 10));

      const totalCount = await db.withdraw.count({
        where: { createdAt: { gte: startDate, lte: endDate } },
      });
      const withdraws = await db.withdraw.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      const formatted = withdraws.map(w => ({
        userId: w.userId,
        withdrawId: w.withdrawId.toString().padStart(12, '0'),
        amount: w.amount / 100,
        status: w.status,
        withdrawAddress: w.withdrawAddress,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
        id: w.id,
      }));

      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        withdraws: formatted,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    },
    allDeposits: async (
      _: unknown,
      args: { page: number; pageSize: number },
      { req }: Context
    ) => {
      verifyApiKey(req);
      const page = Math.max(1, args.page || 1);
      const pageSize = Math.min(100, Math.max(1, args.pageSize || 10));

      const totalCount = await db.deposit.count();
      const deposits = await db.deposit.findMany({
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      const formatted = deposits.map(d => ({
        userId: d.userId,
        depositId: d.depositId.toString().padStart(12, '0'),
        amount: d.amount / 100,
        status: d.status,
        depositAddress: d.depositAddress,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        id: d.id,
      }));

      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        deposits: formatted,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    },
    depositsByUser: async (
      _: unknown,
      args: { userId: string; page: number; pageSize: number },
      { req }: Context
    ) => {
      verifyApiKey(req);
      const { userId } = args;
      if (!userId) {
        throw new BadRequestError('Invalid parameters');
      }

      const page = Math.max(1, args.page || 1);
      const pageSize = Math.min(100, Math.max(1, args.pageSize || 10));

      const totalCount = await db.deposit.count({ where: { userId } });
      const deposits = await db.deposit.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      const formatted = deposits.map(d => ({
        userId: d.userId,
        depositId: d.depositId.toString().padStart(12, '0'),
        amount: d.amount / 100,
        status: d.status,
        depositAddress: d.depositAddress,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        id: d.id,
      }));

      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        deposits: formatted,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    },
    depositsByTime: async (
      _: unknown,
      args: { start: string; end: string; page: number; pageSize: number },
      { req }: Context
    ) => {
      verifyApiKey(req);
      const startDate = new Date(args.start);
      const endDate = new Date(args.end);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new BadRequestError('Invalid parameters');
      }

      const page = Math.max(1, args.page || 1);
      const pageSize = Math.min(100, Math.max(1, args.pageSize || 10));

      const totalCount = await db.deposit.count({
        where: { createdAt: { gte: startDate, lte: endDate } },
      });
      const deposits = await db.deposit.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      const formatted = deposits.map(d => ({
        userId: d.userId,
        depositId: d.depositId.toString().padStart(12, '0'),
        amount: d.amount / 100,
        status: d.status,
        depositAddress: d.depositAddress,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        id: d.id,
      }));

      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        deposits: formatted,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    },
    allUsers: async (
      _: unknown,
      args: { page: number; pageSize: number },
      { req }: Context
    ) => {
      verifyApiKey(req);
      const page = Math.max(1, args.page || 1);
      const pageSize = Math.min(100, Math.max(1, args.pageSize || 10));

      const totalCount = await db.user.count();
      const users = await db.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          balance: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      const formatted = users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        balance: parseInt(u.balance, 10) / 100,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      }));

      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        users: formatted,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    },
    usersByTime: async (
      _: unknown,
      args: { start: string; end: string; page: number; pageSize: number },
      { req }: Context
    ) => {
      verifyApiKey(req);
      const startDate = new Date(args.start);
      const endDate = new Date(args.end);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new BadRequestError('Invalid parameters');
      }

      const page = Math.max(1, args.page || 1);
      const pageSize = Math.min(100, Math.max(1, args.pageSize || 10));

      const totalCount = await db.user.count({
        where: { createdAt: { gte: startDate, lte: endDate } },
      });
      const users = await db.user.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: {
          id: true,
          email: true,
          name: true,
          balance: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      const formatted = users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        balance: parseInt(u.balance, 10) / 100,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      }));

      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        users: formatted,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    },
  },
  MinesRoundResponse: {
    __resolveType(obj: Record<string, unknown>) {
      if ('payout' in obj) {
        return 'MinesGameOverResponse';
      }
      return 'MinesPlayRoundResponse';
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
            // Always wrap as an array, even for single-number selection
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
            // These are already arrays by definition, just pass through
            return { ...bet } as RouletteFormattedBet;

          // The following have NO selection property at all
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

    plinkooOutcome: async (
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
            game: 'plinkoo',
            payoutAmount: payoutInCents,
            provablyFairStateId: userInstance.getProvablyFairStateId(),
            state: result as unknown as Prisma.InputJsonValue,
            userId: user.id,
          },
        });

        await userInstance.updateNonce(tx);

        const newBalance = (
          userBalanceInCents + balanceChangeInCents
        ).toString();

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
    depositBalance: async (
      _: unknown,
      args: {
        userId: string;
        amount: number;
        depositAddress?: string;
        status?: string;
      },
      { req }: Context
    ) => {
      verifyApiKey(req);
      const { userId, amount, depositAddress, status } = args;
      if (!userId || typeof amount !== 'number' || amount <= 0) {
        throw new BadRequestError('Invalid parameters');
      }

      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new BadRequestError('User not found');
      }

      const cents = Math.round(amount * 100);
      const newBalance = (parseInt(user.balance, 10) + cents).toString();
      const updated = await db.user.update({
        where: { id: userId },
        data: { balance: newBalance },
      });
      await db.deposit.create({
        data: {
          userId,
          amount: cents,
          status: status ?? 'completed',
          depositAddress: depositAddress ?? '',
        },
      });

      const balanceValue = parseInt(updated.balance, 10) / 100;
      broadcastBalanceUpdate(userId, balanceValue);

      return { balance: balanceValue };
    },
    withdrawBalance: async (
      _: unknown,
      args: {
        userId: string;
        amount: number;
        withdrawAddress?: string;
        status?: string;
      },
      { req }: Context
    ) => {
      verifyApiKey(req);
      const { userId, amount, withdrawAddress, status } = args;
      if (!userId || typeof amount !== 'number' || amount <= 0) {
        throw new BadRequestError('Invalid parameters');
      }

      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new BadRequestError('User not found');
      }

      const cents = Math.round(amount * 100);
      const current = parseInt(user.balance, 10);
      if (current < cents) {
        throw new BadRequestError('Insufficient balance');
      }

      const newBalance = (current - cents).toString();
      const updated = await db.user.update({
        where: { id: userId },
        data: { balance: newBalance },
      });

      await db.withdraw.create({
        data: {
          userId,
          amount: cents,
          status: status ?? 'completed',
          withdrawAddress: withdrawAddress ?? '',
        },
      });

      const balanceValue = parseInt(updated.balance, 10) / 100;
      broadcastBalanceUpdate(userId, balanceValue);

      return { balance: balanceValue };
    },
  },
};
