import http from 'node:http';
import { createLogger, transports } from 'winston';
import { createServer } from './server';
import { initWebSocketServer } from './websocket';

const logger = createLogger({
  transports: [new transports.Console()],
});

const port = process.env.PORT || 5000;

createServer()
  .then(app => {
    const server = http.createServer(app);
    initWebSocketServer(server);
    server.listen(port, () => {
      logger.info(`Server listening on port ${port}`);
    });
  })
  .catch(err => {
    logger.error('Failed to start server:', err);
    process.exit(1);
  });
