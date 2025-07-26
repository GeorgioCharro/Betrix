import db from '@repo/db';
import { broadcastBalanceUpdate } from '../../../../websocket';
import { userManager } from '../../../../features/user/user.service';
import { verifyApiKey } from '../../common';
import { BadRequestError } from '../../../../errors';
import type { Context } from '../../common';

export const depositBalance = async (
  _: unknown,
  args: {
    userId: string;
    amount: number;
    depositAddress?: string;
    status?: string;
  },
  { req }: Context
) => {
  verifyApiKey(req);
  const { userId, amount, depositAddress, status } = args;
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
  const instance = await userManager.getUser(userId);
  instance.setBalance(updated.balance);
  broadcastBalanceUpdate(userId, balanceValue);

  return { balance: balanceValue };
};
