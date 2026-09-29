# `backend/src/lib/http-error.ts`

> Added in **patch 03** · [View the code](../../../../../backend/src/lib/http-error.ts)

## What it is for

A way to say **"stop, and answer with this status code"** from anywhere in the backend,
even deep inside a service function that has no access to `res`:

```ts
throw new HttpError(401, 'Invalid email or password');
throw new HttpError(403, 'Only admins can do this');
throw new HttpError(404, 'Project not found');
```

The error travels up until Express catches it and hands it to the
[error handler](../middleware/error-handler.ts.md), which answers
`401 { "error": "Invalid email or password" }`.

## The code

```ts
export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
```

- A **class** is a blueprint for objects. `new HttpError(404, 'Not found')` creates one.
- `extends Error`: an `HttpError` *is* an `Error` (it has a `message` and a stack trace),
  plus one extra property, `status`.
- The `constructor` runs on `new`. `super(message)` runs `Error`'s own constructor, which
  stores the message; then we store the status.

## Why throw instead of `res.status(401).json(...)`?

Services (like `auth.service.ts`) shouldn't know about HTTP responses; they just do their
job or refuse. Throwing ends the work immediately, wherever it is, and one central place
formats every error the same way.

`throw` works like an emergency exit: the current function stops, and so does every
function that called it, until something *catches* the error. In our backend, that's
Express, which passes it to the error handler.
