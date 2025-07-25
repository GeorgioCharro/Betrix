import type { User } from '@prisma/client';
import { userManager } from '../../../features/user/user.service';
import type { Context } from '../common';

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
