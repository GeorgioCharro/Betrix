/** Total tiles in the deck (without-replacement selection) */
export const TOTAL_TILES = 20;

/** 98% RTP = 2% house edge. Multiplier(n) = RTP / P(reach step n) */
export const RTP = 0.98;

/** Difficulty: traps (out of 20) and safe tiles */
export type ChickenRoadDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export const DIFFICULTIES: Record<
  ChickenRoadDifficulty,
  { traps: number; safe: number }
> = {
  easy: { traps: 1, safe: 19 },
  medium: { traps: 3, safe: 17 },
  hard: { traps: 5, safe: 15 },
  expert: { traps: 10, safe: 10 },
};

/**
 * P(reach step n) = ∏_{i=0}^{n-1} (safe - i) / (total - i).
 * Multiplier(n) = RTP / P(reach n), rounded to 2 decimals.
 */
function buildMultiplierTable(
  safe: number,
  total: number
): { reachProbability: number; multiplier: number }[] {
  const table: { reachProbability: number; multiplier: number }[] = [];
  let product = 1;
  for (let n = 1; n <= safe; n++) {
    product *= (safe - (n - 1)) / (total - (n - 1));
    const multiplier = Math.round((RTP / product) * 100) / 100;
    table.push({ reachProbability: product, multiplier });
  }
  return table;
}

/** Per-difficulty: reach probability and multiplier at each step (1-based). */
export const MULTIPLIER_TABLES: Record<
  ChickenRoadDifficulty,
  { reachProbability: number; multiplier: number }[]
> = {
  easy: buildMultiplierTable(DIFFICULTIES.easy.safe, TOTAL_TILES),
  medium: buildMultiplierTable(DIFFICULTIES.medium.safe, TOTAL_TILES),
  hard: buildMultiplierTable(DIFFICULTIES.hard.safe, TOTAL_TILES),
  expert: buildMultiplierTable(DIFFICULTIES.expert.safe, TOTAL_TILES),
};

/** Default difficulty (used when not specified). */
export const DEFAULT_DIFFICULTY: ChickenRoadDifficulty = 'medium';

/** Max hops for default difficulty (for backwards compat / API that doesn't pass difficulty). */
export const MAX_HOPS = TOTAL_TILES;

/** Multiplier at start (0 hops) */
export const MULTIPLIER_START = 1;
