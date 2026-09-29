import { defineConfig } from 'drizzle-kit';

// Settings for the drizzle-kit tool (`npm run db:generate`, `npm run db:studio`)
try {
  process.loadEnvFile('.env');
} catch {
  // no .env file
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './drizzle', // migration SQL files
  casing: 'snake_case',
  extensionsFilters: ['postgis'], // ignore PostGIS's own tables
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
