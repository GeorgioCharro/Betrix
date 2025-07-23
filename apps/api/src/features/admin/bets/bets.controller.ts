import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import db from '@repo/db';
import { ApiResponse, type PaginatedBetsResponse } from '@repo/common/types';
import { BadRequestError } from '../../../errors';
import { parseDateRange } from '../utils/data-range';

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

export const getBetsByUser = async (
  req: Request,
  res: Response<ApiResponse<PaginatedBetsResponse>>
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

export const getBetsByTime = async (
  req: Request,
  res: Response<ApiResponse<PaginatedBetsResponse>>
) => {
  const { startDate, endDate } = parseDateRange(req);

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(req.query.pageSize as string) || 10)
  );

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
