# `backend/src/lib/prisma.ts`

> Added in **patch 02** · [View the code](../../../../../backend/src/lib/prisma.ts) · Background: [Prisma](../../../../concepts/databases.md#3-prisma-sql-from-typescript)

## What it is for

Creates the **one database client** that the whole backend shares. Any file that needs the
database does:

```ts
import { prisma } from '../lib/prisma';
const user = await prisma.user.findUnique({ where: { email } });
```

## The code

```ts
import { PrismaClient } from '../generated/prisma/client';
```
`PrismaClient` comes from the code Prisma **generated** from our schema. That's why it
knows about `prisma.user` and the exact columns of a user. If this import is underlined in
red, run `npx prisma generate` (or `npm install`).

```ts
const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  connectionTimeoutMillis: 5_000,
});
```
Prisma doesn't speak to PostgreSQL itself. It uses **`pg`**, the standard Node driver for
PostgreSQL, plugged in as an **adapter**.
- `connectionString`: the database URL, from our checked settings.
- `connectionTimeoutMillis: 5_000`: if the database doesn't answer within 5 seconds, fail
  instead of waiting forever. (`5_000` is just `5000`; the underscore makes it easier to read.)

```ts
export const prisma = new PrismaClient({ adapter });
```
Creating a client is expensive: it opens a **pool** of connections to the database and
reuses them for every query. That's why we create it **once**, here, and every file imports
this same object.

The connections open lazily: nothing happens until the first query.
