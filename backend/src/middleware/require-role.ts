import type { Request, Response, NextFunction } from 'express';
import { HttpError } from '../lib/http-error';
import type { Role } from '../modules/auth/auth.service';

// Use after requireAuth: requireRole('ADMIN') lets only admins through (403 for others)
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new HttpError(403, 'You are not allowed to do this');
    }
    next();
  };
}
