import type { HiloSuit } from './constants.js';

export interface HiloCard {
  rank: number; // 1–13 (Ace low, King high)
  suit: HiloSuit;
}

/** Result of getHiloStartCard (skip card) */
export interface HiloStartCardResponse {
  card: HiloCard;
}

/** Outcome: next card was higher, lower, or equal to current card */
export type HiloOutcome = 'higher' | 'lower' | 'equal';

/** User choice for next card */
export type HiloChoice = 'higher' | 'lower' | 'equal';

/** Active round state (multi-step: bet from current card, then next card becomes current until cash out or lose) */
export interface HiloRoundState {
  currentCard: HiloCard;
  /** Bet amount in currency units (set on first advance) */
  betAmount: number;
  /** Accumulated profit in currency units (sum of step profits) */
  accumulatedProfit: number;
}

/** State stored in bet for provably fair verification (single-step legacy or final state) */
export interface HiloBetState {
  startCard: HiloCard;
  nextCard: HiloCard;
  outcome: HiloOutcome;
  probabilityHigher: number;
  probabilityLower: number;
  multiplierHigher: number;
  multiplierLower: number;
}

/** Response for active Hilo round (query) */
export interface HiloActiveRoundResponse {
  id: string;
  currentCard: HiloCard;
  betAmount: number;
  accumulatedProfit: number;
  multiplierHigher: number;
  multiplierLower: number;
  balance: number;
}

/** Response after advancing (bet higher/lower); game may still be active or lost */
export interface HiloAdvanceResponse {
  id: string;
  active: boolean;
  currentCard: HiloCard;
  betAmount: number;
  accumulatedProfit: number;
  /** Last drawn card */
  nextCard: HiloCard;
  outcome: HiloOutcome;
  /** Step profit from this advance (0 on equal, positive on win, round over on lose) */
  stepProfit: number;
  balance: number;
  /** If round ended in loss */
  lost?: boolean;
}

/** Response after cashing out */
export interface HiloCashOutResponse {
  id: string;
  payout: number;
  balance: number;
}
