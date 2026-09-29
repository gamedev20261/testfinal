// `npm run db:migrate`: creates the database if needed, then runs every migration in drizzle/
import { Client, Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { env } from '../config/env';
import { errorMessage } from '../lib/error-message';

// Connects to the built-in "postgres" database to create ours when it doesn't exist yet
async function createDatabaseIfMissing() {
  const url = new URL(env.DATABASE_URL);
  const name = decodeURIComponent(url.pathname.slice(1));
  url.pathname = '/postgres';

  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  try {
    const found = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (found.rowCount === 0) {
      await client.query(`CREATE DATABASE "${name.replaceAll('"', '""')}"`);
      console.log(`Created database "${name}"`);
    }
  } finally {
    await client.end();
  }
}

// The first version of this project used Prisma, whose tables only held the seeded admin.
// They are removed so the new tables can be created ("npm run db:seed" creates the admin again).
async function removeOldPrismaTables(pool: Pool) {
  const { rows } = await pool.query("SELECT to_regclass('public._prisma_migrations') AS found");
  if (!rows[0].found) return;
  await pool.query('DROP TABLE IF EXISTS users; DROP TABLE _prisma_migrations; DROP TYPE IF EXISTS "Role";');
  console.log('Removed the old Prisma tables. Run "npm run db:seed" afterwards to create the admin again.');
}

function explain(error: unknown): string {
  const message = errorMessage(error);
  if (message.includes('postgis.control') || message.includes('extension "postgis" is not available')) {
    return (
      'PostGIS is not installed on your PostgreSQL server. Install it, then run "npm run db:migrate" again:\n' +
      '  • Mac, installer from postgresql.org: open "Application Stack Builder" → your server → Spatial Extensions → PostGIS\n' +
      '  • Mac, Postgres.app: PostGIS is included\n' +
      '  • Mac, Homebrew: brew install postgis\n' +
      '  • Windows: Stack Builder → Spatial Extensions → PostGIS\n' +
      '  • Docker: docker compose up -d (the image already has PostGIS)'
    );
  }
  if (message.includes('permission denied to create extension')) {
    return 'Your database user may not create extensions. Use the "postgres" user in DATABASE_URL, or run "CREATE EXTENSION postgis;" once in pgAdmin.';
  }
  return message;
}

async function main() {
  try {
    await createDatabaseIfMissing();
  } catch (error) {
    // Not fatal: the database may exist already and we may just lack access to "postgres"
    console.warn(`Could not check whether the database exists: ${error instanceof Error ? error.message : error}`);
  }

  const pool = new Pool({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 5_000 });
  try {
    await removeOldPrismaTables(pool);
    await migrate(drizzle(pool), { migrationsFolder: 'drizzle' });
    console.log('Database is up to date.');
  } catch (error) {
    console.error(`Migration failed: ${explain(error)}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();
