import type { User } from '@prisma/client';
import type { MinesHiddenState } from '@repo/common/game-utils/mines/types.js';
import type { ChickenRoadHiddenState } from '@repo/common/game-utils/chicken-road/types.js';
import { getMultiplierAfterHops } from '@repo/common/game-utils/chicken-road/utils.js';
import { minesManager } from '../../../../features/games/mines/mines.service';
import { chickenRoadManager } from '../../../../features/games/chicken-road/chicken-road.service';
import { blackjackManager } from '../../../../features/games/blackjack/blackjack.service';
import { getActiveHilo } from '../../../../features/games/hilo/hilo.service';
import { userManager } from '../../../../features/user/user.service';
import type { Context } from '../../common';

function buildHiloProvablyFair(
  userInstance: {
    getHashedServerSeed: () => string;
    getClientSeed: () => string;
    getNonce: () => number;
  },
  /** When provided, use this nonce (round's betNonce) so client can verify the active round. */
  roundNonce?: number
) {
  return {
    serverSeedHash: userInstance.getHashedServerSeed(),
    clientSeed: userInstance.getClientSeed(),
    nonce: roundNonce !== undefined ? roundNonce : userInstance.getNonce(),
  };
}

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

export const activeChickenRoad = async (
  _: unknown,
  __: unknown,
  { req }: Context
) => {
  if (!req.isAuthenticated()) {
    throw new Error('Unauthorized');
  }
  const userId = (req.user as User).id;
  const game = await chickenRoadManager.getGame(userId);
  if (!game?.getBet().active) return null;
  const bet = game.getBet();
  const state = bet.state as unknown as ChickenRoadHiddenState;
  if (!state?.outcomes || state.hopsCompleted == null) return null;
  const hopsCompleted = state.hopsCompleted;
  const difficulty = state.difficulty ?? 'medium';
  const currentMultiplier = getMultiplierAfterHops(hopsCompleted, difficulty);
  return {
    id: bet.id,
    active: true,
    state: { hopsCompleted },
    betAmount: bet.betAmount / 100,
    currentMultiplier,
    hopsCompleted,
    difficulty,
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

export const activeHilo = async (
  _: unknown,
  __: unknown,
  { req }: Context
) => {
  if (!req.isAuthenticated()) {
    throw new Error('Unauthorized');
  }
  const user = req.user as User;
  const userId = user.id;
  const round = await getActiveHilo(userId);
  if (!round) return null;
  const userInstance = await userManager.getUser(user.id);
  return {
    ...round,
    provablyFair: buildHiloProvablyFair(userInstance, round.roundNonce),
  };
};
