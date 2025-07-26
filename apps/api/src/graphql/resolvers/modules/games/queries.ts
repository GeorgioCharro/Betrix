import type { User } from '@prisma/client';
import type { MinesHiddenState } from '@repo/common/game-utils/mines/types.js';
import { minesManager } from '../../../../features/games/mines/mines.service';
import { blackjackManager } from '../../../../features/games/blackjack/blackjack.service';
import type { Context } from '../../common';

export const activeMines = async (
  _: unknown,
  __: unknown,
  { req }: Context
) => {
  if (!req.isAuthenticated()) {
    throw new Error('Unauthorized');
  }
  const userId = (req.user as User).id;
  const game = await minesManager.getGame(userId);
  if (!game?.getBet().active) return null;
  const bet = game.getBet();
  return {
    id: bet.id,
    active: bet.active,
    state: {
      mines: null,
      rounds: game.getRounds(),
      minesCount: (bet.state as unknown as MinesHiddenState).minesCount,
    },
    betAmount: bet.betAmount / 100,
  };
};

export const blackjackActive = async (
  _: unknown,
  __: unknown,
  { req }: Context
) => {
  if (!req.isAuthenticated()) {
    throw new Error('Unauthorized');
  }
  const userId = (req.user as User).id;
  const game = await blackjackManager.getGame(userId);
  if (!game?.getBet().active) return null;
  return game.getPlayRoundResponse();
};
