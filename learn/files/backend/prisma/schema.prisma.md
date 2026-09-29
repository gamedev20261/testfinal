# `backend/prisma/schema.prisma`

> Added in **patch 02** · [View the file](../../../../backend/prisma/schema.prisma) · Background: [Databases, SQL, Prisma](../../../concepts/databases.md)

## What it is for

The **single description of our database**: every table, column, and (later) the links
between tables. This file grows with almost every screen we build: Users tab → groups,
projects → projects and members, and so on.

When you change it:

```bash
npm run db:migrate    # 1. writes a new migration (SQL) and applies it to the database
                      # 2. regenerates the typed client in src/generated/prisma
```

## Piece by piece

### The generator

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}
```
"Generate a TypeScript client and put it in `backend/src/generated/prisma`." That folder is
**generated code**: never edit it, and it's in `.gitignore`. `npm install` recreates it
(the `postinstall` script runs `prisma generate`).

### The datasource

```prisma
datasource db {
  provider = "postgresql"
}
```
Which kind of database we use. *Where* it is (the URL) is in
[`prisma.config.ts`](../prisma.config.ts.md) and `.env`, so the address can change without
touching the schema.

### An enum

```prisma
enum Role {
  ADMIN
  ANNOTATOR
  AUDITOR
}
```
A fixed list of allowed values. PostgreSQL gets a real `Role` type, and TypeScript gets
`'ADMIN' | 'ANNOTATOR' | 'AUDITOR'`. Writing `role: 'ADMN'` is a type error, and the
database also refuses it.

These are our **three portals**: the role decides what a user sees after logging in.

### A model = a table

```prisma
model User {
  id           String   @id @default(uuid())
  name         String
  email        String   @unique // always stored in lowercase
  passwordHash String
  role         Role     @default(ANNOTATOR)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("users")
}
```

Each line is `columnName  Type  @attributes`:

| Column | Type | Attributes | Meaning |
|---|---|---|---|
| `id` | `String` | `@id @default(uuid())` | Primary key; Prisma fills in a random UUID when a user is created |
| `name` | `String` | | Required text (no `?` after the type → can't be empty/null) |
| `email` | `String` | `@unique` | No two users with the same email. We lowercase emails before saving, so `Admin@X.com` and `admin@x.com` can't both exist. |
| `passwordHash` | `String` | | **Never the password itself**, only its bcrypt hash (see [`password.ts`](../src/lib/password.ts.md)) |
| `role` | `Role` | `@default(ANNOTATOR)` | One of the enum values; a new user is an annotator unless told otherwise |
| `createdAt` | `DateTime` | `@default(now())` | Set automatically when the row is created |
| `updatedAt` | `DateTime` | `@updatedAt` | Prisma sets it automatically on every update |

`@@map("users")`: the model is called `User` in our code (singular, like a type), but the
table in PostgreSQL is called `users` (plural, the SQL habit). `@@` attributes apply to the
whole model; `@` attributes to one column.

A `?` after a type makes a column optional (nullable), e.g. `avatarUrl String?`.
We'll see it in later patches.

## How it becomes a table

`npm run db:migrate` turned this model into the SQL in
[`migrations/…_create_users/migration.sql`](migrations/20260929043050_create_users/migration.sql.md).
