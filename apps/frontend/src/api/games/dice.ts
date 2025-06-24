import { gql } from '@apollo/client';
import type {
  DicePlaceBetRequestBody,
  DicePlaceBetResponse,
} from '@repo/common/game-utils/dice/types.js';
import type { ApiResponse } from '@repo/common/types';

import { graphqlClient } from '../graphql/client';

const PLACE_BET = gql`
  mutation PlaceDiceBet($target: Int!, $condition: DiceCondition!, $betAmount: Float!) {
    placeDiceBet(target: $target, condition: $condition, betAmount: $betAmount) {
      id
      state { target condition result }
      payoutMultiplier
      payout
      balance
    }
  }
`;

export const placeBet = async (
  data: DicePlaceBetRequestBody
): Promise<ApiResponse<DicePlaceBetResponse>> => {
  const { data: resp } = await graphqlClient.mutate<{ placeDiceBet: DicePlaceBetResponse }>({
    mutation: PLACE_BET,
    variables: {
      target: data.target,
      condition: data.condition,
      betAmount: data.betAmount,
    },
  });

  if (!resp?.placeDiceBet) {
    throw new Error('Failed to place Dice bet');
  }

  return {
    data: resp.placeDiceBet,
    statusCode: 200,
    message: 'Success',
    success: true,
  };
};