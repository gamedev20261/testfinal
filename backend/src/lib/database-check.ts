import { prisma } from './prisma';
import { logger } from './logger';
import { env } from '../config/env';

// "postgresql://postgres:secret@localhost:5432/geoannotator" → "postgres@localhost:5432/geoannotator"
// (never print the password)
function describeDatabase(url: string): string {
  const { username, hostname, port, pathname } = new URL(url);
  return `${username}@${hostname}:${port || '5432'}${pathname}`;
}

// Runs once at startup, so a wrong DATABASE_URL shows up in the terminal straight away
export async function checkDatabaseConnection() {
  const target = describeDatabase(env.DATABASE_URL);
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info(`Database connected: ${target}`);
  } catch (error) {
    // Prisma wraps the database's own message: "... Message: `password authentication failed ...`"
    const text = error instanceof Error ? error.message : String(error);
    const reason = /Message: `(.+)`/.exec(text)?.[1] ?? text.trim().split('\n').at(-1);
    logger.error(
      `Cannot connect to the database ${target}\n` +
        `  Reason: ${reason}\n` +
        `  Fix: check DATABASE_URL in backend/.env (see learn/local-postgres.md)`,
    );
  }
}
