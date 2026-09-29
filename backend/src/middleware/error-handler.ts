import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { MulterError } from 'multer';
import { HttpError } from '../lib/http-error';
import { logger } from '../lib/logger';

// The last middleware: every error thrown in a route ends up here
// and becomes a JSON answer with the right status code.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  // 400: the request data broke a Zod schema (e.g. missing email)
  if (err instanceof ZodError) {
    res.status(400).json({
      error: err.issues[0]?.message ?? 'Invalid request',
      issues: err.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    });
    return;
  }

  // Errors we threw on purpose: 401, 403, 404, 409…
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  // File upload problems (too big, too many files…)
  if (err instanceof MulterError) {
    res.status(400).json({ error: `Upload failed: ${err.message}` });
    return;
  }

  // PostgreSQL rules that were broken (Drizzle keeps the original error in `cause`)
  const code = postgresErrorCode(err);
  if (code === '23505') {
    res.status(409).json({ error: 'This already exists' });
    return;
  }
  if (code === '23503') {
    res.status(409).json({ error: 'This is still used elsewhere' });
    return;
  }

  // Errors raised by Express itself, e.g. a request body that is not valid JSON
  if (isClientError(err)) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  // Anything else is a bug: log the details, but don't show them to the caller
  logger.error(err, `Unexpected error on ${req.method} ${req.originalUrl}`);
  res.status(500).json({ error: 'Something went wrong on the server' });
}

function postgresErrorCode(err: unknown): string | undefined {
  const withCode = (value: unknown) => (value as { code?: unknown })?.code;
  const code = withCode(err) ?? withCode((err as { cause?: unknown })?.cause);
  return typeof code === 'string' ? code : undefined;
}

function isClientError(err: unknown): err is { status: number; message: string } {
  const status = (err as { status?: unknown })?.status;
  return typeof status === 'number' && status >= 400 && status < 500;
}
