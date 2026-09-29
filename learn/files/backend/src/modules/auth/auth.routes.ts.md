# `backend/src/modules/auth/auth.routes.ts`

> Added in **patch 03** · [View the code](../../../../../../backend/src/modules/auth/auth.routes.ts) · Background: [Authentication](../../../../../concepts/authentication.md)

## What it is for

The three **auth endpoints**. Mounted in [`app.ts`](../../app.ts.md) under `/api/auth`:

| Method + path | Body | Success | Failures | Used by (screen) |
|---|---|---|---|---|
| `POST /api/auth/login` | `{ email, password }` | `200 { user }` + session cookie | `400` bad body · `401` wrong login · `429` too many attempts | Login screen → *Sign In* (patch 06) |
| `POST /api/auth/logout` | – | `204` + cookie deleted | – | *Logout* button (patch 06) |
| `GET /api/auth/me` | – | `200 { user }` | `401` not logged in | Every page load: "who is logged in?" (patch 06) |

Every handler follows the same three steps: **read** the request → **call** the service →
**send** the response. The rules live in [`auth.service.ts`](auth.service.ts.md), the input
rules in [`auth.schemas.ts`](auth.schemas.ts.md).

## The code, piece by piece

### The rate limiter

```ts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many failed logins. Try again in 15 minutes.' },
});
```
A middleware from **express-rate-limit**. It counts requests per IP address:
- `windowMs`: the counting window, 15 minutes in milliseconds.
- `limit: 20`: the 21st counted request inside the window gets `429 Too Many Requests`
  with our `message` (sent as JSON, like every other error).
- `skipSuccessfulRequests`: only failed logins (status 400 or above) count, so people who
  log in normally are never blocked.
- `standardHeaders`: adds a `RateLimit` header showing how many attempts are left
  (look at it in Postman: `r=19` = 19 remaining).

The counts are kept in memory, so restarting the server resets them.

### Login

```ts
authRouter.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await login(email, password);

  setSessionCookie(res, createSessionToken(user.id));
  res.json({ user });
});
```
1. `loginLimiter` runs first (a route can have several middleware before the handler).
2. `loginSchema.parse` checks the body, or throws → 400.
   `const { email, password } = …` is **destructuring**: it takes those two properties out
   of the object into variables.
3. `login` checks the credentials, or throws → 401.
4. Create a token for this user and put it in a cookie.
5. Send the public user. The frontend uses `user.role` to decide which portal to open.

Notice there is no `try/catch`: any error thrown in steps 2–3 goes to the error handler on
its own (Express 5).

### Logout

```ts
authRouter.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});
```
`204 No Content`: done, nothing to send back. `.end()` finishes the response without a body.
It works even if you weren't logged in: the result is the same, you are logged out.

Why `POST` and not `GET`? `GET` requests must never change anything. Browsers and tools
may call `GET` URLs on their own (prefetching links, for example), which could log you out
by surprise.

### Who am I?

```ts
authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
```
[`requireAuth`](../../middleware/require-auth.ts.md) does all the work: it rejects the
request (401) or sets `req.user`. The handler just sends it back.

The frontend can't read the `HttpOnly` cookie, so when you open the app it asks `/me`:
"am I logged in, and as whom?"
