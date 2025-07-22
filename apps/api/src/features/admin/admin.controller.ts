import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import db from '@repo/db';
import {
  ApiResponse,
  type PaginatedBetsResponse,
  type PaginatedUsersResponse,
} from '@repo/common/types';
import { BadRequestError } from '../../errors';
import { broadcastBalanceUpdate } from '../../websocket';

export const depositBalance = async (req: Request, res: Response) => {
  const { userId, amount } = req.body as { userId: string; amount: number };

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

  const balanceValue = parseInt(updated.balance, 10) / 100;
  broadcastBalanceUpdate(userId, balanceValue);

  return res.status(StatusCodes.OK).json(
    new ApiResponse(StatusCodes.OK, {
      balance: balanceValue,
    })
  );
};

export const withdrawBalance = async (req: Request, res: Response) => {
  const { userId, amount } = req.body as { userId: string; amount: number };

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

  const balanceValue = parseInt(updated.balance, 10) / 100;
  broadcastBalanceUpdate(userId, balanceValue);

  return res.status(StatusCodes.OK).json(
    new ApiResponse(StatusCodes.OK, {
      balance: balanceValue,
    })
  );
};

export const getAllBets = async (
  req: Request,
  res: Response<ApiResponse<PaginatedBetsResponse>>
) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(req.query.pageSize as string) || 10)
  );

  const totalCount = await db.bet.count();
  const bets = await db.bet.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true } },
    },
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

  return res.status(StatusCodes.OK).json(
    new ApiResponse(StatusCodes.OK, {
      bets: formatted,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    })
  );
};

export const getAllUsers = async (
  req: Request,
  res: Response<ApiResponse<PaginatedUsersResponse>>
) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(req.query.pageSize as string) || 10)
  );

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

  return res.status(StatusCodes.OK).json(
    new ApiResponse(StatusCodes.OK, {
      users: formatted,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    })
  );
};
