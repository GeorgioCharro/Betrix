import db from '@repo/db';
import type { Context } from '../../common';

export const challenges = async (_: unknown, __: unknown, { req }: Context) => {
  if (!req.isAuthenticated()) {
    throw new Error('Unauthorized');
  }
  const userId = (req.user as { id: string }).id;
  const records = await db.challenge.findMany({
    orderBy: { challengeId: 'asc' },
  });
  const progressRecords = await db.challengeProgress.findMany({
    where: { userId },
    select: { challengeId: true },
  });
  const completedIds = new Set(progressRecords.map(p => p.challengeId));

  const rouletteCount = await db.bet.count({
    where: { userId, game: 'roulette' },
  });

  return records.map(c => {
    let progress = completedIds.has(c.id) ? 1 : 0;
    if (!completedIds.has(c.id)) {
      switch (c.code) {
        case 'roulette_100_games':
          progress = Math.min(rouletteCount / 100, 1);
          break;
        default:
          break;
      }
    }
    return {
      ...c,
      challengeId: c.challengeId.toString(),
      userWon: completedIds.has(c.id),
      code: c.code,
      progress,
    };
  });
};
