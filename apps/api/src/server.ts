import 'express-async-errors';
import 'dotenv/config';

import { json, urlencoded } from 'body-parser';
import express, { type Express } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { StatusCodes } from 'http-status-codes';
import { authRouter, gameRouter, adminRouter } from './routes';
import { initGraphQL } from './graphql';
import './config/passport';
import notFoundMiddleware from './middlewares/not-found';
import { errorHandlerMiddleware } from './middlewares/error-handler';

export const createServer = async (): Promise<Express> => {
  const app = express();
  app.set('trust proxy', 1);
  app
    .disable('x-powered-by')
    .use(morgan('dev'))
    .use(urlencoded({ extended: true }))
    .use(json())
    .use(
      cors({
        origin: process.env.REACT_ORIGINS_URL || 'http://localhost:3000', // Use env variable with fallback
        credentials: true, // Allow cookies and other credentials
      })
    )
    .use(
      session({
        secret: process.env.COOKIE_SECRET || 'secr3T',
        cookie: {
          secure: process.env.NODE_ENV === 'production' ? true : 'auto',
          httpOnly: true,
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          maxAge: 2 * 24 * 60 * 60 * 1000,
        },
        resave: false,
        saveUninitialized: false,
      })
    )
    .use(passport.initialize())
    .use(passport.session());

  await initGraphQL(app);

  app
    .get('/health', (_, res) => {
      return res.status(StatusCodes.OK).json({ ok: true });
    })
    .use('/api/v1/auth', authRouter)
    .use('/api/v1/games', gameRouter)
    .use('/api/v1/admin', adminRouter);

  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
};
