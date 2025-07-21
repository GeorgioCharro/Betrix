import { useQuery } from '@tanstack/react-query';

import { getBalance } from '@/api/balance';

export function useBalance(): number | undefined {
  const { data } = useQuery({
    queryKey: ['balance'],
    queryFn: getBalance,
    refetchInterval: 120000,
  });

  return data;
}
