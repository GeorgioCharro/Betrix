import { createLogger, transports } from 'winston';
import { createServer } from './server';

const logger = createLogger({
  transports: [new transports.Console()]
});

const port = process.env.PORT || 5000;

createServer()
  .then(app => {
    app.listen(port, () => {
      logger.info(`Server listening on port ${port}`);
    });
  })
  .catch(err => {
    logger.error('Failed to start server:', err);
    process.exit(1);
  });
