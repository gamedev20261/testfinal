# `backend/src/lib/session.ts`

> Added in **patch 03** · [View the code](../../../../../backend/src/lib/session.ts) · Background: [Authentication](../../../../concepts/authentication.md)

## What it is for

Everything about the **login session** in one file:

| Function | Used by | Does |
|---|---|---|
| `createSessionToken(userId)` | login route | Makes a signed JWT that says "this is user `userId`" |
| `readSessionToken(token)` | [`requireAuth`](../middleware/require-auth.ts.md) | Checks a token and returns the user id, or `null` |
| `setSessionCookie(res, token)` | login route | Tells the browser to store the token in a cookie |
| `clearSessionCookie(res)` | logout route | Tells the browser to delete the cookie |

## The code, piece by piece

```ts
export const SESSION_COOKIE = 'session';
const SESSION_SECONDS = env.SESSION_HOURS * 60 * 60;
```
The cookie's name, and the session length converted from hours to seconds
(`24 * 60 * 60 = 86400`).

### Creating a token

```ts
export function createSessionToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: SESSION_SECONDS });
}
```
`jwt.sign(payload, secret, options)` from the **jsonwebtoken** package:
- payload `{ sub: userId }`: `sub` (subject) is the standard JWT name for "who this is about".
- `env.JWT_SECRET`: the key that makes the signature. Only the server knows it.
- `expiresIn`: the library adds `exp` = now + 86400 seconds.

### Reading a token

```ts
export function readSessionToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    return typeof payload === 'object' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}
```
- `jwt.verify` recomputes the signature with our secret. It **throws** if the token was
  edited, signed with another key, is expired, or isn't a JWT at all. We catch that and
  return `null` ("no valid session").
- `algorithms: ['HS256']` accepts only the algorithm we sign with. This blocks a known trick
  where an attacker's token claims a different (weaker) algorithm.
- `verify` can return a string or an object, so we check that we got an object with a text
  `sub` before trusting it.
- Return type `string | null`: either a user id or nothing. TypeScript will force the caller
  to handle `null`.

### Setting the cookie

```ts
export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: SESSION_SECONDS * 1000,
    path: '/',
  });
}
```
`res.cookie(...)` adds a `Set-Cookie` header to the response. Each option is explained in
[Authentication → cookies](../../../../concepts/authentication.md#4-where-the-browser-keeps-it-a-cookie).
- `secure: isProduction`: on `http://localhost` there's no HTTPS, so `Secure` would stop
  the browser from storing the cookie in development.
- `maxAge` is in **milliseconds** here (Express's choice), so we multiply by 1000.
- `path: '/'`: send the cookie with requests to every path on the site.

### Clearing the cookie

```ts
export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}
```
Sends `Set-Cookie: session=; Expires=Thu, 01 Jan 1970…`. A date in the past makes the
browser delete it. The `path` must match the one used when setting it.
