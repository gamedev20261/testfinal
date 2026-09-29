import type { Request, Response, NextFunction } from 'express';
import { SESSION_COOKIE, readSessionToken } from '../lib/session';
import { HttpError } from '../lib/http-error';
import { findSessionUser } from '../modules/auth/auth.service';

// Put in front of any route that needs a logged-in user.
// Lets the request through only with a valid session cookie, and sets req.user.
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token: string | undefined = req.cookies?.[SESSION_COOKIE];
  const session = token ? readSessionToken(token) : null;
  if (!session) {
    throw new HttpError(401, 'Please log in');
  }

  // Read the user fresh from the database: a deleted account or a changed password
  // ends the session at once
  const user = await findSessionUser(session.userId, session.issuedAt);
  if (!user) {
    throw new HttpError(401, 'Please log in');
  }

  req.user = user;
  next();
}
