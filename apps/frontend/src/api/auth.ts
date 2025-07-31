import { gql } from '@apollo/client';
import type { User, ApiResponse } from '@repo/common/types';
import axios from 'axios';

import { BASE_API_URL } from '@/const/routes';

import { fetchGet, fetchPost } from './_utils/fetch';
import { graphqlClient } from './graphql/client';

const CURRENT_USER = gql`
  query CurrentUser {
    currentUser {
      id
      email
      name
      picture
      balance
      xp
      level
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

interface RegisterRequest {
  identifier: string;
  username: string;
  password: string;
  dateOfBirth: string;
  code?: string;
}

export const registerAccount = async (
  req: RegisterRequest
): Promise<ApiResponse<unknown>> => {
  return fetchPost<RegisterRequest, ApiResponse<unknown>>(
    '/api/v1/auth/register',
    req
  );
};

interface LoginRequest {
  identifier: string;
  password: string;
}

interface LoginError {
  message?: string;
}

export const loginAccount = async (req: LoginRequest): Promise<void> => {
  const res = await axios.post<ApiResponse<User> | LoginError>(
    `${BASE_API_URL}/api/v1/auth/login`,
    req,
    {
      withCredentials: true,
      validateStatus: () => true,
    }
  );

  if (res.status >= 400) {
    const data = res.data as LoginError;
    throw new Error(data.message ?? 'Login failed');
  }
};
