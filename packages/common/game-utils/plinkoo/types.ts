export interface PlinkooResult {
  point: number;
  multiplier: number;
  pattern: ('L' | 'R')[];
}

export interface PlinkooBetResponse {
  id: string;
  state: PlinkooResult;
  payoutMultiplier: number;
  payout: number;
  balance: number;
}
