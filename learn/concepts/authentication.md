# Authentication: logins, sessions, cookies and tokens

## 1. Two different questions

| | Question | Example | Wrong answer → |
|---|---|---|---|
| **Authentication** | *Who are you?* | Email + password match the admin account | `401 Unauthorized` |
| **Authorization** | *Are you allowed to do this?* | Only admins may create users | `403 Forbidden` |

The login screen is about authentication. Authorization comes with the Admin Settings
screen, where some actions are admin-only.

## 2. The problem: HTTP forgets

Every HTTP request is independent. After you log in, the next request (`GET /api/projects`)
arrives with no memory of the login. So after a successful login the server gives the
browser a **proof**, and the browser sends that proof with every later request.

```mermaid
sequenceDiagram
    participant B as Browser
    participant S as Server
    participant D as Database
    B->>S: POST /api/auth/login { email, password }
    S->>D: find user by email
    D-->>S: user row (with passwordHash)
    S->>S: bcrypt: password matches hash? ✅
    S->>S: create signed token "user 8dbd…"
    S-->>B: 200 { user } + Set-Cookie: session=<token>
    Note over B: the browser stores the cookie
    B->>S: GET /api/auth/me  (Cookie: session=<token>)
    S->>S: signature valid? not expired? → user 8dbd…
    S->>D: find user 8dbd…
    S-->>B: 200 { user }
```

## 3. The proof: a JWT (JSON Web Token)

A JWT is a small piece of text in three parts separated by dots:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZGJkOWIyYS0uLi4iLCJpYXQiOjE3OTA2NTY2MDcsImV4cCI6MTc5MDc0MzAwN30.e0K96xwazZrJOxI6sf8B…
└──────────── header ───────────────┘ └──────────────────────────── payload ─────────────────────────────────┘ └─ signature ─┘
```

- The **header** and **payload** are just JSON, encoded as *Base64* (not encrypted!).
  Paste a token into https://jwt.io and you can read it:
  ```json
  { "alg": "HS256", "typ": "JWT" }                                   ← header
  { "sub": "8dbd9b2a-…", "iat": 1790656607, "exp": 1790743007 }      ← payload
  ```
  `sub` (*subject*) = the user id, `iat` = *issued at*, `exp` = *expires*
  (both in seconds since 1970).
- The **signature** is computed from the header, the payload and our **secret key**
  (`JWT_SECRET`). Change one character of the payload and the signature no longer
  matches, and only someone who knows the secret can make a valid one.

So the server can trust a token *without storing it anywhere*: if the signature is valid
and `exp` hasn't passed, the server itself issued it.

> Because anyone can *read* a JWT, never put secrets in the payload.
> We only put the user id in it.

## 4. Where the browser keeps it: a cookie

A **cookie** is a small value the server asks the browser to store, with
`Set-Cookie: session=<token>; HttpOnly; SameSite=Lax; Max-Age=86400`. From then on, the
browser automatically adds `Cookie: session=<token>` to every request to the same site.

The options make it safe:

| Option | Protects against |
|---|---|
| `HttpOnly` | JavaScript in the page **can't read** the cookie. If an attacker ever manages to run a script in our page (*XSS*, cross-site scripting), they still can't steal the login. |
| `SameSite=Lax` | The browser **won't send** the cookie when another website secretly submits a form or request to our API (*CSRF*, cross-site request forgery). |
| `Secure` (production) | Only sent over HTTPS, so nobody on the network can read it. |
| `Max-Age` | The browser deletes it after that many seconds. The token inside also expires. |

**Why a cookie and not "store the token in JavaScript and send an `Authorization`
header"?** That's the other common approach (the original app used it). It works, but
the token is readable by any script in the page, and images and map tiles loaded with
`<img src>` can't carry a header. The original app needed a second kind of "media token"
just for images. With a cookie, the browser attaches it to images too.

## 5. Logging out

The server answers with a `Set-Cookie` that empties the cookie and dates it in 1970, so
the browser deletes it at once.

The token itself stays mathematically valid until `exp`: someone who copied it could still
use it until then. That's why sessions are short (24 h here). A later patch adds a way to
cut all of a user's sessions immediately (after a password change).

## 6. Defending the login form

| Attack | Defence in our code |
|---|---|
| Stolen database → passwords exposed | Only bcrypt hashes are stored ([password.ts](../files/backend/src/lib/password.ts.md)) |
| Guessing passwords very fast | bcrypt is slow on purpose, **and** max 20 failed logins per 15 minutes per address (*rate limiting* → `429 Too Many Requests`) |
| Finding out which emails have accounts | Same message *and* same response time for "unknown email" and "wrong password" |
| Forged or edited tokens | Signature check with the secret key |
| Token theft by scripts / other sites | `HttpOnly` and `SameSite` cookie |
