import {
  TOTAL_TILES,
  MULTIPLIER_START,
  RTP,
  MULTIPLIER_TABLES,
  DIFFICULTIES,
  DEFAULT_DIFFICULTY,
} from './constants.js';
import type { ChickenRoadDifficulty } from './constants.js';
import type { HopOutcome } from './types.js';

/**
 * Multiplier at step n (1-based) for the given difficulty.
 * Formula: Multiplier = 0.98 / P(reach step n), rounded to 2 decimals.
 */
export function getMultiplierAtStep(
  step: number,
  difficulty: ChickenRoadDifficulty = DEFAULT_DIFFICULTY
): number {
  if (step <= 0) return MULTIPLIER_START;
  const table = MULTIPLIER_TABLES[difficulty];
  if (step > table.length) return table[table.length - 1]?.multiplier ?? MULTIPLIER_START;
  return table[step - 1].multiplier;
}

/**
 * P(reach step n) for the given difficulty (without-replacement product).
 */
export function getReachProbability(
  step: number,
  difficulty: ChickenRoadDifficulty = DEFAULT_DIFFICULTY
): number {
  if (step <= 0) return 1;
  const table = MULTIPLIER_TABLES[difficulty];
  if (step > table.length) return 0;
  return table[step - 1].reachProbability;
}

/**
 * Multiplier after n successful hops (0-based).
 */
export function getMultiplierAfterHops(
  hops: number,
  difficulty: ChickenRoadDifficulty = DEFAULT_DIFFICULTY
): number {
  if (hops <= 0) return MULTIPLIER_START;
  return getMultiplierAtStep(hops, difficulty);
}

/**
 * Shuffle array in place using Fisher-Yates with provably fair floats in [0,1).
 * Uses floats[0..n-2] for n elements (n-1 swaps).
 */
function shuffleWithFloats<T>(arr: T[], floats: number[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const floatIndex = arr.length - 1 - i;
    const f = floats[floatIndex] ?? 0;
    const j = Math.floor(f * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Generate 20 tile outcomes (without replacement): deck of safe/trap tiles shuffled.
 * true = safe, false = trap. Uses floats for Fisher-Yates shuffle (needs 19 floats).
 */
export function generateOutcomesFromFloats(
  floats: number[],
  difficulty: ChickenRoadDifficulty = DEFAULT_DIFFICULTY
): HopOutcome[] {
  const { safe, traps } = DIFFICULTIES[difficulty];
  const deck: boolean[] = [
    ...Array.from({ length: safe }, () => true),
    ...Array.from({ length: traps }, () => false),
  ];
  shuffleWithFloats(deck, floats);
  return deck;
}
