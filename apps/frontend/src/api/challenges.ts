import { gql } from '@apollo/client';
import type { ApiResponse } from '@repo/common/types';

import { graphqlClient } from './graphql/client';

export interface Challenge {
  id: string;
  challengeId: string;
  code: string;
  name: string;
  description: string;
  prize: number;
  userWon: boolean;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

const CHALLENGES_QUERY = gql`
  query Challenges {
    challenges {
      id
      challengeId
      code
      name
      description
      prize
      progress
      createdAt
      updatedAt
    }
  }
`;

export const fetchChallenges = async (): Promise<ApiResponse<Challenge[]>> => {
  const { data } = await graphqlClient.query<{ challenges: Challenge[] }>({
    query: CHALLENGES_QUERY,
    fetchPolicy: 'no-cache',
  });
  return {
    data: data.challenges,
    statusCode: 200,
    message: 'Success',
    success: true,
  };
};

const ADD_CHALLENGE = gql`
  mutation AddChallenge(
    $code: String!
    $name: String!
    $description: String!
    $prize: Int!
  ) {
    addChallenge(
      code: $code
      name: $name
      description: $description
      prize: $prize
    ) {
      id
      challengeId
      code
      name
      description
      prize
      userWon
      progress
      createdAt
      updatedAt
    }
  }
`;

export const addChallenge = async (req: {
  code: string;
  name: string;
  description: string;
  prize: number;
  apiKey: string;
}): Promise<ApiResponse<Challenge>> => {
  const { apiKey, ...vars } = req;
  const { data } = await graphqlClient.mutate<{ addChallenge: Challenge }>({
    mutation: ADD_CHALLENGE,
    variables: vars,
    context: { headers: { admin_api_key: apiKey } },
  });
  if (!data) {
    throw new Error('Failed to add challenge');
  }
  return {
    data: data.addChallenge,
    statusCode: 200,
    message: 'Success',
    success: true,
  };
};
