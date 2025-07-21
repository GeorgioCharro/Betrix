import type { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';

export const requireApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const apiKey = req.header('x-api-key');
  if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid API key' });
    return;
  }
  next();
};
