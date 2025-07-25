import db from '@repo/db';
import { broadcastBalanceUpdate } from '../../../websocket';
import { verifyApiKey } from '../common';
import { BadRequestError } from '../../../errors';
import type { Context } from '../common';

export const withdrawBalance = async (
  _: unknown,
  args: {
    userId: string;
    amount: number;
    withdrawAddress?: string;
    status?: string;
  },
  { req }: Context
) => {
  verifyApiKey(req);
  const { userId, amount, withdrawAddress, status } = args;
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

  return { balance: balanceValue };
};
