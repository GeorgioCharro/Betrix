import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import Redis from 'ioredis';
import { CrashEngine, DbBalanceService } from './features/games/crash/crash.engine';

let wss: WebSocketServer | null = null;
let crashEngine: CrashEngine | null = null;
let redisPub: Redis | null = null;
let redisSub: Redis | null = null;

export const initWebSocketServer = (server: Server) => {
  wss = new WebSocketServer({ server });

  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    try {
      redisPub = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
      });
      redisSub = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
      });

      redisSub.subscribe('crash_state').catch(() => {
        // If subscription fails, disable Redis-based broadcasting entirely.
        if (redisPub) {
          redisPub.disconnect();
        }
        if (redisSub) {
          redisSub.disconnect();
        }
        redisPub = null;
        redisSub = null;
      });

      redisSub.on('message', (_channel, message) => {
        if (!wss) return;
        wss.clients.forEach((client: WebSocket) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      });
    } catch {
      redisPub = null;
      redisSub = null;
    }
  }

  const balanceService = new DbBalanceService((userId, balanceInCents) => {
    const balanceValue = balanceInCents / 100;
    broadcastBalanceUpdate(userId, balanceValue);
  });

  crashEngine = new CrashEngine(wss, balanceService, redisPub ?? null);
  crashEngine.start();

  wss.on('connection', (ws, req) => {
    let userId: string | null = null;

    try {
      if (req.url) {
        const url = new URL(req.url, 'ws://localhost');
        const fromQuery = url.searchParams.get('userId');
        if (fromQuery && fromQuery.length > 0) {
          userId = fromQuery;
        }
      }
    } catch {
      // Fallback to anonymous ID below.
    }

    if (!userId) {
      userId = randomUUID();
    }

    crashEngine?.registerConnection(ws, userId);

    ws.send(JSON.stringify({ type: 'connection', ok: true }));

    if (crashEngine) {
      const snapshot = crashEngine.getCurrentState();
      ws.send(
        JSON.stringify({
          type: 'crash:state_snapshot',
          ...snapshot,
        }),
      );
    }

    ws.on('message', async data => {
      if (!crashEngine) return;
      try {
        const parsed = JSON.parse(String(data)) as {
          type?: string;
          amount?: number;
          cashoutAt?: number;
        };
        switch (parsed.type) {
          case 'crash:place_bet':
            await crashEngine.placeBet(
              ws,
              Number(parsed.amount ?? 0),
              parsed.cashoutAt,
            );
            break;
          case 'crash:cashout':
            await crashEngine.cashOut(ws);
            break;
          default:
            break;
        }
      } catch {
        // ignore invalid payloads
      }
    });

    ws.on('close', () => {
      if (crashEngine) {
        crashEngine.removeClient(ws);
      }
    });
  });
};

export const broadcastBalanceUpdate = (userId: string, balance: number) => {
  if (!wss) return;
  const data = JSON.stringify({ type: 'balanceUpdate', userId, balance });
  wss.clients.forEach((client: WebSocket) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

