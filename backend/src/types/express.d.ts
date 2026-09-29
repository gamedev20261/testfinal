import type { PublicUser } from '../modules/auth/auth.service';

// Teaches TypeScript that a request can carry the logged-in user.
// requireAuth fills it in; routes behind requireAuth can read req.user.
declare global {
  namespace Express {
    interface Request {
      user?: PublicUser;
    }
  }
}

export {};
