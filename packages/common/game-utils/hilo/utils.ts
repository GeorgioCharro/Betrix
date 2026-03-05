import { HILO_HOUSE_EDGE, HILO_RANK_MAX, HILO_RANK_MIN } from './constants.js';
import type { HiloCard } from './types.js';

/**
 * Compute P(higher), P(lower), P(equal) using an infinite-rank model.
 *
 * Ranks are 1..13 (A..K) and each rank is equally likely (1/13) on the next draw.
 *
 * For a current rank r:
 *   pHigher = (13 - r) / 13
 *   pLower  = (r - 1) / 13
 *   pEqual  = 1 / 13
 */
export function getHiloProbabilities(startRank: number): {
  probabilityHigher: number;
  probabilityLower: number;
  probabilityEqual: number;
} {
  const rank = Math.max(HILO_RANK_MIN, Math.min(HILO_RANK_MAX, Math.round(startRank)));
  const span = HILO_RANK_MAX - HILO_RANK_MIN + 1; // normally 13

  const cardsHigher = HILO_RANK_MAX - rank;
  const cardsLower = rank - HILO_RANK_MIN;
  const cardsEqual = 1;

  return {
    probabilityHigher: span > 0 ? cardsHigher / span : 0,
    probabilityLower: span > 0 ? cardsLower / span : 0,
    probabilityEqual: span > 0 ? cardsEqual / span : 0,
  };
}

/**
 * Payout multipliers with 2% house edge in the infinite-rank model.
 *
 * Fair multiplier for a bet with win probability p is 1 / p.
 * With a fixed house edge (HILO_HOUSE_EDGE), we apply:
 *
 *   multiplier = RTP / p = (1 - HILO_HOUSE_EDGE) / p
 *
 * where RTP = 0.98 for a 2% house edge.
 *
 * These multipliers are *total* multipliers. Profit for a single step is:
 *
 *   profit = stake * (multiplier - 1)
 *
 * In the game, each correct guess multiplies a running totalMultiplier:
 *
 *   totalMultiplier = totalMultiplier * stepMultiplier
 *
 * and final payout on cashout is:
 *
 *   payout = stake * totalMultiplier
 */
export function getHiloMultipliers(startRank: number): {
  multiplierHigher: number;
  multiplierLower: number;
  multiplierEqual: number;
} {
  const { probabilityHigher, probabilityLower, probabilityEqual } =
    getHiloProbabilities(startRank);

  const rtp = 1 - HILO_HOUSE_EDGE; // 0.98 for a 2% house edge

  return {
    // At A (rank 1), probabilityLower is 0, so multiplierLower becomes 0.
    multiplierHigher:
      probabilityHigher > 0 ? rtp / probabilityHigher : 0,
    // At K (rank 13), probabilityHigher is 0, so multiplierHigher is 0 and
    // probabilityLower drives the lower bet.
    multiplierLower:
      probabilityLower > 0 ? rtp / probabilityLower : 0,
    // Equal always has probability 1/13 in this model.
    multiplierEqual:
      probabilityEqual > 0 ? rtp / probabilityEqual : 0,
  };
}

/**
 * Convert a uniform float in (0,1) to a card index 0..51, then to HiloCard.
 * Index: 0–12 hearts, 13–25 diamonds, 26–38 clubs, 39–51 spades.
 */
export function floatToCard(float: number): HiloCard {
  const n = Math.min(51, Math.max(0, Math.floor(float * 52)));
  const rank = (n % 13) + 1;
  const suitIndex = Math.floor(n / 13);
  const suits: HiloCard['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
  return { rank, suit: suits[suitIndex]! };
}

/**
 * Given start card and a uniform float in (0,1), pick the "next" card from
 * the 51 remaining (excluding start card). Use float to pick index 0..50.
 */
export function floatToNextCard(startCard: HiloCard, float: number): HiloCard {
  const startIndex =
    (startCard.rank - 1) +
    ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(startCard.suit) * 13;
  const remaining = Array.from({ length: 52 }, (_, i) => i).filter(
    (i) => i !== startIndex
  );
  const idx = Math.min(
    remaining.length - 1,
    Math.max(0, Math.floor(float * remaining.length))
  );
  const n = remaining[idx]!;
  const rank = (n % 13) + 1;
  const suitIndex = Math.floor(n / 13);
  const suits: HiloCard['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
  return { rank, suit: suits[suitIndex]! };
}

export function compareHiloCards(start: HiloCard, next: HiloCard): 'higher' | 'lower' | 'equal' {
  if (next.rank > start.rank) return 'higher';
  if (next.rank < start.rank) return 'lower';
  return 'equal';
}
