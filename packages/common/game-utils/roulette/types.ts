import type { RouletteBetTypes } from './validations';

export interface RouletteFormattedBet {
  betType: RouletteBetTypes;
  selection: number[] | null;
  amount: number;
}

export interface RouletterPlaceBetState {
  bets: RouletteFormattedBet[];
  winningNumber: string;
}

export interface RoulettePlaceBetResponse {
  id: string;
  state: RouletterPlaceBetState;
  payoutMultiplier: number;
  payout: number;
  balance: number;
}