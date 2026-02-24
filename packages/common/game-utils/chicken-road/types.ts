/** Outcome of a single hop: true = survived, false = crashed */
export type HopOutcome = boolean;

import type { ChickenRoadDifficulty } from './constants.js';

export type { ChickenRoadDifficulty };

/** State stored in DB: sequence of outcomes and how far the player has gotten */
export interface ChickenRoadHiddenState {
  /** outcomes[i] = true if tile i is safe (survive). Without-replacement deck of 20. */
  outcomes: HopOutcome[];
  /** Number of hops successfully completed (0 at start). */
  hopsCompleted: number;
  /** Difficulty used for this round (determines multiplier table). */
  difficulty?: ChickenRoadDifficulty;
}

/** Same shape when revealed (after game over) */
export interface ChickenRoadRevealedState extends ChickenRoadHiddenState {}

export interface ChickenRoadPlayRoundResponse {
  id: string;
  state: ChickenRoadHiddenState;
  active: boolean;
  betAmount: number;
  /** Current multiplier after last successful hop (1.0 at start) */
  currentMultiplier: number;
  /** Number of successful hops so far */
  hopsCompleted: number;
  /** Difficulty for this round (easy / medium / hard / expert) */
  difficulty?: ChickenRoadDifficulty;
}

export interface ChickenRoadGameOverResponse {
  id: string;
  state: ChickenRoadRevealedState;
  payoutMultiplier: number;
  payout: number;
  balance: number;
  active: boolean;
  /** Crashed on this hop index (0-based) */
  crashedAtHop?: number;
}
