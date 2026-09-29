import { prisma } from './prisma';
import { logger } from './logger';
import { env } from '../config/env';

// "postgresql://postgres:secret@localhost:5432/geoannotator" → "postgres@localhost:5432/geoannotator"
// (never print the password)
export function describeDatabase(url: string): string {
  const { username, hostname, port, pathname } = new URL(url);
  return `${username}@${hostname}:${port || '5432'}${pathname}`;
}

// Asks the database one tiny question. Returns null when it answers, otherwise the reason why not.
export async function findDatabaseProblem(): Promise<string | null> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return null;
  } catch (error) {
    // Prisma wraps the database's own message: "... Message: `password authentication failed ...`"
    const text = error instanceof Error ? error.message : String(error);
    return /Message: `(.+)`/.exec(text)?.[1] ?? text.trim().split('\n').at(-1) ?? text;
  }
}

// What to do about the most common problems
export function databaseFix(problem: string): string {
  if (problem.includes('password authentication failed')) {
    return 'The user or password in DATABASE_URL (backend/.env) is wrong. Use the password you type in pgAdmin (learn/local-postgres.md).';
  }
  if (/database ".*" does not exist/.test(problem)) {
    return 'The database is not created yet: run "npm run db:migrate".';
  }
  if (problem.includes("Can't reach database server") || problem.includes('timeout')) {
    return 'PostgreSQL is not running, or uses another port. Docker: "docker compose up -d". Windows: Win+R → services.msc → postgresql-x64-… → Start.';
  }
  return 'Check DATABASE_URL in backend/.env (learn/local-postgres.md).';
}

// Runs once at startup, so a wrong DATABASE_URL shows up in the terminal straight away
export async function checkDatabaseConnection() {
  const target = describeDatabase(env.DATABASE_URL);
  const problem = await findDatabaseProblem();
  if (!problem) {
    logger.info(`Database connected: ${target}`);
    return;
  }
  logger.error(
    `Cannot connect to the database ${target}\n` +
      `  Reason: ${problem}\n` +
      `  Fix: ${databaseFix(problem)}\n` +
      `  More help: run "npm run doctor"`,
  );
}
