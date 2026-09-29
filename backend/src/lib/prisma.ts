import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { env } from '../config/env';

// Prisma talks to PostgreSQL through the "pg" driver, plugged in as an adapter
const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  connectionTimeoutMillis: 5_000, // give up if the database can't be reached within 5 s
});

// One shared client for the whole backend. It keeps a pool of open connections.
export const prisma = new PrismaClient({ adapter });
