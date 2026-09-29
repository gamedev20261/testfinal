# `backend/src/lib/logger.ts`

> Added in **patch 01** · [View the code](../../../../../backend/src/lib/logger.ts)

## What it is for

Creates **one logger** that the whole backend uses to print messages, like
`logger.info('API ready')` or `logger.error(err, 'Something failed')`.

Why not just `console.log`? A logger adds a **time** and a **level** to every line, and
lets you choose how much to see:

| Level | Use it for |
|---|---|
| `logger.debug(...)` | Detailed information, useful only while hunting a bug |
| `logger.info(...)` | Normal events: server started, request handled |
| `logger.warn(...)` | Something odd that the server survived |
| `logger.error(...)` | Something failed |

With `LOG_LEVEL=info` in `.env`, `debug` lines are hidden; `info`, `warn` and `error` show.

## The code

```ts
export const logger = pino({
  level: env.LOG_LEVEL,
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
      },
});
```

- `pino(...)` creates the logger. **pino** is one of the fastest Node loggers.
- `level` comes from our checked settings in [`env.ts`](../config/env.ts.md).
- `condition ? a : b` is the **ternary operator**: "if `condition`, use `a`, else `b`".
  - In **production**, pino writes one JSON object per line. Machines (log collectors)
    read that easily.
  - In **development**, the `pino-pretty` transport turns each line into coloured text:
    `[04:23:48] INFO: GET /api/health → 200 (3 ms)`.
    `ignore: 'pid,hostname'` hides two fields we don't need locally.

## Where it is used

- [`server.ts`](../server.ts.md) logs "API ready".
- [`request-logger.ts`](../middleware/request-logger.ts.md) logs every request.
- From patch 03, the error handler logs server errors with `logger.error`.
