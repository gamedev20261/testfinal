# `backend/src/config/env-schema.ts`

> Added after **patch 06** (moved out of `env.ts`) · [View the code](../../../../../backend/src/config/env-schema.ts)

## What it is for

The **rules for the settings** in `backend/.env`: which settings exist, their types and
their defaults. Two files use it:

| File | What it does with the rules |
|---|---|
| [`env.ts`](env.ts.md) | When the server starts: checks the settings and **stops** if one is wrong |
| [`scripts/doctor.ts`](../scripts/doctor.ts.md) | `npm run doctor`: checks the settings and **reports** what's wrong |

The rules used to live inside `env.ts`. But importing `env.ts` also runs its check, which
can stop the program, and the doctor must keep going to explain the problem. So the rules
moved to their own file, which only *describes* and never runs anything.

## The code

```ts
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32, 'must be at least 32 characters long'),
  SESSION_HOURS: z.coerce.number().positive().default(24),
});
```

Each line is explained in [`env.ts`](env.ts.md#3-check-the-settings-with-zod).
When a patch needs a new setting, it's added here (and to `.env.example`).
