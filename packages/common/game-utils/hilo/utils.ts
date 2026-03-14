import { HILO_RANK_MAX, HILO_RANK_MIN, HILO_RTP } from './constants.js';
import { HILO_SUITS } from './constants.js';
import type { HiloCard } from './types.js';

/**
 * Create a standard 52-card deck in deterministic order:
 * hearts 1..13, diamonds 1..13, clubs 1..13, spades 1..13.
 */
export function createOrderedDeck(): HiloCard[] {
  const deck: HiloCard[] = [];
  for (const suit of HILO_SUITS) {
    for (let rank = HILO_RANK_MIN; rank <= HILO_RANK_MAX; rank++) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

/**
 * Fisher–Yates shuffle using provably fair floats.
 * getFloat(index) should return a number in [0, 1) for each index 0..(deck.length-2).
 */
export function shuffleDeck(
  deck: HiloCard[],
  getFloat: (index: number) => number
): HiloCard[] {
  const shuffled = [...deck];
  let randomIndex = 0;
  for (let i = shuffled.length - 1; i > 0; i--) {
    const rand = getFloat(randomIndex++);
    const j = Math.floor(rand * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

/**
 * Build a deck with a fixed first card and the remaining 51 cards shuffled.
 * Used when starting the next round from a known card (e.g. after loss or cashout).
 */
export function createDeckWithFirstCard(
  firstCard: HiloCard,
  getFloat: (index: number) => number
): HiloCard[] {
  const full = createOrderedDeck();
  const rest = full.filter(
    (c) => !(c.rank === firstCard.rank && c.suit === firstCard.suit)
  );
  if (rest.length !== 51) {
    throw new Error('createDeckWithFirstCard: firstCard not in deck');
  }
  const shuffledRest = shuffleDeck(rest, getFloat);
  return [firstCard, ...shuffledRest];
}

/** Number of cards remaining after the start card is removed (52 - 1 = 51). */
const CARDS_REMAINING = 51;

/** Cards of the same rank but different suit (4 suits - 1 = 3). */
const EQUAL_CARDS_COUNT = 3;

/** Cards per rank in a standard deck. */
const CARDS_PER_RANK = 4;

/**
 * Compute P(higher), P(lower), P(equal) using real deck probabilities.
 *
 * Backend draws from a 52-card deck without replacement via floatToNextCard(startCard, float),
 * so the next card is one of 51 remaining cards.
 *
 * Distribution:
 * - equal: 3 cards (same rank, other suits)
 * - higher: 4 cards per rank above startRank
 * - lower: 4 cards per rank below startRank
 *
 * Ensures RTP can be exactly 98% for all start cards when multipliers use RTP / probability.
 */
export function getHiloProbabilities(startRank: number): {
  probabilityHigher: number;
  probabilityLower: number;
  probabilityEqual: number;
} {
  const rank = Math.max(HILO_RANK_MIN, Math.min(HILO_RANK_MAX, Math.round(startRank)));

  const higherCards = (HILO_RANK_MAX - rank) * CARDS_PER_RANK;
  const lowerCards = (rank - HILO_RANK_MIN) * CARDS_PER_RANK;

  return {
    probabilityHigher: higherCards / CARDS_REMAINING,
    probabilityLower: lowerCards / CARDS_REMAINING,
    probabilityEqual: EQUAL_CARDS_COUNT / CARDS_REMAINING,
  };
}

/**
 * Payout multipliers with 2% house edge (RTP 98%).
 *
 * Formula: multiplier = RTP / probability
 * - When probability = 0 (e.g. lower at Ace, higher at King), multiplier = 0.
 *
 * These are step multipliers. Each correct guess multiplies totalMultiplier:
 *   totalMultiplier = totalMultiplier * stepMultiplier
 * Payout on cashout: stake * totalMultiplier.
 *
 * RTP verification: for every start rank 1..13, EV_higher = p_higher * mult_higher = RTP,
 * and similarly for lower and equal (when p > 0).
 */
export function getHiloMultipliers(startRank: number): {
  multiplierHigher: number;
  multiplierLower: number;
  multiplierEqual: number;
} {
  const { probabilityHigher, probabilityLower, probabilityEqual } =
    getHiloProbabilities(startRank);

  const rtp = HILO_RTP; // 0.98

  return {
    multiplierHigher: probabilityHigher > 0 ? rtp / probabilityHigher : 0,
    multiplierLower: probabilityLower > 0 ? rtp / probabilityLower : 0,
    multiplierEqual: probabilityEqual > 0 ? rtp / probabilityEqual : 0,
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

/**
 * Verify that for every start rank 1..13, EV = probability × multiplier equals RTP (0.98)
 * for higher, lower, and equal (where probability > 0). Used for tests and audits.
 */
export function verifyHiloRtp(rtp: number = HILO_RTP): boolean {
  for (let rank = HILO_RANK_MIN; rank <= HILO_RANK_MAX; rank++) {
    const p = getHiloProbabilities(rank);
    const m = getHiloMultipliers(rank);
    if (p.probabilityHigher > 0 && Math.abs(p.probabilityHigher * m.multiplierHigher - rtp) > 1e-9)
      return false;
    if (p.probabilityLower > 0 && Math.abs(p.probabilityLower * m.multiplierLower - rtp) > 1e-9)
      return false;
    if (p.probabilityEqual > 0 && Math.abs(p.probabilityEqual * m.multiplierEqual - rtp) > 1e-9)
      return false;
  }
  return true;
}
