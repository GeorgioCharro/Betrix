import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import db from '@repo/db';
import { ApiResponse } from '@repo/common/types';
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

export const getAllBets = async (_req: Request, res: Response) => {
  const bets = await db.bet.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  const formatted = bets.map(bet => ({
    betId: bet.betId.toString().padStart(12, '0'),
    game: bet.game,
    date: bet.createdAt,
    betAmount: bet.betAmount / 100,
    payoutMultiplier: bet.payoutAmount / bet.betAmount,
    payout: bet.payoutAmount / 100,
    id: bet.id,
  }));

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, formatted));
};

export const getAllUsers = async (_req: Request, res: Response) => {
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
  });

  const formatted = users.map(u => ({
    ...u,
    balance: parseInt(u.balance, 10) / 100,
  }));

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, formatted));
};
