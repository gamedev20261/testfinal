# `backend/prisma/seed.ts`

> Added in **patch 02** · [View the code](../../../../backend/prisma/seed.ts)

## What it is for

**Seeding** = putting the first data into an empty database. Our app has a
chicken-and-egg problem: only an admin can create users, but the empty database has no
admin. This script creates the first one, from the `ADMIN_*` settings in `.env`.

```bash
npm run db:seed    # → "Created admin admin@example.com"
npm run db:seed    # → "Admin admin@example.com already exists. Nothing to do."
```

Running it twice is safe: this property is called **idempotent**.

> The original app had a *Register* page where the very first visitor became the admin.
> A seed script is simpler, and there's no window where a stranger could register first.

## The code, piece by piece

### 1. Imports

```ts
import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/password';
```
The seed reuses the backend's database client and password hashing. Importing `prisma`
also runs [`env.ts`](../src/config/env.ts.md), which loads `.env`, so `process.env.ADMIN_*`
are available below.

### 2. Check the settings

```ts
const adminSchema = z.object({
  ADMIN_NAME: z.string().min(1).default('Administrator'),
  ADMIN_EMAIL: z.email(),
  ADMIN_PASSWORD: z.string().min(8, 'must be at least 8 characters'),
});
```
The same Zod pattern as `env.ts`. The admin password must be at least 8 characters, and
the email must look like an email. If not, the script stops with a readable message.

### 3. `main()`: the work

```ts
async function main() {
  ...
  const email = settings.ADMIN_EMAIL.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin ${email} already exists. Nothing to do.`);
    return;
  }
```
- `toLowerCase()`: we always store emails in lowercase (see the schema).
- `prisma.user.findUnique({ where: { email } })` → SQL `SELECT … FROM users WHERE email = $1`.
  `findUnique` only works on `@id` or `@unique` columns and returns the row or `null`.
- `{ email }` is shorthand for `{ email: email }`.
- If the admin exists, `return` ends `main()` early.

```ts
  await prisma.user.create({
    data: {
      name: settings.ADMIN_NAME,
      email,
      passwordHash: await hashPassword(settings.ADMIN_PASSWORD),
      role: 'ADMIN',
    },
  });
```
`prisma.user.create({ data })` → SQL `INSERT INTO users …`. We give it every required
column except `id`, `createdAt` and `updatedAt`, which Prisma fills in. The password is
**hashed** before it is saved.

### 4. Run it, and always disconnect

```ts
main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
```
- `.catch(...)` runs if anything inside `main()` threw an error: print it and mark the
  script as failed (exit code 1).
- `.finally(...)` runs in both cases: close the database connections, otherwise Node
  would keep waiting on them and the script would never end.

## Try it

1. Open Prisma Studio (`npm run db:studio`), delete the admin row, run `npm run db:seed` again.
2. Set `ADMIN_PASSWORD=short` in `.env` and run the seed. Read the error, then change it back.
