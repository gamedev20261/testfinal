# `backend/src/config/env.ts`

> Added in **patch 01** · Changed in **patch 02** (`DATABASE_URL`), **patch 03** (`JWT_SECRET`, `SESSION_HOURS`), after **patch 06** (Node.js check, rules moved to `env-schema.ts`) · [View the code](../../../../../backend/src/config/env.ts)

## What it is for

Reads the settings from `backend/.env`, **checks them**, and exports them as one typed
object called `env`. Every other file imports settings from here and never reads
`process.env` directly.

Why? `process.env` values are always plain text and may be missing or misspelled.
Checking them once, at startup, means that if something is wrong the server refuses to
start *with a clear message*, instead of failing mysteriously an hour later.

## The code, piece by piece

### 1. Is Node.js new enough?

```ts
if (!isSupportedNode()) {
  console.error(`Node.js ${NODE_REQUIREMENT} is required, but this is ${process.version}.`);
  console.error('Install Node.js 22 LTS from https://nodejs.org, then run "npm install" again.');
  process.exit(1);
}
```
Checked first, because an old Node.js fails later in confusing ways (inside Prisma, or
because `process.loadEnvFile` doesn't exist yet). The rule is in
[`node-version.ts`](node-version.ts.md). `process.exit(1)` ends the program; exit code `1`
means "ended with an error".

### 2. Load the `.env` file

```ts
const envFileFound = existsSync('.env');
if (envFileFound) {
  process.loadEnvFile('.env');
}
```

- `existsSync('.env')` (from Node's `node:fs` module) answers "is there a file called
  `.env` in the current folder?". `npm run dev` always runs in the `backend` folder.
- `process.env` is a built-in Node object holding the *environment variables* of the
  running program. `process.loadEnvFile('.env')` reads the file and copies each
  `NAME=value` line into it.
- A missing file is allowed: on a real server there's often no `.env` file (the hosting
  system sets the variables), and that's fine. We remember whether the file was found, to
  give a better hint below.

> A variable that already exists (set in the terminal, e.g. `PORT=4000 npm run dev`)
> is **not** overwritten by the file. That lets you override a setting for one run.

### 3. Check the settings with Zod

```ts
const result = envSchema.safeParse(process.env);
```

The rules themselves live in [`env-schema.ts`](env-schema.ts.md), so `npm run doctor` can
use them too. **Zod** lets us describe what data should look like: a *schema*. Read each
rule as a sentence:

```ts
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32, 'must be at least 32 characters long'),
  SESSION_HOURS: z.coerce.number().positive().default(24),
```

- `NODE_ENV` must be one of three words; if missing, use `'development'`.
- `PORT`: `z.coerce.number()` converts the text `"3001"` into the number `3001`,
  then it must be a whole (`int`) positive number; default `3001`.
- `LOG_LEVEL` must be one of four words; default `'info'`.
- `DATABASE_URL` (patch 02) must be a valid URL. It has **no default**: without it, the
  server can't work, so a missing value stops it at startup.
- `JWT_SECRET` (patch 03) must be at least 32 characters. A short secret could be guessed
  by trying every possibility, and then anyone could forge a login. No default, on purpose.
- `SESSION_HOURS` (patch 03): how long a login lasts; default 24.

`safeParse` never throws; it returns either `{ success: true, data }` or
`{ success: false, error }`.

### 4. Stop if something is wrong

```ts
if (!result.success) {
  const hint = envFileFound ? '' : '\n\nbackend/.env was not found. Copy backend/.env.example to backend/.env and edit it.';
  console.error('Invalid settings in backend/.env:\n' + z.prettifyError(result.error) + hint);
  console.error('\nRun "npm run doctor" for step-by-step help.');
  process.exit(1);
}
```

Print a readable list of the problems and stop. If the file itself was missing (the most
common reason after cloning the project), say so. Try it: `PORT=abc npm run dev` prints

```
Invalid settings in backend/.env:
✖ Invalid input: expected number, received NaN
  → at PORT
```

### 5. Export the result

```ts
export const env = result.data;
export const isProduction = env.NODE_ENV === 'production';
```

`result.data` is the checked and converted settings. TypeScript knows its exact type:
`env.PORT` is a `number`, `env.LOG_LEVEL` is one of the four words. The editor even
autocompletes them.

## Words to know

- **Environment variable**: a named setting given to a program from outside its code.
- **Schema**: a description of the expected shape of some data.
- **Validation**: checking data against a schema.
