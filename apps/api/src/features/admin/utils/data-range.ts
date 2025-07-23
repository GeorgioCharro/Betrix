import type { Request } from 'express';
import { BadRequestError } from '../../../errors';

export const parseDateRange = (req: Request) => {
  const { start, end } = req.query as { start?: string; end?: string };
  if (!start || !end) {
    throw new BadRequestError('Invalid parameters');
  }
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new BadRequestError('Invalid parameters');
  }
  return { startDate, endDate };
};
