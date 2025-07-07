import { gql } from '@apollo/client';
import type { Risk } from '@repo/common/game-utils/plinkoo/objects.js';
import type { ApiResponse } from '@repo/common/types';

import { graphqlClient } from '../graphql/client';

const PLINKOO_OUTCOME = gql`
  mutation PlinkooOutcome(
    $clientSeed: String
    $betamount: Float!
    $rows: Int!
    $risk: PlinkooRisk!
  ) {
    plinkooOutcome(
      clientSeed: $clientSeed
      betamount: $betamount
      rows: $rows
      risk: $risk
    ) {
      id
      state {
        point
        multiplier
        pattern
      }
      payoutMultiplier
      payout
      balance
    }
  }
`;

export interface PlinkooResult {
  point: number;
  multiplier: number;
  pattern: string[];
}

export interface PlinkooBetResponse {
  id: string;
  state: PlinkooResult;
  payoutMultiplier: number;
  payout: number;
  balance: number;
}

export const playPlinkoo = async ({
  betAmount,
  rows,
  risk,
  clientSeed,
}: {
  betAmount: number;
  rows: number;
  risk: Risk;
  clientSeed?: string;
}): Promise<ApiResponse<PlinkooBetResponse>> => {
  const { data } = await graphqlClient.mutate<{
    plinkooOutcome: PlinkooBetResponse;
  }>({
    mutation: PLINKOO_OUTCOME,
    variables: { clientSeed, betamount: betAmount, rows, risk },
  });

  if (!data) {
    throw new Error('Failed to play Plinkoo');
  }

  return {
    data: data.plinkooOutcome,
    statusCode: 200,
    message: 'Success',
    success: true,
  };
};
