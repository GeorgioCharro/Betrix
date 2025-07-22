import { gql } from '@apollo/client';
import type { User, ApiResponse } from '@repo/common/types';

import { fetchGet } from './_utils/fetch';
import { graphqlClient } from './graphql/client';

const CURRENT_USER = gql`
  query CurrentUser {
    currentUser {
      id
      email
      name
      picture
      balance
    }
  }
`;

export const getUserDetails = async (): Promise<ApiResponse<User>> => {
  const { data } = await graphqlClient.query<{ currentUser: User }>({
    query: CURRENT_USER,
    fetchPolicy: 'no-cache',
  });
  return {
    data: data.currentUser,
    statusCode: 200,
    message: 'Success',
    success: true,
  };
};

export const logout = async (): Promise<void> => {
  await fetchGet('/api/v1/auth/logout');
};
