import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import db from '@repo/db';
import {
  ApiResponse,
  type PaginatedDepositsResponse,
} from '@repo/common/types';
import { BadRequestError } from '../../../errors';
import { broadcastBalanceUpdate } from '../../../websocket';
import { parseDateRange } from '../utils/data-range';

export const depositBalance = async (req: Request, res: Response) => {
  const { userId, amount, depositAddress, status } = req.body as {
    userId: string;
    amount: number;
    depositAddress?: string;
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

  return res.status(StatusCodes.OK).json(
    new ApiResponse(StatusCodes.OK, {
      balance: balanceValue,
    })
  );
};

export const getAllDeposits = async (
  req: Request,
  res: Response<ApiResponse<PaginatedDepositsResponse>>
) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(req.query.pageSize as string) || 10)
  );

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

  return res.status(StatusCodes.OK).json(
    new ApiResponse(StatusCodes.OK, {
      deposits: formatted,
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

export const getDepositsByUser = async (
  req: Request,
  res: Response<ApiResponse<PaginatedDepositsResponse>>
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

  return res.status(StatusCodes.OK).json(
    new ApiResponse(StatusCodes.OK, {
      deposits: formatted,
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

export const getDepositsByTime = async (
  req: Request,
  res: Response<ApiResponse<PaginatedDepositsResponse>>
) => {
  const { startDate, endDate } = parseDateRange(req);

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(req.query.pageSize as string) || 10)
  );

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

  return res.status(StatusCodes.OK).json(
    new ApiResponse(StatusCodes.OK, {
      deposits: formatted,
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
