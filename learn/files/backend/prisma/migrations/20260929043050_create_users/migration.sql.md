# `backend/prisma/migrations/20260929043050_create_users/migration.sql`

> Added in **patch 02** · [View the file](../../../../../../backend/prisma/migrations/20260929043050_create_users/migration.sql)

## What it is for

The SQL that Prisma **wrote for us** from the `User` model in
[`schema.prisma`](../../schema.prisma.md). Running it creates the `users` table.

The folder name is `<date and time>_<name>`: `20260929043050` = 2026-09-29 04:30:50, and
`create_users` is the name given with `--name create_users`. The timestamp keeps
migrations in the order they were made.

## The SQL, piece by piece

```sql
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ANNOTATOR', 'AUDITOR');
```
Creates the enum type, so the `role` column only accepts these three words.

```sql
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ANNOTATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
```
- `TEXT`: text of any length. `TIMESTAMP(3)`: a date and time, to the millisecond.
- `NOT NULL`: the column must have a value.
- `DEFAULT …`: the value used when none is given.
- `PRIMARY KEY ("id")`: `id` identifies each row and must be unique.
- Names are in `"double quotes"` because they contain capital letters (`passwordHash`).
  Without quotes, PostgreSQL would turn them into lowercase.

Notice what's *not* here: the UUID for `id` and the automatic `updatedAt` are filled in by
Prisma in our code, not by the database.

```sql
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
```
An **index** is like the index at the back of a book: it lets the database find a row by
email without reading the whole table. A **unique** index also refuses a second row with
the same email. Login looks users up by email, so this index makes it fast.

## Rules for migrations

- **Commit them** to git. They are the history of the database.
- **Never edit** a migration that has already run. To change something, edit
  `schema.prisma` and run `npm run db:migrate` again: Prisma writes a *new* migration.
- On a fresh computer, `npm run db:migrate` runs all of them in order, building the same
  database step by step.

Prisma remembers which migrations already ran in a table called `_prisma_migrations`
(you'll see it in Prisma Studio).

Next to the migration folders, `prisma/migrations/migration_lock.toml` records which kind
of database the migrations were written for (`provider = "postgresql"`). Prisma creates it;
commit it and leave it alone.
