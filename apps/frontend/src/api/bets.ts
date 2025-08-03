import { gql } from '@apollo/client';
import type { ApiResponse, PaginatedBetsResponse } from '@repo/common/types';

import { graphqlClient } from './graphql/client';

const ALL_BETS = gql`
  query AllBets($page: Int!, $pageSize: Int!) {
    allBets(page: $page, pageSize: $pageSize) {
      bets {
        userId
        betId
        game
        createdAt
        updatedAt
        betAmount
        payoutMultiplier
        payout
        id
        betNonce
        provablyFairStateId
        state
      }
      pagination {
        page
        pageSize
        totalCount
        totalPages
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

export const fetchAllBets = async ({
  page = 1,
  pageSize = 10,
  apiKey,
}: {
  page?: number;
  pageSize?: number;
  apiKey: string;
}): Promise<ApiResponse<PaginatedBetsResponse>> => {
  const { data } = await graphqlClient.query<{
    allBets: PaginatedBetsResponse;
  }>({
    query: ALL_BETS,
    variables: { page, pageSize },
    fetchPolicy: 'no-cache',
    context: { headers: { admin_api_key: apiKey } },
  });

  return {
    data: data.allBets,
    statusCode: 200,
    message: 'Success',
    success: true,
  };
};
