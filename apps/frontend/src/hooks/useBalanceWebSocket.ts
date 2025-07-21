import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { BASE_API_URL } from '@/const/routes';
import { useAuthStore } from '@/features/auth/store/authStore';

interface BalanceUpdateMessage {
  type: 'balanceUpdate';
  userId: string;
  balance: number;
}

function isBalanceUpdateMessage(data: unknown): data is BalanceUpdateMessage {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.type === 'balanceUpdate' &&
    typeof obj.userId === 'string' &&
    typeof obj.balance === 'number'
  );
}

export function useBalanceWebSocket(): void {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = import.meta.env.DEV
      ? `${window.location.hostname}:5000`
      : new URL(BASE_API_URL).host;
    const url = `${protocol}://${host}`;
    const ws = new WebSocket(url);

    const handleMessage = (event: MessageEvent): void => {
      if (typeof event.data !== 'string') return;
      try {
        const parsed: unknown = JSON.parse(event.data);
        if (isBalanceUpdateMessage(parsed) && parsed.userId === user.id) {
          queryClient.setQueryData(['balance'], () => parsed.balance);
        }
      } catch {
        // Ignore invalid messages
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => {
      ws.removeEventListener('message', handleMessage);
      ws.close();
    };
  }, [user, queryClient]);
}
