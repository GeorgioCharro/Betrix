import { gql } from '@apollo/client';
import type {
  BlackjackActions,
  BlackjackPlayRoundResponse,
} from '@repo/common/game-utils/blackjack/types.js';
import type { ApiResponse } from '@repo/common/types';

import { graphqlClient } from '../graphql/client';

const BLACKJACK_BET = gql`
  mutation BlackjackBet($betAmount: Float!) {
    blackjackBet(betAmount: $betAmount) {
      id
      state { player { actions value cards { suit rank } } dealer { actions value cards { suit rank } } }
      active
      betAmount
      amountMultiplier
      payout
      payoutMultiplier
      balance
    }
  }
`;

const BLACKJACK_NEXT = gql`
  mutation BlackjackNext($action: String!) {
    blackjackNext(action: $action) {
      id
      state { player { actions value cards { suit rank } } dealer { actions value cards { suit rank } } }
      active
      betAmount
      amountMultiplier
      payout
      payoutMultiplier
      balance
    }
  }
`;

const BLACKJACK_ACTIVE = gql`
  query BlackjackActive {
    blackjackActive {
      id
      state { player { actions value cards { suit rank } } dealer { actions value cards { suit rank } } }
      active
      betAmount
      amountMultiplier
      payout
      payoutMultiplier
      balance
    }
  }
`;

export const blackjackBet = async ({ betAmount }: { betAmount: number }): Promise<ApiResponse<BlackjackPlayRoundResponse>> => {
  const { data } = await graphqlClient.mutate<{ blackjackBet: BlackjackPlayRoundResponse }>({
    mutation: BLACKJACK_BET,
    variables: { betAmount },
  });
  if (!data?.blackjackBet) {
    throw new Error('Failed to place Blackjack bet');
  }
  return { data: data.blackjackBet, statusCode: 200, message: 'Success', success: true };
};

export const getActiveGame = async (): Promise<ApiResponse<BlackjackPlayRoundResponse | undefined>> => {
  const { data } = await graphqlClient.query<{ blackjackActive: BlackjackPlayRoundResponse | undefined }>({
    query: BLACKJACK_ACTIVE,
    fetchPolicy: 'no-cache',
  });
  return { data: data.blackjackActive, statusCode: 200, message: 'Success', success: true };
};

export const playRound = async (
  action: BlackjackActions
): Promise<ApiResponse<BlackjackPlayRoundResponse>> => {
  const { data } = await graphqlClient.mutate<{ blackjackNext: BlackjackPlayRoundResponse }>({
    mutation: BLACKJACK_NEXT,
    variables: { action },
  });
  if (!data) {
    throw new Error('Failed to play round');
  }
  return { data: data.blackjackNext, statusCode: 200, message: 'Success', success: true };
};