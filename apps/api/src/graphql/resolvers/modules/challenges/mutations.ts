import db from '@repo/db';
import { verifyApiKey } from '../../common';
import type { Context } from '../../common';

export const addChallenge = async (
  _: unknown,
  args: { code: string; name: string; description: string; prize: number },
  { req }: Context
) => {
  verifyApiKey(req);
  const { code, name, description, prize } = args;
  if (!code || !name || !description || typeof prize !== 'number') {
    throw new Error('Invalid parameters');
  }
  const record = await db.challenge.create({
    data: { code, name, description, prize },
  });
  return {
    ...record,
    challengeId: record.challengeId.toString(),
    userWon: false,
    progress: 0,
  };
};
