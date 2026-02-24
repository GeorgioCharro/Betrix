import { gql } from '@apollo/client';
import type {
  ChickenRoadGameOverResponse,
  ChickenRoadPlayRoundResponse,
} from '@repo/common/game-utils/chicken-road/types.js';
import type { ApiResponse } from '@repo/common/types';

import { graphqlClient } from '../graphql/client';

const START_GAME = gql`
  mutation StartChickenRoad($betAmount: Float!, $difficulty: ChickenRoadDifficulty) {
    startChickenRoad(betAmount: $betAmount, difficulty: $difficulty) {
      id
      active
      state {
        hopsCompleted
      }
      betAmount
      currentMultiplier
      hopsCompleted
      difficulty
    }
  }
`;

const CROSS = gql`
  mutation CrossChickenRoad {
    crossChickenRoad {
      ... on ChickenRoadPlayRoundResponse {
        id
        active
        state {
          hopsCompleted
        }
        betAmount
        currentMultiplier
        hopsCompleted
        difficulty
      }
      ... on ChickenRoadGameOverResponse {
        id
        active
        state {
          outcomes
          hopsCompleted
        }
        payoutMultiplier
        payout
        balance
        crashedAtHop
      }
    }
  }
`;

const CASH_OUT = gql`
  mutation CashOutChickenRoad {
    cashOutChickenRoad {
      id
      state {
        outcomes
        hopsCompleted
      }
      payoutMultiplier
      payout
      balance
      active
    }
  }
`;

const ACTIVE_GAME = gql`
  query ActiveChickenRoad {
    activeChickenRoad {
      id
      active
      state {
        hopsCompleted
      }
      betAmount
      currentMultiplier
      hopsCompleted
      difficulty
    }
  }
`;

export type ChickenRoadRoundResult =
  | ChickenRoadPlayRoundResponse
  | ChickenRoadGameOverResponse;

export type ChickenRoadDifficultyOption = 'easy' | 'medium' | 'hard' | 'expert';

export const startChickenRoad = async (
  betAmount: number,
  difficulty?: ChickenRoadDifficultyOption
): Promise<ApiResponse<ChickenRoadPlayRoundResponse>> => {
  const { data } = await graphqlClient.mutate<{
    startChickenRoad: ChickenRoadPlayRoundResponse;
  }>({
    mutation: START_GAME,
    variables: { betAmount, difficulty: difficulty ?? 'medium' },
  });
  if (!data?.startChickenRoad) {
    throw new Error('Failed to start game');
  }
  return {
    data: data.startChickenRoad,
    statusCode: 200,
    message: 'Success',
    success: true,
  };
};

export const crossChickenRoad = async (): Promise<
  ApiResponse<ChickenRoadRoundResult>
> => {
  const { data } = await graphqlClient.mutate<{
    crossChickenRoad: ChickenRoadRoundResult;
  }>({
    mutation: CROSS,
  });
  if (!data?.crossChickenRoad) {
    throw new Error('Failed to cross');
  }
  return {
    data: data.crossChickenRoad,
    statusCode: 200,
    message: 'Success',
    success: true,
  };
};

export const cashOutChickenRoad = async (): Promise<
  ApiResponse<ChickenRoadGameOverResponse>
> => {
  const { data } = await graphqlClient.mutate<{
    cashOutChickenRoad: ChickenRoadGameOverResponse;
  }>({
    mutation: CASH_OUT,
  });
  if (!data?.cashOutChickenRoad) {
    throw new Error('Failed to cash out');
  }
  return {
    data: data.cashOutChickenRoad,
    statusCode: 200,
    message: 'Success',
    success: true,
  };
};

export const getActiveChickenRoad = async (): Promise<
  ApiResponse<ChickenRoadPlayRoundResponse | undefined>
> => {
  const { data } = await graphqlClient.query<{
    activeChickenRoad: ChickenRoadPlayRoundResponse | undefined;
  }>({
    query: ACTIVE_GAME,
    fetchPolicy: 'no-cache',
  });
  return {
    data: data.activeChickenRoad,
    statusCode: 200,
    message: 'Success',
    success: true,
  };
};
