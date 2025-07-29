import type { User } from '@prisma/client';
import {
  userManager,
  addExperience,
} from '../../../../features/user/user.service';
import type { Context } from '../../common';

export const rotateSeed = async (
  _: unknown,
  args: { clientSeed: string },
  { req }: Context
) => {
  if (!req.isAuthenticated()) {
    throw new Error('Unauthorized');
  }
  const userInstance = await userManager.getUser((req.user as User).id);
  const seed = await userInstance.rotateSeed(args.clientSeed);
  return seed;
};

export const addXp = async (
  _: unknown,
  args: { amount: number; userId?: string },
  { req }: Context
) => {
  const id = args.userId || (req.user as User | undefined)?.id;
  if (!id) {
    throw new Error('Unauthorized');
  }

  const user = await addExperience({ userId: id, amount: args.amount });

  return user;
};