# `backend/src/scripts/doctor.ts`

> Added after **patch 06** (setup help) · [View the code](../../../../../backend/src/scripts/doctor.ts) · Guide: [Troubleshooting](../../../../troubleshooting.md)

## What it is for

`npm run doctor` checks, **in order**, everything the app needs on your computer, and stops
at the first problem with a sentence telling you how to fix it:

| # | Checks | Typical fix |
|---|---|---|
| 1 | Node.js version | Install Node 22 LTS |
| 2 | Backend packages installed | `npm install` |
| 3 | `backend/.env` exists (and isn't `.env.txt`) | Copy `.env.example` |
| 4 | The settings inside are valid | Compare with `.env.example` |
| 5 | The database answers | Fix `DATABASE_URL`, start PostgreSQL |
| 6 | Every migration has run | `npm run db:migrate` |
| 7 | An admin account exists | `npm run db:seed` |
| 8 | Port 3001 is free (a warning only) | Stop the other program |
| 9 | Frontend packages installed | `npm install` in `frontend` |

The order matters: each check needs the previous ones (you can't look for tables without a
database connection), so it stops at the first failure.

## The code, piece by piece

### Three ways to report

```ts
let failed = false;

function ok(message: string) {
  console.log(`[ OK ] ${message}`);
}
function warn(message: string, advice: string) { … }
function fail(message: string, fix: string) {
  failed = true;
  console.log(`[FAIL] ${message}\n       Fix: ${fix}`);
}
```
Small helpers so every line looks the same. `[ OK ]`, `[WARN]`, `[FAIL]` are plain letters
rather than symbols like ✔, because some Windows terminals can't display those.

### Checks that don't need anything installed

```ts
  if (!isSupportedNode()) {
    fail(…);
    return;
  }
  ok(`Node.js ${process.version}`);
```
Each check follows the same pattern: test, on failure `fail(...)` and `return` (stop), on
success `ok(...)` and continue. `existsSync(path)` (from `node:fs`) answers "does this file
or folder exist?". It's how we check for `.env`, `.env.txt` and the generated Prisma client.

### Settings, without crashing

```ts
  process.loadEnvFile('.env');
  …
  const settings = envSchema.safeParse(process.env);
```
The server's [`env.ts`](../config/env.ts.md) stops the program when a setting is wrong.
The doctor wants to *report* instead, so it uses the same rules
([`env-schema.ts`](../config/env-schema.ts.md)) with `safeParse`, which returns the result
instead of throwing.

### Loading the database code only when it's safe

```ts
  const { describeDatabase, findDatabaseProblem, databaseFix } = await import('../lib/database-check');
  const { prisma } = await import('../lib/prisma');
```
`await import(...)` is a **dynamic import**: it loads a module in the middle of the
function instead of at the top of the file. Those modules read the settings as they load,
so we only load them after checks 3 and 4 have passed.

`try { … } finally { await prisma.$disconnect(); }` closes the database connections at
the end, whatever happened, so the script can exit.

### Which migrations are missing?

```ts
async function pendingMigrations(prisma: PrismaClient): Promise<string[]> {
  const folders = readdirSync('prisma/migrations', { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  type Row = { migration_name: string };
  const applied = await prisma.$queryRaw<Row[]>`
    SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL
  `.catch((): Row[] => []);
  const done = new Set(applied.map((row) => row.migration_name));
  return folders.filter((folder) => !done.has(folder));
}
```
- The migration folders in `prisma/migrations/` are the migrations that *should* have run.
- Prisma records every migration it ran in the `_prisma_migrations` table.
- Folders not in that table = migrations still to apply. After a `git pull` that brings a
  new migration, this tells you to run `npm run db:migrate`.
- `.catch((): Row[] => [])`: on a brand-new database the table doesn't exist yet, so the
  query fails, and "nothing applied" (an empty list) is the right answer. `type Row` names
  the shape of one result row, so both the query and the fallback have the same type.
- A `Set` is a list made for fast "is this in it?" questions (`done.has(folder)`).

### Is the port free?

```ts
function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(true));
    server.once('listening', () => server.close(() => resolve(false)));
    server.listen(port);
  });
}
```
The simplest honest test: try to open the port ourselves. If it fails, someone else has it;
if it works, close it again at once. `new Promise((resolve) => …)` turns this event-based
code into something we can `await`.

### The ending

```ts
main()
  .catch(…)
  .finally(() => {
    console.log(failed ? '…Fix the [FAIL] line above…' : '…All good!…');
    process.exitCode = failed ? 1 : 0;
  });
```
Exit code `1` on failure lets other tools (and later, automated checks) see that setup
isn't complete.
