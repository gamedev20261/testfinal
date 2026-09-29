# `backend/src/modules/auth/auth.schemas.ts`

> Added in **patch 03** · [View the code](../../../../../../backend/src/modules/auth/auth.schemas.ts)

## What it is for

Describes what a valid **login request body** looks like. The route checks every request
against it before doing anything else:

```ts
const { email, password } = loginSchema.parse(req.body);
```

If the body is wrong, `parse` throws, the [error handler](../../middleware/error-handler.ts.md)
answers `400`, and the service never runs. So inside the service we can be sure `email`
is a real, trimmed, lowercase email address.

> **Rule:** never trust data from the browser. Anyone can send anything to an API
> (Postman proves it). Always check it on the server.

## The code, piece by piece

```ts
export const loginSchema = z.object(
  { email: …, password: … },
  { error: 'Send the email and password as JSON' },
);
```
The body must be an object with those two fields. The second argument sets the message for
when the body isn't an object at all, e.g. a request sent without
`Content-Type: application/json`.

### email

```ts
    email: z
      .string({ error: 'Enter your email' })
      .trim()
      .toLowerCase()
      .pipe(z.email('Enter a valid email address')),
```
Read it top to bottom; each step works on the result of the previous one:
1. Must be a string. If it's missing or not text: "Enter your email".
2. `.trim()` removes spaces at the start and end: `"  Admin@Example.com "` → `"Admin@Example.com"`.
3. `.toLowerCase()` → `"admin@example.com"`. Emails are stored in lowercase, so the lookup must use lowercase too.
4. `.pipe(z.email(…))` passes the cleaned value to a second schema that checks it looks
   like an email.

Why `.pipe` and not simply `z.email().trim()`? Because Zod would check the email format
*before* trimming, and `" admin@example.com"` with a space would be rejected. `pipe` makes
the order explicit: clean first, then check.

### password

```ts
    password: z.string({ error: 'Enter your password' }).min(1, 'Enter your password'),
```
Must be text, at least 1 character. We don't check password *rules* (length, digits…) at
login, only when a password is created. An old password that predates a new rule must
still be able to log in.

## What the API answers

| Body sent | Status | `error` |
|---|---|---|
| (nothing / not JSON) | 400 | Send the email and password as JSON |
| `{}` | 400 | Enter your email (and `issues` lists both fields) |
| `{"email":"nope","password":"x"}` | 400 | Enter a valid email address |
| `{"email":" Admin@Example.com ","password":"…"}` | → passes, email becomes `admin@example.com` | |
