// `npm run doctor`: checks everything the app needs on this computer, in order,
// and says how to fix the first problem it finds.
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { z } from 'zod';
import type { Pool } from 'pg';
import { envSchema } from '../config/env-schema';
import { isSupportedNode, NODE_REQUIREMENT } from '../config/node-version';
import { errorMessage } from '../lib/error-message';

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

  // 2. Packages
  if (!existsSync('node_modules/drizzle-orm')) {
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

  // 5. The database (loaded only now, because it reads the settings as it loads)
  const { describeDatabase, findDatabaseProblem, databaseFix } = await import('../lib/database-check');
  const { pool } = await import('../db/client');
  try {
    const target = describeDatabase(DATABASE_URL);
    const problem = await findDatabaseProblem();
    if (problem) {
      fail(`Cannot connect to the database ${target}\n       Reason: ${problem}`, databaseFix(problem));
      return;
    }
    ok(`Database reachable: ${target}`);

    // 6. PostGIS installed on the PostgreSQL server?
    const postgis = await pool.query("SELECT default_version FROM pg_available_extensions WHERE name = 'postgis'");
    if (postgis.rowCount === 0) {
      fail('PostGIS is not installed on your PostgreSQL server', 'Mac installer: Application Stack Builder → Spatial Extensions → PostGIS · Homebrew: brew install postgis · Postgres.app: included · Windows: Stack Builder · Docker: included');
      return;
    }
    ok(`PostGIS ${postgis.rows[0].default_version} available`);
    if (!(await postgisCanBeEnabled(pool))) return;

    // 7. The tables
    const pending = await pendingMigrations(pool);
    if (pending > 0) {
      fail(`${pending} migration(s) not applied yet`, 'run "npm run db:migrate"');
      return;
    }
    ok('All migrations applied (tables are up to date)');

    // 8. Someone to log in with
    const admins = await pool.query("SELECT email FROM users WHERE role = 'ADMIN' AND deleted_at IS NULL");
    if (admins.rowCount === 0) {
      fail('There is no admin account yet', 'run "npm run db:seed"');
      return;
    }
    ok(`Admin account: ${admins.rows.map((row) => row.email).join(', ')}`);
  } finally {
    await pool.end();
  }

  // 9. The port the backend will use
  if (await isPortInUse(PORT)) {
    warn(`Port ${PORT} is already in use`, 'fine if the backend is already running in another terminal; otherwise close the program using it, or change PORT in backend/.env');
  } else {
    ok(`Port ${PORT} is free for the backend`);
  }
  if (PORT !== 3001) {
    warn(`PORT is ${PORT}, but the frontend sends /api requests to port 3001`, 'set PORT=3001 in backend/.env, or change the proxy in frontend/vite.config.ts');
  }

  // 10. The frontend
  if (!existsSync('../frontend/node_modules')) {
    fail('Frontend packages are not installed', 'in a terminal: cd frontend, then npm install');
    return;
  }
  ok('Frontend packages installed');
}

// How many migrations in drizzle/ the database has not run yet
async function pendingMigrations(pool: Pool): Promise<number> {
  const journal = JSON.parse(readFileSync('drizzle/meta/_journal.json', 'utf8')) as { entries: unknown[] };
  const applied = await pool
    .query('SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations')
    .then((result) => result.rows[0].count as number)
    .catch(() => 0); // no migrations table yet = nothing applied
  return Math.max(journal.entries.length - applied, 0);
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

// Installed is not always usable (wrong PostgreSQL version, missing rights…).
// Tries to switch PostGIS on inside a transaction that is undone afterwards.
async function postgisCanBeEnabled(pool: Pool) {
  const enabled = await pool.query("SELECT extversion FROM pg_extension WHERE extname = 'postgis'");
  if (enabled.rowCount) {
    ok(`PostGIS ${enabled.rows[0].extversion} is enabled in this database`);
    return true;
  }
  const { rows } = await pool.query('SHOW server_version');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('CREATE EXTENSION postgis');
    ok('PostGIS can be enabled ("npm run db:migrate" does it)');
    return true;
  } catch (error) {
    const reason = errorMessage(error);
    const fix = reason.includes('permission denied')
      ? 'use the "postgres" user in DATABASE_URL (backend/.env)'
      : /could not (load library|access file)|incompatible/.test(reason)
        ? `PostGIS was installed for another PostgreSQL version. Your server is PostgreSQL ${rows[0].server_version}: install the PostGIS bundle for exactly that version (Stack Builder → your server on port 5432)`
        : 'copy this message and ask for help';
    fail(`PostGIS is installed but cannot be enabled (PostgreSQL ${rows[0].server_version})\n       Reason: ${reason}`, fix);
    return false;
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
}
