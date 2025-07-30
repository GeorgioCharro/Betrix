import db from '@repo/db';
import type { Game } from '@prisma/client';
import { addExperience } from '../user/user.service';

export const checkChallengesAfterBet = async ({
  userId,
  game,
  payoutMultiplier,
}: {
  userId: string;
  game: Game;
  payoutMultiplier?: number;
}) => {
  const challenges = await db.challenge.findMany();

  await Promise.all(
    challenges.map(async challenge => {
      const already = await db.challengeProgress.findFirst({
        where: { userId, challengeId: challenge.id },
      });
      if (already) return;

      switch (challenge.code) {
        case 'plinkoo_x1000':
          if (game === 'plinkoo' && (payoutMultiplier ?? 0) >= 1000) {
            await db.challengeProgress.create({
              data: { userId, challengeId: challenge.id },
            });
            await addExperience({ userId, amount: challenge.prize });
          }
          break;
        case 'roulette_100_games':
          if (game === 'roulette') {
            const count = await db.bet.count({
              where: { userId, game: 'roulette' },
            });
            if (count >= 100) {
              await db.challengeProgress.create({
                data: { userId, challengeId: challenge.id },
              });
              await addExperience({ userId, amount: challenge.prize });
            }
          }
          break;
        default:
          break;
      }
    })
  );
};
