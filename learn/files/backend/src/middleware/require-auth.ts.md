# `backend/src/middleware/require-auth.ts`

> Added in **patch 03** · [View the code](../../../../../backend/src/middleware/require-auth.ts)

## What it is for

The **guard** in front of every route that needs a logged-in user. You add it to a route
like this:

```ts
authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });   // runs only if requireAuth let the request through
});
```

Express runs the functions in order: first `requireAuth`, then the handler. If
`requireAuth` throws, the handler never runs and the caller gets `401`.
From the Admin Settings screen on, almost every route will use it.

## The code, piece by piece

```ts
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token: string | undefined = req.cookies?.[SESSION_COOKIE];
```
`req.cookies` is filled in by `cookie-parser` (in [`app.ts`](../app.ts.md)) from the
`Cookie:` header. `req.cookies?.['session']` reads the session cookie, or gives
`undefined` if there is none.

```ts
  const userId = token ? readSessionToken(token) : null;
  if (!userId) {
    throw new HttpError(401, 'Please log in');
  }
```
No cookie → `null`. A cookie with a fake, edited or expired token →
[`readSessionToken`](../lib/session.ts.md) returns `null`. Either way: 401.

```ts
  const user = await findPublicUser(userId);
  if (!user) {
    throw new HttpError(401, 'Please log in');
  }
```
The token is valid, but does the account still exist? We read the user **fresh from the
database on every request**. It costs one small, indexed query, and it means:
- a deleted user is locked out immediately, even with a valid token;
- `req.user.role` is always the *current* role. If an admin changes someone's role, the
  change applies to their next request.

```ts
  req.user = user;
  next();
}
```
Attach the user to the request, so every later function (like the `/me` handler) can read
`req.user`, then pass the request on.

## Why `throw` works in an async middleware

Express 5 notices when an `async` middleware throws (its Promise is *rejected*) and sends
the error to the [error handler](error-handler.ts.md). In Express 4 you had to call
`next(err)` yourself, or the request would hang.

## `req.user` and TypeScript

Express's `Request` type has no `user` property. [`types/express.d.ts`](../types/express.d.ts.md)
adds it; without that file, `req.user = user` would be a type error.
