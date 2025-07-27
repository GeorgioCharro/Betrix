import passport from 'passport';
import { hash } from 'bcrypt';
import db from '@repo/db';
import type { User } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { ApiResponse } from '@repo/common/types';
import { Router } from 'express';
import type { RequestHandler } from 'express';
import { BadRequestError } from '../../errors';
import { isAuthenticated } from '../../middlewares/auth.middleware';

interface RegisterRequestBody {
  email: string;
  username: string;
  password: string;
  dateOfBirth: string;
  code?: string;
}

interface CreateUserData {
  email: string;
  username: string;
  password: string;
  dateOfBirth: Date;
  code?: string | null;
}

const router: Router = Router();

// Google authentication routes
router.get('/google', (req, res, next) => {
  const state = JSON.stringify({ redirect: req.query.redirect_to });
  // Store the redirect URL in session if provided
  (
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      state: encodeURIComponent(state),
    }) as RequestHandler
  )(req, res, next);
});

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL}/login`,
  }) as RequestHandler,
  (req, res) => {
    const state = req.query.state
      ? (JSON.parse(decodeURIComponent(req.query.state as string)) as {
          redirect?: string;
        })
      : {};
    res.redirect(state.redirect || `${process.env.CLIENT_URL}`);
  }
);

// Local authentication routes
router.post(
  '/login',
  passport.authenticate('local', {
    failureRedirect: `${process.env.CLIENT_URL}/login`,
  }) as RequestHandler,
  (req, res) => {
    res.redirect(`${process.env.CLIENT_URL}`);
  }
);

router.post('/register', async (req, res) => {
  const { email, username, password, dateOfBirth, code } =
    req.body as RegisterRequestBody;

  if (!email || !username || !password || !dateOfBirth) {
    throw new BadRequestError('Missing required fields');
  }

  const existingEmail = await db.user.findUnique({ where: { email } });
  if (existingEmail) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: 'Email already exists' });
  }

  const existingUsername = await db.user.findFirst({ where: { username } });
  if (existingUsername) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: 'Username already exists' });
  }

  const hashedPassword = await hash(password, 10);

  const user = await db.user.create({
    data: {
      email,
      username,
      password: hashedPassword,
      dateOfBirth: new Date(dateOfBirth),
      code,
    } as CreateUserData,
  });

  type UserWithPassword = Record<string, unknown> & { password?: string };
  const { password: _p, ...userWithoutPassword } = user as UserWithPassword;

  res
    .status(StatusCodes.CREATED)
    .json(new ApiResponse(StatusCodes.CREATED, userWithoutPassword));
});

router.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) next(err);
    res.redirect('/auth');
  });
});

router.get('/me', isAuthenticated, (req, res) => {
  const user = req.user as User;
  if (user.password) {
    const { password: _password, ...userWithoutPassword } = user;
    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(StatusCodes.OK, userWithoutPassword));
  }
  return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, user));
});

export default router;
