import type { ApiResponse } from '@repo/common/types';
import {
  useMutation,
  useQueryClient,
  type UseMutateFunction,
} from '@tanstack/react-query';

import { depositBalance, withdrawBalance } from '@/api/admin';

interface AdminBalanceRequest {
  userId: string;
  amount: number;
  apiKey: string;
}

interface BalanceResponse {
  balance: number;
}

export function useDepositBalance(): {
  mutate: UseMutateFunction<
    ApiResponse<BalanceResponse>,
    Error,
    AdminBalanceRequest
  >;
  isPending: boolean;
} {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: depositBalance,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['balance'] });
    },
  });
  return { mutate, isPending };
}

export function useWithdrawBalance(): {
  mutate: UseMutateFunction<
    ApiResponse<BalanceResponse>,
    Error,
    AdminBalanceRequest
  >;
  isPending: boolean;
} {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: withdrawBalance,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['balance'] });
    },
  });
  return { mutate, isPending };
}
