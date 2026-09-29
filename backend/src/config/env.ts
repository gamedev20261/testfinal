import { z } from 'zod';

// Load backend/.env into process.env. A missing file is fine:
// on a real server the variables are set by the hosting system instead.
try {
  process.loadEnvFile();
} catch {
  // no .env file
}

// Every setting the backend needs, with its type and default value
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const result = envSchema.safeParse(process.env);

// Stop at startup with a clear message, instead of failing later in a strange way
if (!result.success) {
  console.error('Invalid settings in backend/.env:\n' + z.prettifyError(result.error));
  process.exit(1);
}

export const env = result.data;
export const isProduction = env.NODE_ENV === 'production';
