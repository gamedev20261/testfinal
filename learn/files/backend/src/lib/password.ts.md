# `backend/src/lib/password.ts`

> Added in **patch 02** · [View the code](../../../../../backend/src/lib/password.ts)

## What it is for

Two small functions to **store** and **check** passwords safely:

```ts
const hash = await hashPassword('ChangeMe123!');   // when creating a user
const ok = await verifyPassword('ChangeMe123!', hash);   // when logging in → true
```

## Why we never store passwords

If the database ever leaked, stored passwords would expose every user, and people reuse
passwords on other sites. So we store a **hash** instead.

A **hash function** turns input into a fixed-looking string, and it only works one way:

```
"ChangeMe123!"  ──hash──▶  "$2b$12$F6WqvTrM2q5pG…"     ✅ easy
"$2b$12$F6Wq…"  ──────▶  "ChangeMe123!"               ❌ impossible
```

To check a login, we hash what the user typed and compare it with the stored hash.

### Salt: why the same password gives different hashes

bcrypt adds a random **salt** to each password before hashing, and stores it inside the
result. Two users with the password `123456` get completely different hashes, so an
attacker can't use a pre-computed list of "password → hash" pairs.

### Cost: why slow is good

`COST = 12` means bcrypt repeats its work 2¹² = 4,096 times. One hash takes about a quarter
of a second: unnoticeable for one login, but an attacker trying billions of guesses is
slowed to a crawl. Each +1 doubles the time.

### Reading a bcrypt hash

```
$2b$12$F6WqvTrM2q5pG8Yx1kLq0uJ3Q…
 │   │  └─ 22 chars of salt, then 31 chars of the actual hash
 │   └──── cost (12)
 └──────── bcrypt version
```

## The code

```ts
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

Both return a **Promise** (the work takes time), so callers use `await`.
`bcrypt.compare` reads the salt and cost from the stored hash, hashes `plain` the same way,
and compares the results.

We use **bcryptjs**, written in pure JavaScript, so `npm install` works on every computer
without compiling anything.
