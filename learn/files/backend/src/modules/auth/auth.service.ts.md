# `backend/src/modules/auth/auth.service.ts`

> Added in **patch 03** · [View the code](../../../../../../backend/src/modules/auth/auth.service.ts)

## What it is for

The **logic** of authentication, separate from HTTP. A *service* receives plain values
(an email, a password), talks to the database, applies the rules, and returns a result or
throws. It never touches `req` or `res`. That keeps it easy to read and to test.

```
auth.routes.ts   → reads the request, calls the service, sends the response
auth.service.ts  → decides (this file)
prisma           → stores
```

## The code, piece by piece

### `PublicUser`: what may leave the server

```ts
export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export const publicUserFields = { id: true, name: true, email: true, role: true } as const;
```
A database row contains `passwordHash`. It must **never** be sent to the browser, not even
the hash. `PublicUser` is the safe subset, and `publicUserFields` tells Prisma to read only
those columns (`select`).
- `Role` is the enum type Prisma generated from our schema: `'ADMIN' | 'ANNOTATOR' | 'AUDITOR'`.
- `as const` keeps the object's exact values (`true`, not just `boolean`), which Prisma
  needs to work out the result type.

### The dummy hash

```ts
const DUMMY_HASH = '$2b$12$fO7Kfnub1TksCy1cE4kid.iiWW/RGw.l76yNZYQZishxk5RNE3xo6';
```
A real bcrypt hash of random text nobody knows. See below for why.

### `login(email, password)`

```ts
export async function login(email: string, password: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { email } });
```
Look the user up by email: `null` if there's no such account.

```ts
  const passwordOk = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
```
Check the password against the user's hash, **or against the dummy hash if the user
doesn't exist**. Why bother checking a password for a user that doesn't exist?

bcrypt takes ~250 ms. If we skipped it for unknown emails, "unknown email" would answer in
5 ms and "wrong password" in 250 ms. An attacker could time the answers and learn which
emails have accounts. With the dummy hash, both take the same time. (Try it in Postman:
compare the times of the two failing login requests.)

`user?.passwordHash` → `undefined` when `user` is `null` (instead of crashing), and
`?? DUMMY_HASH` replaces `undefined` with the dummy.

```ts
  if (!user || !passwordOk) {
    throw new HttpError(401, 'Invalid email or password');
  }
```
`!` means "not", `||` means "or". Wrong email **or** wrong password → the same `401` with
the same message. Never say "this email doesn't exist": it tells attackers which
accounts to target.

```ts
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
```
Return only the public fields; `passwordHash` stays behind.

### `findPublicUser(id)`

```ts
export function findPublicUser(id: string): Promise<PublicUser | null> {
  return prisma.user.findUnique({ where: { id }, select: publicUserFields });
}
```
Used by [`requireAuth`](../../middleware/require-auth.ts.md) on every protected request:
"which user is behind this session?". The SQL is `SELECT id, name, email, role FROM users
WHERE id = $1`; the password hash is not even read.
