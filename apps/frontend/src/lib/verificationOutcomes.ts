import { NO_OF_TILES_KENO } from '@repo/common/game-utils/keno/constants.js';
import { calculateSelectedGems } from '@repo/common/game-utils/keno/utils.js';
import { NO_OF_TILES } from '@repo/common/game-utils/mines/constants.js';
import {
  convertFloatsToGameEvents,
  calculateMines,
} from '@repo/common/game-utils/mines/utils.js';

import { Games } from '@/const/games';
import type { Game } from '@/const/games';
import { clampTargetMultiplier, resolveLimboBet } from '@repo/common/game-utils/limbo/utils.js';

import { getGeneratedFloats } from './crypto';

interface MinesGameMeta {
  minesCount: number;
}

interface LimboGameMeta {
  targetMultiplier: number;
}

export type GameMeta = MinesGameMeta | LimboGameMeta | undefined;

const diceVerificationOutcomes = async ({
  clientSeed,
  serverSeed,
  nonce,
}: {
  clientSeed: string;
  serverSeed: string;
  nonce: string;
}): Promise<string> => {
  const [float] = await getGeneratedFloats({
    count: 1,
    seed: serverSeed,
    message: `${clientSeed}:${nonce}`,
  });
  const result = (float * 10001) / 100;
  return result.toFixed(2);
};

const minesVerificationOutcomes = async ({
  clientSeed,
  serverSeed,
  nonce,
  meta,
}: {
  clientSeed: string;
  serverSeed: string;
  nonce: string;
  meta?: MinesGameMeta;
}): Promise<number[]> => {
  const minesCount = meta?.minesCount ?? 3;
  const floats = await getGeneratedFloats({
    count: NO_OF_TILES - 1,
    seed: serverSeed,
    message: `${clientSeed}:${nonce}`,
  });
  const gameEvents = convertFloatsToGameEvents(floats, NO_OF_TILES);
  const mines = calculateMines(gameEvents, minesCount);
  return mines;
};

const rouletteVerificationOutcomes = async ({
  clientSeed,
  serverSeed,
  nonce,
}: {
  clientSeed: string;
  serverSeed: string;
  nonce: string;
}): Promise<string> => {
  const [float] = await getGeneratedFloats({
    count: 1,
    seed: serverSeed,
    message: `${clientSeed}:${nonce}`,
  });
  const result = Math.floor(float * 37);
  return result.toString();
};

const kenoVerificationOutcomes = async ({
  clientSeed,
  serverSeed,
  nonce,
}: {
  clientSeed: string;
  serverSeed: string;
  nonce: string;
}): Promise<number[]> => {
  const floats = await getGeneratedFloats({
    count: 10,
    seed: serverSeed,
    message: `${clientSeed}:${nonce}`,
  });
  const gameEvents = convertFloatsToGameEvents(floats, NO_OF_TILES_KENO);
  const drawnNumbers = calculateSelectedGems(gameEvents, 10).map(
    num => num + 1
  );
  return drawnNumbers;
};

const limboVerificationOutcomes = async ({
  clientSeed,
  serverSeed,
  nonce,
  meta,
}: {
  clientSeed: string;
  serverSeed: string;
  nonce: string;
  meta?: LimboGameMeta;
}): Promise<string> => {
  const [rawFloat] = await getGeneratedFloats({
    count: 1,
    seed: serverSeed,
    message: `${clientSeed}:${nonce}`,
  });
  const target = clampTargetMultiplier(meta?.targetMultiplier ?? 2);
  const { winChance, payoutMultiplier } = resolveLimboBet({
    targetMultiplier: target,
    roll: rawFloat,
  });

  return `roll=${rawFloat.toFixed(8)}, target=${target.toFixed(
    2
  )}x, winChance=${(winChance * 100).toFixed(8)}%, payoutOnHit=${payoutMultiplier.toFixed(4)}x`;
};

export const getVerificationOutcome = async ({
  game,
  clientSeed,
  serverSeed,
  nonce,
  meta,
}: {
  game: Game;
  clientSeed: string;
  serverSeed: string;
  nonce: string;
  meta?: GameMeta;
}): Promise<string | number[]> => {
  switch (game) {
    case Games.DICE:
      return diceVerificationOutcomes({ clientSeed, serverSeed, nonce });
    case Games.ROULETTE:
      return rouletteVerificationOutcomes({ clientSeed, serverSeed, nonce });
    case Games.MINES:
      return minesVerificationOutcomes({ clientSeed, serverSeed, nonce, meta });
    case Games.KENO:
      return kenoVerificationOutcomes({ clientSeed, serverSeed, nonce });
    case Games.LIMBO:
      return limboVerificationOutcomes({
        clientSeed,
        serverSeed,
        nonce,
        meta: meta as LimboGameMeta | undefined,
      });
    default:
      return '';
  }
};
