export interface User {
  createdAt: string;
  email: string;
  googleId: string | null;
  id: string;
  name: string;
  picture: string | null;
  updatedAt: string;
}

export interface ProvablyFairStateResponse {
  clientSeed: string;
  hashedServerSeed: string;
  hashedNextServerSeed: string;
  nonce: number;
}

export interface PaginatedBetData {
  userId: string;
  betId: string;
  game: string;
  createdAt: Date;
  updatedAt: Date;
  betAmount: number;
  payoutMultiplier: number;
  payout: number;
  id: string;
  betNonce: number;
  provablyFairStateId: string;
  state: string;
}

export interface PaginatedBetsResponse {
  bets: PaginatedBetData[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface PaginatedUsersResponse {
  users: {
    id: string;
    email: string;
    name: string | null;
    balance: number;
    createdAt: Date;
    updatedAt: Date;
  }[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface PaginatedWithdrawData {
  userId: string;
  withdrawId: string;
  amount: number;
  status: string;
  withdrawAddress: string;
  createdAt: Date;
  updatedAt: Date;
  id: string;
}

export interface PaginatedWithdrawsResponse {
  withdraws: PaginatedWithdrawData[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
