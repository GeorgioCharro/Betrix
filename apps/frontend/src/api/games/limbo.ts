import { gql } from '@apollo/client';
import type {
  LimboPlaceBetRequestBody,
  LimboPlaceBetResponse,
} from '@repo/common/game-utils/limbo/types.js';
import type { ApiResponse } from '@repo/common/types';

import { graphqlClient } from '../graphql/client';

const PLACE_LIMBO_BET = gql`
  mutation PlaceLimboBet($betAmount: Float!, $targetMultiplier: Float!) {
    placeLimboBet(betAmount: $betAmount, targetMultiplier: $targetMultiplier) {
      id
      state {
        targetMultiplier
        roll
        winChance
      }
      payoutMultiplier
      payout
      balance
    }
  }
`;

export const placeLimboBet = async (
  data: LimboPlaceBetRequestBody
): Promise<ApiResponse<LimboPlaceBetResponse>> => {
  const { data: resp } = await graphqlClient.mutate<{
    placeLimboBet: LimboPlaceBetResponse;
  }>({
    mutation: PLACE_LIMBO_BET,
    variables: {
      betAmount: data.betAmount,
      targetMultiplier: data.targetMultiplier,
    },
  });

  if (!resp?.placeLimboBet) {
    throw new Error('Failed to place Limbo bet');
  }

  return {
    data: resp.placeLimboBet,
    statusCode: 200,
    message: 'Success',
    success: true,
  };
};

