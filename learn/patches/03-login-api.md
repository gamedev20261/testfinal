# Patch 03: The login API

| | |
|---|---|
| **Screen** | Login (Admin portal): step 3 of 6 |
| **Part** | Backend |
| **Commit** | `Patch 03: login API` → `git show --stat ':/^Patch 03:'` |

## Where we are

The database knows the admin. Now the server gets three endpoints the login screen will
use: **log in**, **log out**, and **who am I?**. Before we build the screen, we test every
case in Postman, so when the screen is built you already know exactly what it receives.

```
Login screen
 ├── ✅ 01 Backend: first server
 ├── ✅ 02 Database and first admin user
 ├── ✅ 03 Login API + Postman              ← this patch
 ├── ⬜ 04 Frontend: first page
 ├── ⬜ 05 Login screen design
 └── ⬜ 06 Connect the screen to the API
```

## New concepts (read first)

[Authentication](../concepts/authentication.md): authentication vs authorization, why HTTP
needs a session, what a JWT is, cookies and their safety options, how the login form is
defended.

## The endpoints

| Method + path | Body | Success | Failures | Used by |
|---|---|---|---|---|
| `POST /api/auth/login` | `{ "email", "password" }` | `200 { user }` + session cookie | `400` · `401` · `429` | *Sign In* button |
| `POST /api/auth/logout` | – | `204`, cookie deleted | – | *Logout* button |
| `GET /api/auth/me` | – | `200 { user }` | `401` | Every page load |

`user` is always `{ id, name, email, role }`: never the password hash.

## Files in this patch (read in this order)

Follow a login request through the code: from the URL, to the checks, to the database, and back.

| # | File | New / changed | What it does | Explanation |
|---|---|---|---|---|
| 1 | `backend/src/modules/auth/auth.routes.ts` | new | The three endpoints | [read](../files/backend/src/modules/auth/auth.routes.ts.md) |
| 2 | `backend/src/modules/auth/auth.schemas.ts` | new | What a login body must look like | [read](../files/backend/src/modules/auth/auth.schemas.ts.md) |
| 3 | `backend/src/modules/auth/auth.service.ts` | new | Checks email + password; `PublicUser` | [read](../files/backend/src/modules/auth/auth.service.ts.md) |
| 4 | `backend/src/lib/session.ts` | new | Creates/reads the JWT; sets/clears the cookie | [read](../files/backend/src/lib/session.ts.md) |
| 5 | `backend/src/middleware/require-auth.ts` | new | The guard for logged-in-only routes | [read](../files/backend/src/middleware/require-auth.ts.md) |
| 6 | `backend/src/types/express.d.ts` | new | Adds `req.user` to TypeScript's idea of a request | [read](../files/backend/src/types/express.d.ts.md) |
| 7 | `backend/src/lib/http-error.ts` | new | `throw new HttpError(401, '…')` | [read](../files/backend/src/lib/http-error.ts.md) |
| 8 | `backend/src/middleware/error-handler.ts` | new | Turns every error into a JSON answer | [read](../files/backend/src/middleware/error-handler.ts.md) |
| 9 | `backend/src/app.ts` | changed | `cookieParser`, the auth router, the error handler | [read](../files/backend/src/app.ts.md) |
| 10 | `backend/src/config/env.ts` | changed | `JWT_SECRET`, `SESSION_HOURS` | [read](../files/backend/src/config/env.ts.md) |
| – | `backend/.env.example` | changed | The two new settings | [read](../files/backend/.env.example.md) |
| – | `backend/package.json` | changed | New packages | [read](../files/backend/package.json.md) |
| – | `postman/*.json` | changed | Folder *Patch 03 · Auth*, new environment variables | [how to use](../postman.md) |

## Trace a click: `POST /api/auth/login`

```mermaid
sequenceDiagram
    participant C as Postman / browser
    participant A as app.ts middleware
    participant RL as loginLimiter
    participant R as auth.routes.ts
    participant Z as auth.schemas.ts
    participant S as auth.service.ts
    participant DB as PostgreSQL
    participant SE as session.ts
    participant E as error-handler.ts
    C->>A: POST /api/auth/login {"email":" Admin@Example.com ","password":"…"}
    A->>A: helmet, requestLogger, express.json → req.body, cookieParser
    A->>RL: under 20 failures in 15 min?
    RL->>R: yes → handler
    R->>Z: loginSchema.parse(req.body)
    Z-->>R: { email: "admin@example.com", password: "…" }
    R->>S: login(email, password)
    S->>DB: SELECT … FROM users WHERE email = $1
    DB-->>S: user row
    S->>S: bcrypt compare (≈250 ms)
    alt wrong email or password
        S--)E: throw HttpError(401)
        E-->>C: 401 {"error":"Invalid email or password"}
    else correct
        S-->>R: PublicUser
        R->>SE: createSessionToken(user.id), setSessionCookie
        R-->>C: 200 {"user":{…}} + Set-Cookie: session=eyJ…; HttpOnly; SameSite=Lax
    end
```

## Run it

```bash
cd backend
cp .env.example .env      # new settings (or copy the JWT_SECRET and SESSION_HOURS lines)
npm install               # new packages
npm run dev
```

Make your own secret and paste it into `.env` as `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Test it in Postman

Re-import both files from `postman/` (*Replace*): the environment now has `adminEmail` and
`adminPassword`. If you changed the admin's email or password in `.env`, change them in the
environment too (the 👁 icon, top right).

Right-click **Patch 03 · Auth** → **Run folder**. All requests should be green:

| # | Request | Expect | What to notice |
|---|---|---|---|
| 1 | Logout (start clean) | 204 | Always works, even when logged out |
| 2 | Who am I? (logged out) | 401 | `requireAuth` found no cookie |
| 3 | Login: empty body | 400 | `issues` lists *both* fields |
| 4 | Login: not an email | 400 | Zod's email check |
| 5 | Login: wrong password | 401 | Look at the response **time** (~250 ms) |
| 6 | Login: unknown email | 401 | *Same* message and *same* time as #5 |
| 7 | Login as admin | 200 | *Cookies* tab: `session`, HttpOnly. *Headers*: `RateLimit` |
| 8 | Who am I? (logged in) | 200 | Postman sent the cookie for you |
| 9 | Logout | 204 | *Headers*: `Set-Cookie: session=; Expires=… 1970` |
| 10 | Who am I? (after logout) | 401 | The cookie is gone |

**Look inside the token:** after request 7, copy the cookie value (Cookies window) and paste
it into https://jwt.io. You can read `sub` (your user id) and `exp`, but you can't change
them without the secret.

**Trip the rate limiter:** send *Login: wrong password* 21 times. The 21st answer is
`429 Too Many Failed Logins`, and even the correct password is refused until the window
passes. Restarting the server resets the counter (it's kept in memory).

**Break a token:** in Postman's Cookies window, change one character of the `session`
value, then send *Who am I?*: `401`. The signature no longer matches.

## Check yourself

1. What's the difference between `401` and `403`?
2. The cookie is `HttpOnly`. How will the frontend know who is logged in?
3. Why does the service check a password even when the email doesn't exist?
4. Where does a `ZodError` thrown in `auth.routes.ts` end up, and what does the caller receive?
5. A token's payload can be read by anyone. Why can't a user change `sub` to another user's id?
6. Why is `requireAuth` reading the user from the database on every request instead of
   trusting the token alone?

<details>
<summary>Answers</summary>

1. `401`: we don't know who you are (not logged in, or wrong password). `403`: we know who
   you are, but you're not allowed to do this.
2. It calls `GET /api/auth/me`; the browser sends the cookie automatically and the server
   answers with the user.
3. So "unknown email" and "wrong password" take the same time; otherwise response times
   would reveal which emails have accounts.
4. Express passes it to `errorHandler`, which answers `400` with `error` (first message)
   and `issues` (all problems with their field names).
5. The signature is computed from the payload with the secret key. A changed payload no
   longer matches the signature, and without `JWT_SECRET` nobody can make a new valid one.
6. So a deleted account is locked out immediately and the role is always current, even
   though the token itself is valid for 24 hours.

</details>

## Next

**Patch 04: Frontend, the first page.** We create the React app with Vite, TypeScript and
Tailwind, and learn how a web page is built from components.
