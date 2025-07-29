import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import { compare } from 'bcrypt';
import db from '@repo/db';
import type { User } from '@prisma/client';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: process.env.CALLBACK_URL || '/api/v1/auth/google/callback',
    },
    async (_, __, profile, done) => {
      const profileInfo = {
        googleId: profile.id,
        name: profile.displayName,
        picture: profile.photos?.[0].value || null,
      };

      try {
        // Find the user by email
        let user = await db.user.findFirst({
          where: { email: profile.emails?.[0].value || '' },
        });
        if (!user) {
          user = await db.user.create({
            data: {
              ...profileInfo,
              email: profile.emails?.[0].value || '',
              xp: 0,
              level: 'none',
            },
          });
        } else {
          user = await db.user.update({
            where: { id: user.id },
            data: profileInfo,
          });
        }

        done(null, user);
      } catch (err) {
        done(err, undefined);
      }
    }
  )
);

passport.use(
  new LocalStrategy(
    {
      usernameField: 'identifier',
    },
    async (identifier, password, done) => {
      try {
        const user = await db.user.findFirst({
          where: identifier.includes('@')
            ? { email: identifier }
            : { username: identifier },
        });

        if (!user || !(await compare(password, user.password || ''))) {
          done(null, false, { message: 'Invalid credentials' });
          return;
        }

        done(null, user);
      } catch (err) {
        done(err, undefined);
      }
    }
  )
);

passport.serializeUser((user: Express.User, done) => {
  done(null, (user as User).id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await db.user.findUnique({
      where: { id },
    });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
