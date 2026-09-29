import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { loginSchema, changePasswordSchema } from './auth.schemas';
import { login, changePassword } from './auth.service';
import { requireAuth } from '../../middleware/require-auth';
import { createSessionToken, setSessionCookie, clearSessionCookie } from '../../lib/session';

export const authRouter = Router();

// At most 20 failed logins per 15 minutes from one address. Successful logins don't count.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many failed logins. Try again in 15 minutes.' },
});

// POST /api/auth/login  { email, password } → sets the session cookie, returns { user }
authRouter.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await login(email, password);

  setSessionCookie(res, createSessionToken(user.id));
  res.json({ user });
});

// POST /api/auth/logout → deletes the session cookie
authRouter.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

// GET /api/auth/me → who is logged in? The frontend asks this when a page loads.
authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/change-password  { currentPassword, newPassword }
// Other logins of this user end; this browser gets a fresh session.
authRouter.post('/change-password', loginLimiter, requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  await changePassword(req.user!.id, currentPassword, newPassword);

  setSessionCookie(res, createSessionToken(req.user!.id));
  res.status(204).end();
});
