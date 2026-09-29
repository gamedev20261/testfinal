import { existsSync } from 'node:fs';
import { z } from 'zod';
import { envSchema } from './env-schema';
import { isSupportedNode, NODE_REQUIREMENT } from './node-version';

// An old Node.js fails later with confusing errors, so stop right away with a clear one
if (!isSupportedNode()) {
  console.error(`Node.js ${NODE_REQUIREMENT} is required, but this is ${process.version}.`);
  console.error('Install Node.js 22 LTS from https://nodejs.org, then run "npm install" again.');
  process.exit(1);
}

// Load backend/.env into process.env. A missing file is allowed:
// on a real server the variables are set by the hosting system instead.
const envFileFound = existsSync('.env');
if (envFileFound) {
  process.loadEnvFile('.env');
}

const result = envSchema.safeParse(process.env);

// Stop at startup with a clear message, instead of failing later in a strange way
if (!result.success) {
  const hint = envFileFound ? '' : '\n\nbackend/.env was not found. Copy backend/.env.example to backend/.env and edit it.';
  console.error('Invalid settings in backend/.env:\n' + z.prettifyError(result.error) + hint);
  console.error('\nRun "npm run doctor" for step-by-step help.');
  process.exit(1);
}

export const env = result.data;
export const isProduction = env.NODE_ENV === 'production';
