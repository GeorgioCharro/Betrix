import type { Server } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';

let wss: WebSocketServer | null = null;

export const initWebSocketServer = (server: Server) => {
  wss = new WebSocketServer({ server });
  wss.on('connection', ws => {
    ws.send(JSON.stringify({ type: 'connection', ok: true }));
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
