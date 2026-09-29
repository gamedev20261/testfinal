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

// The user id and issue time inside a valid token, or null when it is fake, changed or expired
export function readSessionToken(token: string): { userId: string; issuedAt: Date } | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof payload !== 'object' || typeof payload.sub !== 'string' || typeof payload.iat !== 'number') {
      return null;
    }
    return { userId: payload.sub, issuedAt: new Date(payload.iat * 1000) };
  } catch {
    return null;
  }
}

// "Log out everywhere from now on": tokens issued before this moment stop working.
// Rounded down to the second, because token times are in whole seconds.
export function sessionsValidFromNow(): Date {
  return new Date(Math.floor(Date.now() / 1000) * 1000);
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
