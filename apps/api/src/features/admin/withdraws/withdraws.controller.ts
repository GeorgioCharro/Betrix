import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import db from '@repo/db';
import {
  ApiResponse,
  type PaginatedWithdrawsResponse,
} from '@repo/common/types';
import { BadRequestError } from '../../../errors';
import { broadcastBalanceUpdate } from '../../../websocket';
import { parseDateRange } from '../utils/data-range';

export const withdrawBalance = async (req: Request, res: Response) => {
  const { userId, amount, withdrawAddress, status } = req.body as {
    userId: string;
    amount: number;
    withdrawAddress?: string;
    status?: string;
  };
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

  return res.status(StatusCodes.OK).json(
    new ApiResponse(StatusCodes.OK, {
      balance: balanceValue,
    })
  );
};

export const getAllWithdraws = async (
  req: Request,
  res: Response<ApiResponse<PaginatedWithdrawsResponse>>
) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(req.query.pageSize as string) || 10)
  );

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

  return res.status(StatusCodes.OK).json(
    new ApiResponse(StatusCodes.OK, {
      withdraws: formatted,
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

export const getWithdrawsByUser = async (
  req: Request,
  res: Response<ApiResponse<PaginatedWithdrawsResponse>>
) => {
  const { userId } = req.params;
  if (!userId) {
    throw new BadRequestError('Invalid parameters');
  }

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(req.query.pageSize as string) || 10)
  );

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

  return res.status(StatusCodes.OK).json(
    new ApiResponse(StatusCodes.OK, {
      withdraws: formatted,
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

export const getWithdrawsByTime = async (
  req: Request,
  res: Response<ApiResponse<PaginatedWithdrawsResponse>>
) => {
  const { startDate, endDate } = parseDateRange(req);

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(req.query.pageSize as string) || 10)
  );

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

  return res.status(StatusCodes.OK).json(
    new ApiResponse(StatusCodes.OK, {
      withdraws: formatted,
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
