/** House edge 2% → RTP 98% */
export const HILO_RTP = 0.98;
export const HILO_HOUSE_EDGE = 1 - HILO_RTP;

/** Standard deck: 52 cards. Ranks 1–13 (Ace=1, 2–10, J=11, Q=12, K=13). */
export const HILO_RANK_MIN = 1;
export const HILO_RANK_MAX = 13;

export const HILO_SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
export type HiloSuit = (typeof HILO_SUITS)[number];

export const HILO_RANK_LABELS: Record<number, string> = {
  1: 'A',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
};
