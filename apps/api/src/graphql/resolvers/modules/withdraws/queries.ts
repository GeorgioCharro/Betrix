import db from '@repo/db';
import type { Prisma } from '@prisma/client';
import { BadRequestError } from '../../../../errors';
import { verifyApiKey } from '../../common';
import type { Context } from '../../common';

export const allWithdraws = async (
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
};

export const withdraws = async (
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
  const where: Prisma.WithdrawWhereInput = {};
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

  const totalCount = await db.withdraw.count({ where });
  const withdrawsRecords = await db.withdraw.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, name: true } } },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const formatted = withdrawsRecords.map(w => ({
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
};
