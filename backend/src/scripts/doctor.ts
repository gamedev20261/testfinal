// `npm run doctor`: checks everything the app needs on this computer, in order,
// and says how to fix the first problem it finds.
import { existsSync, readdirSync } from 'node:fs';
import { createServer } from 'node:net';
import { z } from 'zod';
import type { PrismaClient } from '../generated/prisma/client';
import { envSchema } from '../config/env-schema';
import { isSupportedNode, NODE_REQUIREMENT } from '../config/node-version';

let failed = false;

function ok(message: string) {
  console.log(`[ OK ] ${message}`);
}
function warn(message: string, advice: string) {
  console.log(`[WARN] ${message}\n       ${advice}`);
}
function fail(message: string, fix: string) {
  failed = true;
  console.log(`[FAIL] ${message}\n       Fix: ${fix}`);
}

async function main() {
  console.log('GeoAnnotator setup check\n');

  // 1. Node.js
  if (!isSupportedNode()) {
    fail(`Node.js ${process.version} is too old (needs ${NODE_REQUIREMENT})`, 'install Node.js 22 LTS from https://nodejs.org, then run "npm install" again');
    return;
  }
  ok(`Node.js ${process.version}`);

  // 2. Packages (npm install also generates the database client)
  if (!existsSync('src/generated/prisma')) {
    fail('Backend packages are not installed', 'run "npm install" in the backend folder');
    return;
  }
  ok('Backend packages installed');

  // 3. The settings file
  if (!existsSync('.env')) {
    const fix = existsSync('.env.txt')
      ? 'rename backend/.env.txt to backend/.env (Windows Notepad added ".txt")'
      : 'copy backend/.env.example to backend/.env, then set DATABASE_URL (learn/local-postgres.md)';
    fail('backend/.env not found', fix);
    return;
  }
  process.loadEnvFile('.env');
  ok('backend/.env found');

  // 4. The settings inside it
  const settings = envSchema.safeParse(process.env);
  if (!settings.success) {
    fail(`Some settings in backend/.env are wrong:\n${indent(z.prettifyError(settings.error))}`, 'compare them with backend/.env.example');
    return;
  }
  const { DATABASE_URL, JWT_SECRET, PORT } = settings.data;
  ok('Settings in backend/.env are valid');
  if (JWT_SECRET.startsWith('dev-only-secret')) {
    warn('JWT_SECRET is still the example value', 'fine on your own computer; make your own before anyone else uses the app');
  }

  // 5. The database connection
  const { describeDatabase, findDatabaseProblem, databaseFix } = await import('../lib/database-check');
  const { prisma } = await import('../lib/prisma');
  try {
    const target = describeDatabase(DATABASE_URL);
    const problem = await findDatabaseProblem();
    if (problem) {
      fail(`Cannot connect to the database ${target}\n       Reason: ${problem}`, databaseFix(problem));
      return;
    }
    ok(`Database reachable: ${target}`);

    // 6. The tables
    const pending = await pendingMigrations(prisma);
    if (pending.length > 0) {
      fail(`${pending.length} migration(s) not applied yet: ${pending.join(', ')}`, 'run "npm run db:migrate"');
      return;
    }
    ok('All migrations applied (tables are up to date)');

    // 7. Someone to log in with
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { email: true } });
    if (admins.length === 0) {
      fail('There is no admin account yet', 'run "npm run db:seed"');
      return;
    }
    ok(`Admin account: ${admins.map((admin) => admin.email).join(', ')}`);
  } finally {
    await prisma.$disconnect();
  }

  // 8. The port the backend will use
  if (await isPortInUse(PORT)) {
    warn(`Port ${PORT} is already in use`, 'fine if the backend is already running in another terminal; otherwise close the program using it, or change PORT in backend/.env');
  } else {
    ok(`Port ${PORT} is free for the backend`);
  }
  if (PORT !== 3001) {
    warn(`PORT is ${PORT}, but the frontend sends /api requests to port 3001`, 'set PORT=3001 in backend/.env, or change the proxy in frontend/vite.config.ts');
  }

  // 9. The frontend
  if (!existsSync('../frontend/node_modules')) {
    fail('Frontend packages are not installed', 'in a terminal: cd frontend, then npm install');
    return;
  }
  ok('Frontend packages installed');
}

// Migration folders in prisma/migrations that the database has not run yet
async function pendingMigrations(prisma: PrismaClient): Promise<string[]> {
  const folders = readdirSync('prisma/migrations', { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  type Row = { migration_name: string };
  const applied = await prisma.$queryRaw<Row[]>`
    SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL
  `.catch((): Row[] => []); // no _prisma_migrations table yet = nothing applied
  const done = new Set(applied.map((row) => row.migration_name));
  return folders.filter((folder) => !done.has(folder));
}

// True when another program already listens on this port
function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(true));
    server.once('listening', () => server.close(() => resolve(false)));
    server.listen(port);
  });
}

function indent(text: string): string {
  return text
    .split('\n')
    .map((line) => `       ${line}`)
    .join('\n');
}

main()
  .catch((error) => fail(`Unexpected error: ${error instanceof Error ? error.message : error}`, 'copy this whole output and ask for help'))
  .finally(() => {
    console.log(failed ? '\nFix the [FAIL] line above, then run "npm run doctor" again.' : '\nAll good! Start the backend with "npm run dev", and the frontend with "npm run dev" in frontend/.');
    process.exitCode = failed ? 1 : 0;
  });
