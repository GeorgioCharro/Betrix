import type { Prisma, User } from '@prisma/client';
import db from '@repo/db';
import { userManager } from '../../../../features/user/user.service';
import { BadRequestError } from '../../../../errors';
import { verifyApiKey } from '../../common';
import type { Context } from '../../common';

export const currentUser = (_: unknown, __: unknown, { req }: Context) => {
  const user = req.user as User | undefined;
  if (!user) return null;
  const { password: _password, balance, ...rest } = user;
  return {
    ...rest,
    balance: parseInt(balance, 10) / 100,
  };
};

export const balance = async (_: unknown, __: unknown, { req }: Context) => {
  const user = req.user as User | undefined;
  if (!user) return null;
  const instance = await userManager.getUser(user.id);
  return instance.getBalanceAsNumber() / 100;
};

export const provablyFairState = async (
  _: unknown,
  __: unknown,
  { req }: Context
) => {
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
};

export const revealedServerSeed = async (
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
};

export const allUsers = async (
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
      xp: true,
      level: true,
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
    xp: u.xp,
    level: u.level,
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
};

export const users = async (
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
  const where: Prisma.UserWhereInput = {};
  if (args.userId) {
    where.id = args.userId;
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

  const totalCount = await db.user.count({ where });
  const usersRecords = await db.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      name: true,
      balance: true,
      xp: true,
      level: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const formatted = usersRecords.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    balance: parseInt(u.balance, 10) / 100,
    xp: u.xp,
    level: u.level,
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
};
