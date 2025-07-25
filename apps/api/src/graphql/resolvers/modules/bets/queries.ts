import db from '@repo/db';
import type { Prisma } from '@prisma/client';
import { BadRequestError } from '../../../errors';
import { verifyApiKey } from '../common';
import type { Context } from '../common';
import { getUserBets } from '../../../features/user/user.service';
import type { User } from '@prisma/client';

export const userBetHistory = async (
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
};

export const allBets = async (
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
};

export const bets = async (
  _: unknown,
  args: {
    userId?: string;
    start?: string;
    end?: string;
    page: number;
    pageSize: number;
  },
  { req }: Context
) => {
  verifyApiKey(req);
  const where: Prisma.BetWhereInput = {};
  if (args.userId) {
    where.userId = args.userId;
  }
  if (args.start || args.end) {
    if (!args.start || !args.end) {
      throw new BadRequestError('Invalid parameters');
    }
    const startDate = new Date(args.start);
    const endDate = new Date(args.end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestError('Invalid parameters');
    }
    where.createdAt = { gte: startDate, lte: endDate };
  }

  const page = Math.max(1, args.page || 1);
  const pageSize = Math.min(100, Math.max(1, args.pageSize || 10));

  const totalCount = await db.bet.count({ where });
  const bets = await db.bet.findMany({
    where,
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
};
