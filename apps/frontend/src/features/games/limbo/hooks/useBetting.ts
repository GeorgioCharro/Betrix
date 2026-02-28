import type {
  LimboPlaceBetRequestBody,
  LimboPlaceBetResponse,
} from '@repo/common/game-utils/limbo/types.js';
import type { ApiResponse } from '@repo/common/types';
import type { UseMutateFunction } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { placeLimboBet } from '@/api/games/limbo';

interface UseLimboBettingProps {
  setResult: (result: LimboPlaceBetResponse) => void;
}

interface UseLimboBettingResult {
  mutate: UseMutateFunction<
    ApiResponse<LimboPlaceBetResponse>,
    Error,
    LimboPlaceBetRequestBody
  >;
  isPending: boolean;
}

export function useLimboBetting({
  setResult,
}: UseLimboBettingProps): UseLimboBettingResult {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: placeLimboBet,
    onSuccess: (response: ApiResponse<LimboPlaceBetResponse>) => {
      setResult(response.data);
      queryClient.setQueryData(['balance'], () => response.data.balance);
    },
  });

  return {
    mutate,
    isPending,
  };
}

