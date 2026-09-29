import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import { env, isProduction } from '../config/env';

// Everything about the login session: a signed token, stored in a cookie.

export const SESSION_COOKIE = 'session';

const SESSION_SECONDS = env.SESSION_HOURS * 60 * 60;

// A signed token that says "this is user <id>", valid for SESSION_HOURS
export function createSessionToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: SESSION_SECONDS });
}

// The user id inside a valid token, or null when the token is fake, changed or expired
export function readSessionToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    return typeof payload === 'object' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true, // page JavaScript can't read it, so injected scripts can't steal it
    sameSite: 'lax', // not sent when another website submits a form to our API
    secure: isProduction, // HTTPS only in production
    maxAge: SESSION_SECONDS * 1000, // the browser deletes it after this many milliseconds
    path: '/',
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}
