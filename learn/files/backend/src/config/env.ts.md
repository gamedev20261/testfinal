# `backend/src/config/env.ts`

> Added in **patch 01** · [View the code](../../../../../backend/src/config/env.ts)

## What it is for

Reads the settings from `backend/.env`, **checks them**, and exports them as one typed
object called `env`. Every other file imports settings from here and never reads
`process.env` directly.

Why? `process.env` values are always plain text and may be missing or misspelled.
Checking them once, at startup, means that if something is wrong the server refuses to
start *with a clear message*, instead of failing mysteriously an hour later.

## The code, piece by piece

### 1. Load the `.env` file

```ts
try {
  process.loadEnvFile();
} catch {
  // no .env file
}
```

`process.env` is a built-in Node object holding the *environment variables* of the
running program. `process.loadEnvFile()` (built into Node 22) reads the `.env` file in the
current folder and copies each `NAME=value` line into `process.env`.

`try { … } catch { … }` means: *try this; if it throws an error, run the catch block
instead of crashing*. On a real server there is often no `.env` file (variables are set by
the hosting system), and that is fine.

> A variable that already exists (set in the terminal, e.g. `PORT=4000 npm run dev`)
> is **not** overwritten by the file. That lets you override a setting for one run.

### 2. Describe the settings with Zod

```ts
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});
```

**Zod** lets us describe what data should look like: a *schema*. Read each line as a sentence:

- `NODE_ENV` must be one of three words; if missing, use `'development'`.
- `PORT`: `z.coerce.number()` converts the text `"3001"` into the number `3001`,
  then it must be a whole (`int`) positive number; default `3001`.
- `LOG_LEVEL` must be one of four words; default `'info'`.

We will use Zod the same way to check what users send to the API.

### 3. Check, and stop if wrong

```ts
const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Invalid settings in backend/.env:\n' + z.prettifyError(result.error));
  process.exit(1);
}
```

`safeParse` never throws; it returns either `{ success: true, data }` or
`{ success: false, error }`. On failure we print a readable list of the problems and stop
the program. `process.exit(1)`: exit code `1` means "ended with an error".

Try it: `PORT=abc npm run dev` prints

```
Invalid settings in backend/.env:
✖ Invalid input: expected number, received NaN
  → at PORT
```

### 4. Export the result

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
