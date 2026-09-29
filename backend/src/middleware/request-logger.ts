import type { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

// Prints one line per request once the response is sent, for example:
//   GET /api/health → 200 (3 ms)
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now();

  res.on('finish', () => {
    const ms = Date.now() - startedAt;
    logger.info(`${req.method} ${req.originalUrl} → ${res.statusCode} (${ms} ms)`);
  });

  next(); // hand the request to the next middleware or route
}
