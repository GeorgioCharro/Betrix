import { gql } from '@apollo/client';
import type { HiloCard } from '@repo/common/game-utils/hilo/types.js';
import type { ApiResponse } from '@repo/common/types';

import { graphqlClient } from '../graphql/client';

export interface HiloProvablyFair {
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

const GET_HILO_START_CARD = gql`
  mutation GetHiloStartCard {
    getHiloStartCard {
      card {
        rank
        suit
      }
      provablyFair {
        serverSeedHash
        clientSeed
        nonce
      }
    }
  }
`;

const ACTIVE_HILO = gql`
  query ActiveHilo {
    activeHilo {
      id
      currentCard { rank suit }
      betAmount
      totalMultiplier
      accumulatedProfit
      multiplierHigher
      multiplierLower
      provablyFair {
        serverSeedHash
        clientSeed
        nonce
      }
    }
  }
`;

const START_HILO_ROUND = gql`
  mutation StartHiloRound($betAmount: Float!) {
    startHiloRound(betAmount: $betAmount) {
      id
      currentCard { rank suit }
      betAmount
      totalMultiplier
      accumulatedProfit
      multiplierHigher
      multiplierLower
      balance
      provablyFair {
        serverSeedHash
        clientSeed
        nonce
      }
    }
  }
`;

const ADVANCE_HILO = gql`
  mutation AdvanceHilo($betAmount: Float!, $choice: String!) {
    advanceHilo(betAmount: $betAmount, choice: $choice) {
      id
      active
      currentCard { rank suit }
      betAmount
      totalMultiplier
      accumulatedProfit
      nextCard { rank suit }
      outcome
      stepProfit
      balance
      lost
      provablyFair {
        serverSeedHash
        clientSeed
        nonce
      }
    }
  }
`;

const CASH_OUT_HILO = gql`
  mutation CashOutHilo {
    cashOutHilo {
      id
      payout
      balance
      provablyFair {
        serverSeedHash
        clientSeed
        nonce
      }
    }
  }
`;

export interface HiloStartCardResult {
  card: HiloCard;
  provablyFair?: HiloProvablyFair;
}

export interface HiloActiveRoundResult {
  id: string;
  currentCard: HiloCard;
  betAmount: number;
  totalMultiplier: number;
  accumulatedProfit: number;
  multiplierHigher: number;
  multiplierLower: number;
  balance?: number;
  provablyFair?: HiloProvablyFair;
}

export interface HiloAdvanceResult {
  id: string;
  active: boolean;
  currentCard: HiloCard;
  betAmount: number;
  totalMultiplier: number;
  accumulatedProfit: number;
  nextCard: HiloCard;
  outcome: string;
  stepProfit: number;
  balance: number;
  lost?: boolean;
  provablyFair?: HiloProvablyFair;
}

export interface HiloCashOutResult {
  id: string;
  payout: number;
  balance: number;
  provablyFair?: HiloProvablyFair;
}

export async function getHiloStartCard(): Promise<
  ApiResponse<HiloStartCardResult>
> {
  const { data } = await graphqlClient.mutate<{
    getHiloStartCard: HiloStartCardResult;
  }>({
    mutation: GET_HILO_START_CARD,
  });
  if (!data?.getHiloStartCard) {
    throw new Error('Failed to get Hilo start card');
  }
  return {
    data: data.getHiloStartCard,
    statusCode: 200,
    message: 'Success',
    success: true,
  };
}

export async function getActiveHilo(): Promise<
  ApiResponse<HiloActiveRoundResult | null>
> {
  const { data } = await graphqlClient.query<{
    activeHilo: HiloActiveRoundResult | null;
  }>({
    query: ACTIVE_HILO,
    fetchPolicy: 'no-cache',
  });
  return {
    data: data?.activeHilo ?? null,
    statusCode: 200,
    message: 'Success',
    success: true,
  };
}

export async function startHiloRound(
  betAmount: number
): Promise<ApiResponse<HiloActiveRoundResult>> {
  const { data } = await graphqlClient.mutate<{
    startHiloRound: HiloActiveRoundResult;
  }>({
    mutation: START_HILO_ROUND,
    variables: { betAmount },
  });
  if (!data?.startHiloRound) {
    throw new Error('Failed to start Hilo round');
  }
  return {
    data: data.startHiloRound,
    statusCode: 200,
    message: 'Success',
    success: true,
  };
}

export async function advanceHilo(
  betAmount: number,
  choice: 'higher' | 'lower' | 'equal'
): Promise<ApiResponse<HiloAdvanceResult>> {
  const { data } = await graphqlClient.mutate<{
    advanceHilo: HiloAdvanceResult;
  }>({
    mutation: ADVANCE_HILO,
    variables: { betAmount, choice },
  });
  if (!data?.advanceHilo) {
    throw new Error('Failed to advance Hilo');
  }
  return {
    data: data.advanceHilo,
    statusCode: 200,
    message: 'Success',
    success: true,
  };
}

export async function cashOutHilo(): Promise<
  ApiResponse<HiloCashOutResult>
> {
  const { data } = await graphqlClient.mutate<{
    cashOutHilo: HiloCashOutResult;
  }>({
    mutation: CASH_OUT_HILO,
  });
  if (!data?.cashOutHilo) {
    throw new Error('Failed to cash out Hilo');
  }
  return {
    data: data.cashOutHilo,
    statusCode: 200,
    message: 'Success',
    success: true,
  };
}
