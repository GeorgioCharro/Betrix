import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import db from '@repo/db';
import { ApiResponse, type PaginatedUsersResponse } from '@repo/common/types';
import { parseDateRange } from '../utils/data-range';

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

export const getUsersByTime = async (
  req: Request,
  res: Response<ApiResponse<PaginatedUsersResponse>>
) => {
  const { startDate, endDate } = parseDateRange(req);

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(req.query.pageSize as string) || 10)
  );

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
