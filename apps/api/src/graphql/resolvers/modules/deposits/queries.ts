import db from '@repo/db';
import type { Prisma } from '@prisma/client';
import { BadRequestError } from '../../../../errors';
import { verifyApiKey } from '../../common';
import type { Context } from '../../common';

export const allDeposits = async (
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
};

export const deposits = async (
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
  const where: Prisma.DepositWhereInput = {};
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

  const totalCount = await db.deposit.count({ where });
  const depositsRecords = await db.deposit.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, name: true } } },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const formatted = depositsRecords.map(d => ({
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
};
