export interface LimboPlaceBetRequestBody {
  betAmount: number;
  targetMultiplier: number;
}

export interface LimboState {
  targetMultiplier: number;
  roll: number;
  winChance: number; // 0–1
}

export interface LimboPlaceBetResponse {
  id: string;
  state: LimboState;
  payoutMultiplier: number;
  payout: number;
  balance: number;
}

