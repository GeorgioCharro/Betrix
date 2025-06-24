import { gql } from '@apollo/client';
import type {
  RouletteBet,
  RoulettePlaceBetResponse,
} from '@repo/common/game-utils/roulette/index.js';
import type { ApiResponse } from '@repo/common/types';

import { graphqlClient } from '../graphql/client';

const PLACE_ROULETTE = gql`
  mutation PlaceRouletteBet($bets: [RouletteBetInput!]!) {
    placeRouletteBet(bets: $bets) {
      id
      state { bets { betType selection amount } winningNumber }
      payoutMultiplier
      payout
      balance
    }
  }
`;

export const placeBet = async (
  bets: RouletteBet[]
): Promise<ApiResponse<RoulettePlaceBetResponse>> => {
  const response = await graphqlClient.mutate<{
    placeRouletteBet: RoulettePlaceBetResponse;
  }>({
    mutation: PLACE_ROULETTE,
    variables: { bets },
  });

  const data = response.data?.placeRouletteBet;

  if (!data) {
    throw new Error('Failed to place bet');
  }

  return {
    data,
    statusCode: 200,
    message: 'Success',
    success: true,
  };
};