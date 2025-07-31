import 'express-async-errors';
import 'dotenv/config';

import { json, urlencoded } from 'body-parser';
import express, { type Express } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { StatusCodes } from 'http-status-codes';
import { authRouter, gameRouter } from './routes';
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
        // Allow any origin when REACT_ORIGINS_URL is "*". Otherwise use the
        // provided comma-separated list or a safe local default.
        origin:
          process.env.REACT_ORIGINS_URL === '*'
            ? true
            : process.env.REACT_ORIGINS_URL?.split(',') || [
                'http://localhost:3000',
                'http://localhost:5173',
                'https://studio.apollographql.com/',
              ],
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
    .use('/api/v1/games', gameRouter);

  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
};
