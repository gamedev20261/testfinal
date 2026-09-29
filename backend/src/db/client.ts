import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../config/env';
import * as schema from './schema';

// A pool of open connections to PostgreSQL, shared by the whole backend
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  connectionTimeoutMillis: 5_000, // give up if the database can't be reached within 5 s
});

// The query builder: db.select().from(users)…  camelCase names in code = snake_case in SQL
export const db = drizzle(pool, { schema, casing: 'snake_case' });

export type Db = typeof db;
