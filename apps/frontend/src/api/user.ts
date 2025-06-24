import { gql } from '@apollo/client';
import type {
  ProvablyFairStateResponse,
  ApiResponse,
  PaginatedBetsResponse,
} from '@repo/common/types';

import { graphqlClient } from './graphql/client';

const ACTIVE_SEEDS = gql`
  query ProvablyFairState {
    provablyFairState {
      clientSeed
      hashedServerSeed
      hashedNextServerSeed
      nonce
    }
  }
`;

export const fetchActiveSeeds = async (): Promise<ApiResponse<ProvablyFairStateResponse>> => {
  const { data } = await graphqlClient.query<{ provablyFairState: ProvablyFairStateResponse }>({
    query: ACTIVE_SEEDS,
    fetchPolicy: 'no-cache',
  });
  return { data: data.provablyFairState, statusCode: 200, message: 'Success', success: true };
};

const ROTATE_SEED = gql`
  mutation RotateSeed($clientSeed: String!) {
    rotateSeed(clientSeed: $clientSeed) {
      clientSeed
      hashedServerSeed
      hashedNextServerSeed
      nonce
    }
  }
`;

export const fetchRotateSeedPair = async (
  clientSeed: string
): Promise<ApiResponse<ProvablyFairStateResponse>> => {
  const { data } = await graphqlClient.mutate<{ rotateSeed: ProvablyFairStateResponse }>({
    mutation: ROTATE_SEED,
    variables: { clientSeed },
  });
  if (!data) {
    throw new Error('Failed to rotate seed');
  }
  return { data: data.rotateSeed, statusCode: 200, message: 'Success', success: true };
};

const REVEALED_SERVER_SEED = gql`
  query RevealedServerSeed($hashedServerSeed: String!) {
    revealedServerSeed(hashedServerSeed: $hashedServerSeed) {
      serverSeed
    }
  }
`;

export const fetchRevealedServerSeed = async (
  hashedServerSeed: string
): Promise<ApiResponse<{ serverSeed: string | null }>> => {
  const { data } = await graphqlClient.query<{ revealedServerSeed: { serverSeed: string | null } }>({
    query: REVEALED_SERVER_SEED,
    variables: { hashedServerSeed },
    fetchPolicy: 'no-cache',
  });
  return { data: data.revealedServerSeed, statusCode: 200, message: 'Success', success: true };
};

const USER_BET_HISTORY = gql`
  query UserBetHistory($page: Int!, $pageSize: Int!) {
    userBetHistory(page: $page, pageSize: $pageSize) {
      bets {
        betId
        game
        date
        betAmount
        payoutMultiplier
        payout
        id
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

export const fetchUserBetHistory = async ({
  page = 1,
  pageSize = 10,
}: {
  page?: number;
  pageSize?: number;
}): Promise<ApiResponse<PaginatedBetsResponse>> => {
  const { data } = await graphqlClient.query<{ userBetHistory: PaginatedBetsResponse }>({
    query: USER_BET_HISTORY,
    variables: { page, pageSize },
    fetchPolicy: 'no-cache',
  });
  return { data: data.userBetHistory, statusCode: 200, message: 'Success', success: true };
};
