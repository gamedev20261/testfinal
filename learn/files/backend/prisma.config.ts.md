# `backend/prisma.config.ts`

> Added in **patch 02** · [View the code](../../../backend/prisma.config.ts) · Background: [Prisma](../../concepts/databases.md#3-prisma-sql-from-typescript)

## What it is for

Settings for the **Prisma command-line tool** (`npx prisma …`, and our `npm run db:*`
scripts): where the schema is, where migrations go, how to seed, and which database to use.

It is *not* used by the running backend. The backend connects through
[`src/lib/prisma.ts`](src/lib/prisma.ts.md).

## The code

```ts
try {
  process.loadEnvFile();
} catch {
  // no .env file
}
```
Same trick as in [`env.ts`](src/config/env.ts.md): load `backend/.env` so that
`process.env.DATABASE_URL` is filled in. The Prisma tool doesn't do this by itself.

Why not simply import `src/config/env.ts`? Because that file *stops the program* when a
setting is missing, and `npm install` runs `prisma generate`, which must work even before
you have created `.env`.

```ts
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
```

| Setting | Meaning |
|---|---|
| `schema` | The file that describes our tables |
| `migrations.path` | Where `prisma migrate dev` writes the SQL files |
| `migrations.seed` | The command `prisma db seed` runs (our `npm run db:seed`) |
| `datasource.url` | The database the tool connects to for migrations and Studio |

`defineConfig(...)` does nothing at runtime; it only gives the editor types, so it can
autocomplete and check these settings.
