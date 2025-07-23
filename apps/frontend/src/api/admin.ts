import type { ApiResponse } from '@repo/common/types';

import { fetchPost } from './_utils/fetch';

interface BalanceResponse {
  balance: number;
}

interface AdminBalanceRequest {
  userId: string;
  amount: number;
  apiKey: string;
  depositAddress?: string;
  withdrawAddress?: string;
  status?: string;
}

export const depositBalance = async (
  req: AdminBalanceRequest
): Promise<ApiResponse<BalanceResponse>> => {
  const { apiKey, ...data } = req;
  return fetchPost<
    {
      userId: string;
      amount: number;
      depositAddress?: string;
      status?: string;
    },
    ApiResponse<BalanceResponse>
  >('/api/v1/admin/deposit', data, { headers: { 'x-api-key': apiKey } });
};

export const withdrawBalance = async (
  req: AdminBalanceRequest
): Promise<ApiResponse<BalanceResponse>> => {
  const { apiKey, ...data } = req;
  return fetchPost<
    {
      userId: string;
      amount: number;
      withdrawAddress?: string;
      status?: string;
    },
    ApiResponse<BalanceResponse>
  >('/api/v1/admin/withdraw', data, { headers: { 'x-api-key': apiKey } });
};
