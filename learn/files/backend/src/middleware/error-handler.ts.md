# `backend/src/middleware/error-handler.ts`

> Added in **patch 03** · [View the code](../../../../../backend/src/middleware/error-handler.ts)

## What it is for

The **one place** where errors become responses. Any route or middleware can simply
`throw`; Express 5 catches the error (even in `async` functions) and calls this function.
Every error answer from our API therefore has the same shape:

```json
{ "error": "A message a person can read" }
```

That makes life easy for the frontend: it always shows `error`.

## How Express knows it's an error handler

```ts
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
```

**Four parameters.** A normal middleware has three `(req, res, next)`; Express recognises an
error handler because it has four, with the error first. That's why `_next` must be there
even though we never use it. It is registered **last** in [`app.ts`](../app.ts.md).

`err: unknown`: anything can be thrown in JavaScript (even a string), so we check what it
is before using it.

## The four cases, top to bottom

### 1. Invalid request data → 400

```ts
  if (err instanceof ZodError) {
    res.status(400).json({
      error: err.issues[0]?.message ?? 'Invalid request',
      issues: err.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    });
    return;
  }
```
Routes call `schema.parse(req.body)`, which throws a `ZodError` when the data is wrong.
- `instanceof ZodError`: "was this error created by Zod?"
- `error`: the first problem, e.g. `"Enter your email"`. Good for a pop-up message.
- `issues`: every problem with its field name, e.g.
  `[{ "field": "email", … }, { "field": "password", … }]`. A form can show each message
  under its own input.
- `?.` and `??`: `err.issues[0]?.message` is `undefined` (instead of crashing) if there is
  no first issue, and `?? 'Invalid request'` provides a fallback for `undefined`.
- `.map(...)` builds a new list by transforming each item.
- `return` stops here so the cases below don't also run.

### 2. Our own errors → their status

```ts
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
```
Errors we threw on purpose with [`HttpError`](../lib/http-error.ts.md): 401, 403, 404, 409…

### 3. Express's own client errors → their status

```ts
  if (isClientError(err)) {
    res.status(err.status).json({ error: err.message });
    return;
  }
```
Some errors come from Express itself. For example, `express.json()` throws one with
`status: 400` when the body isn't valid JSON (`{"email": ` with nothing after it).
`isClientError` (at the bottom of the file) checks for a `status` number between 400 and 499.

```ts
function isClientError(err: unknown): err is { status: number; message: string } {
```
`err is {…}` is a **type guard**: when the function returns `true`, TypeScript knows that
`err` has `status` and `message`, so `err.status` is allowed afterwards.

### 4. Everything else → 500, and log it

```ts
  logger.error(err, `Unexpected error on ${req.method} ${req.originalUrl}`);
  res.status(500).json({ error: 'Something went wrong on the server' });
```
An error we didn't expect is a **bug** (or the database is down). The terminal gets the full
details with the file and line; the caller gets a generic message. Never send stack
traces or database messages to the browser: they help attackers and confuse users.

## Try it

Stop the database (`docker compose stop db`) and log in with Postman. You get `500` and a
short message; the terminal shows `Can't reach database server` with the exact line in
`auth.service.ts`. Start the database again.
