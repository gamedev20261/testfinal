# `backend/src/lib/database-check.ts`

> Added after **patch 06** (clearer database errors) · [View the code](../../../../../backend/src/lib/database-check.ts) · Guides: [Database without Docker](../../../../local-postgres.md), [Troubleshooting](../../../../troubleshooting.md)

## What it is for

Tells you, in plain words, whether the backend can reach the database, and if not, why and
what to do. Without it, a wrong `DATABASE_URL` stayed silent: the server said *API ready*
and only failed later, on the first login. Now, when the server starts, the terminal says:

```
INFO:  API ready on http://localhost:3001
INFO:  Database connected: postgres@localhost:5432/geoannotator
```
or, when something is wrong:
```
ERROR: Cannot connect to the database postgres@localhost:5432/geoannotator
  Reason: password authentication failed for user "postgres"
  Fix: The user or password in DATABASE_URL (backend/.env) is wrong. Use the password you type in pgAdmin (learn/local-postgres.md).
  More help: run "npm run doctor"
```

| Function | Does | Used by |
|---|---|---|
| `describeDatabase(url)` | `user@host:port/database`, without the password | both below, and the doctor |
| `findDatabaseProblem()` | `null` if the database answers, otherwise the reason | the startup check, the doctor |
| `databaseFix(problem)` | A next step for the common problems | the startup check, the doctor |
| `checkDatabaseConnection()` | Runs the check once and logs the result | [`server.ts`](../server.ts.md) |

## The code, piece by piece

### Describe the database without the password

```ts
export function describeDatabase(url: string): string {
  const { username, hostname, port, pathname } = new URL(url);
  return `${username}@${hostname}:${port || '5432'}${pathname}`;
}
```
`new URL(text)` is built into Node (and browsers). It splits a URL into its parts:
`username`, `password`, `hostname`, `port`, `pathname`…
We rebuild a short description from every part **except the password**, because logs are
often copied into chats and bug reports.
- `const { a, b } = object` is destructuring: take those properties into variables.
- `port || '5432'`: the port is an empty string when the URL doesn't write one, so fall back
  to PostgreSQL's default.

Seeing the parts also reveals mistakes. With a password like `Pak@12#3` written without
encoding, the URL is misread and the message shows a strange host: `symtest@12:5432`.

### Ask the database

```ts
export async function findDatabaseProblem(): Promise<string | null> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return null;
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    return /Message: `(.+)`/.exec(text)?.[1] ?? text.trim().split('\n').at(-1) ?? text;
  }
}
```
The same `SELECT 1` as the [health check](../modules/health/health.routes.ts.md): the
cheapest possible question. `null` means "no problem".

Prisma wraps PostgreSQL's own explanation in a longer message:

```
Raw query failed. Code: `28P01`. Message: `password authentication failed for user "postgres"`
```

The **regular expression** `/Message: `(.+)`/` finds the text between the backticks after
`Message:`, and `.exec(text)?.[1]` returns just that part (the *group* in parentheses).
If the pattern isn't found, we use the last line of the message instead.

### Turn the reason into advice

```ts
export function databaseFix(problem: string): string {
  if (problem.includes('password authentication failed')) { return 'The user or password …'; }
  if (/database ".*" does not exist/.test(problem)) { return '… run "npm run db:migrate".'; }
  if (problem.includes("Can't reach database server") || problem.includes('timeout')) { return 'PostgreSQL is not running …'; }
  return 'Check DATABASE_URL in backend/.env (learn/local-postgres.md).';
}
```

| Reason from PostgreSQL | Advice |
|---|---|
| `password authentication failed for user "postgres"` | Fix the user or password in `DATABASE_URL` |
| `database "geoannotator" does not exist` | Run `npm run db:migrate` (it creates the database) |
| `Can't reach database server at 127.0.0.1:5432` | Start PostgreSQL / check the port |
| anything else | Check `DATABASE_URL` |

### Log it at startup

```ts
export async function checkDatabaseConnection() {
  const target = describeDatabase(env.DATABASE_URL);
  const problem = await findDatabaseProblem();
  if (!problem) {
    logger.info(`Database connected: ${target}`);
    return;
  }
  logger.error(`Cannot connect to the database ${target}\n  Reason: …\n  Fix: …\n  More help: run "npm run doctor"`);
}
```
We only **log**; the server keeps running. The database might just be starting up, and
the health check keeps reporting `503` until it's reachable.
