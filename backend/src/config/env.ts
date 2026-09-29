import { z } from 'zod';

// Load backend/.env into process.env. A missing file is allowed:
// on a real server the variables are set by the hosting system instead.
let envFileFound = true;
try {
  process.loadEnvFile();
} catch {
  envFileFound = false;
}

// Every setting the backend needs, with its type and default value
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32, 'must be at least 32 characters long'),
  SESSION_HOURS: z.coerce.number().positive().default(24),
});

const result = envSchema.safeParse(process.env);

// Stop at startup with a clear message, instead of failing later in a strange way
if (!result.success) {
  const hint = envFileFound ? '' : '\n\nbackend/.env was not found. Copy backend/.env.example to backend/.env and edit it.';
  console.error('Invalid settings in backend/.env:\n' + z.prettifyError(result.error) + hint);
  process.exit(1);
}

export const env = result.data;
export const isProduction = env.NODE_ENV === 'production';
