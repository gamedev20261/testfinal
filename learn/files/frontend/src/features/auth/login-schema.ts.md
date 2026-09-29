# `frontend/src/features/auth/login-schema.ts`

> Added in **patch 05** · [View the code](../../../../../../frontend/src/features/auth/login-schema.ts) · Background: [Forms → validation twice](../../../../../concepts/forms.md#4-validation-happens-twice-on-purpose)

## What it is for

The **rules of the login form**, checked in the browser before anything is sent. It uses
Zod, like the backend's [`auth.schemas.ts`](../../../../backend/src/modules/auth/auth.schemas.ts.md),
with the same messages.

## The code

```ts
export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email').pipe(z.email('Enter a valid email address')),
  password: z.string().min(1, 'Enter your password'),
});
```

Read the email rule left to right:
1. It's text; remove spaces at both ends.
2. If nothing is left: **"Enter your email"**, and stop.
3. Otherwise it must look like an email: **"Enter a valid email address"**.

`pipe` runs the second check only if the first part passed, so an empty field says "Enter
your email" rather than the confusing "Enter a valid email address".

| Typed | Message |
|---|---|
| *(nothing)* or spaces | Enter your email |
| `abc` | Enter a valid email address |
| ` admin@example.com ` | ✔ (sent as `admin@example.com`) |

Password: at least one character, "Enter your password". No other rules at login.

```ts
export type LoginValues = z.infer<typeof loginSchema>;
```
`z.infer` **creates a TypeScript type from the schema**:
`{ email: string; password: string }`. We describe the data once, and get both the
runtime check and the type. If we add a field to the schema, the type follows.

## Why not import the backend's schema?

The frontend and backend are separate projects, and the backend also lowercases the email
(a storage rule the form doesn't need to know about). A few duplicated lines are simpler
than a shared package at this stage.
