# `backend/src/modules/health/health.routes.ts`

> Added in **patch 02** · [View the code](../../../../../../backend/src/modules/health/health.routes.ts)

## What it is for

The health check moved out of `app.ts` into its own **module** folder, and it now also
checks the database. This is the layout every feature will follow:

```
src/modules/
├── health/
│   └── health.routes.ts
└── auth/                  ← patch 03
    ├── auth.routes.ts     ← URLs and thin handlers
    ├── auth.service.ts    ← the real work (database, rules)
    └── auth.schemas.ts    ← what request bodies must look like
```

Health is so small that it only needs the routes file.

## The code, piece by piece

```ts
export const healthRouter = Router();
```
A **router** is a mini-app that only holds routes. Each feature creates its own, and
[`app.ts`](../../app.ts.md) mounts it under a path:

```ts
app.use('/api/health', healthRouter);
```

Inside the router, paths are **relative** to where it's mounted. So `'/'` here means
`/api/health`, and later `'/login'` in the auth router means `/api/auth/login`.

```ts
healthRouter.get('/', async (_req, res) => {
```
The handler is `async` because it waits for the database. Express 5 understands async
handlers: if one throws an error, Express catches it (patch 03 shows what happens then).

```ts
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'ok', time });
  } catch {
    res.status(503).json({ status: 'error', database: 'unreachable', time });
  }
```
- `prisma.$queryRaw` runs raw SQL. `SELECT 1` asks the database to answer with the
  number 1: the cheapest possible question. If it answers, the connection works.
- If the database is stopped or unreachable, the query throws, and we answer
  **`503 Service Unavailable`**: "I'm running, but I can't do my job right now."

## Try it

With the backend running, stop the database (`docker compose stop db`) and call
`GET /api/health`: you get `503`. Start it again (`docker compose start db`) and call it
again: `200`. Prisma reconnects on its own.
