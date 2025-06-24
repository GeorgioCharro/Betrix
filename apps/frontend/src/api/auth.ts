import { gql } from '@apollo/client';
import type { IUser, ApiResponse } from '@repo/common/types';

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

export const getUserDetails = async (): Promise<ApiResponse<IUser>> => {
  const { data } = await graphqlClient.query<{ currentUser: IUser }>({
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