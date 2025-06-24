import { gql } from '@apollo/client';
import type { KenoResponse } from '@repo/common/game-utils/keno/types.js';
import type { ApiResponse } from '@repo/common/types';

import { graphqlClient } from '../graphql/client';

const PLACE_KENO = gql`
  mutation PlaceKenoBet($betAmount: Float!, $selectedTiles: [Int!]!, $risk: String!) {
    placeKenoBet(betAmount: $betAmount, selectedTiles: $selectedTiles, risk: $risk) {
      id
      state { risk selectedTiles drawnNumbers }
      payoutMultiplier
      payout
      balance
    }
  }
`;

export const placeBet = async ({
  betAmount,
  selectedTiles,
  risk,
}: {
  betAmount: number;
  selectedTiles: number[];
  risk: string;
}): Promise<ApiResponse<KenoResponse>> => {
  const { data } = await graphqlClient.mutate<{ placeKenoBet: KenoResponse }>({
    mutation: PLACE_KENO,
    variables: { betAmount, selectedTiles, risk },
  });
  if (!data) {
    throw new Error('Failed to place Keno bet');
  }
  return { data: data.placeKenoBet, statusCode: 200, message: 'Success', success: true };
};