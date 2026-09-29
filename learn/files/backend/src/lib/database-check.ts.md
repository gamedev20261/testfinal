# `backend/src/lib/database-check.ts`

> Added after **patch 06** (fix: clearer database errors) · [View the code](../../../../../backend/src/lib/database-check.ts) · Guide: [Database without Docker](../../../../local-postgres.md)

## What it is for

When the backend starts, it asks the database one tiny question and prints the result.
Without it, a wrong `DATABASE_URL` stayed silent: the server said *API ready* and only
failed later, on the first login. Now the terminal says right away:

```
INFO:  API ready on http://localhost:3001
INFO:  Database connected: postgres@localhost:5432/geoannotator
```
or, when something is wrong:
```
ERROR: Cannot connect to the database postgres@localhost:5432/geoannotator
  Reason: password authentication failed for user "postgres"
  Fix: check DATABASE_URL in backend/.env (see learn/local-postgres.md)
```

## The code, piece by piece

### Describe the database without the password

```ts
function describeDatabase(url: string): string {
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

### Ask, and report

```ts
export async function checkDatabaseConnection() {
  const target = describeDatabase(env.DATABASE_URL);
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info(`Database connected: ${target}`);
  } catch (error) {
```
The same `SELECT 1` as the [health check](../modules/health/health.routes.ts.md): the
cheapest possible question.

```ts
    const text = error instanceof Error ? error.message : String(error);
    const reason = /Message: `(.+)`/.exec(text)?.[1] ?? text.trim().split('\n').at(-1);
```
Prisma wraps PostgreSQL's own explanation in a longer message:

```
Raw query failed. Code: `28P01`. Message: `password authentication failed for user "postgres"`
```

The **regular expression** `/Message: `(.+)`/` finds the text between the backticks after
`Message:`, and `.exec(text)?.[1]` returns just that part (the *group* in parentheses).
If the pattern isn't found, we use the last line of the message instead.

| Situation | Reason printed |
|---|---|
| Wrong password or user | `password authentication failed for user "postgres"` |
| Database not created yet | `database "geoannotator" does not exist` |
| PostgreSQL not running / wrong port | `Can't reach database server at 127.0.0.1:5432` |

```ts
    logger.error(
      `Cannot connect to the database ${target}\n` +
        `  Reason: ${reason}\n` +
        `  Fix: check DATABASE_URL in backend/.env (see learn/local-postgres.md)`,
    );
```
We only **log**; the server keeps running. The database might just be starting up, and
the health check keeps reporting `503` until it's reachable. Every request still gets the
normal error handling.
