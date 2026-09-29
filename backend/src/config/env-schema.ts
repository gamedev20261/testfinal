import { z } from 'zod';

// Every setting the backend needs, with its type and default value.
// Checked by config/env.ts when the server starts, and by `npm run doctor`.
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32, 'must be at least 32 characters long'),
  SESSION_HOURS: z.coerce.number().positive().default(24),
  UPLOAD_DIR: z.string().default('uploads'), // where uploaded images and their tiles are stored
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(2048), // per file
  IMAGE_WORKERS: z.coerce.number().int().min(1).max(8).default(1), // images processed at the same time
});
