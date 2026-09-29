# `backend/package.json`

> Added in **patch 01** · Changed in **patches 02, 03** · [View the file](../../../backend/package.json) · Background: [Node, npm and TypeScript](../../concepts/node-npm-typescript.md)

## What it is for

The backend's ID card: its name, the packages it needs, and the commands you can run.

## Piece by piece

```json
"type": "module",
```
Our files use `import` / `export` (modern *ES modules*). Without this line, Node would
expect the older `require()` style.

```json
"engines": { "node": ">=22" },
```
Documents that Node 22 or newer is needed. On an older Node, `npm install` prints an
`EBADENGINE` warning. The exact rule (22.12+, or 20.19+) is checked when the server starts,
which then refuses to run with a clear message ([`node-version.ts`](src/config/node-version.ts.md)).

### Scripts

| Command | Runs | What it does | Since |
|---|---|---|---|
| `npm run dev` | `tsx watch src/server.ts` | Starts the API and restarts it whenever you save a file | 01 |
| `npm run doctor` | `tsx src/scripts/doctor.ts` | Checks your setup (Node, `.env`, database, tables, admin…) and says how to fix what's missing ([explained](src/scripts/doctor.ts.md)) | after 06 |
| `npm run typecheck` | `tsc --noEmit` | Checks every file for type errors without writing any output | 01 |
| *(automatic)* | `prisma generate` | `postinstall` runs by itself after every `npm install`. It generates the typed database client in `src/generated/prisma` | 02 |
| `npm run db:migrate` | `prisma migrate dev` | Applies migrations to your database. After a schema change, it first writes a new migration. | 02 |
| `npm run db:seed` | `prisma db seed` | Runs `prisma/seed.ts` (creates the first admin) | 02 |
| `npm run db:studio` | `prisma studio` | Opens a web page to browse and edit the database | 02 |

### Dependencies (needed to run)

| Package | What we use it for | Since |
|---|---|---|
| `express` | The web framework: receives requests, routes them to our code, sends responses | 01 |
| `helmet` | Adds security headers to every response | 01 |
| `pino` | Logging (printing what the server is doing) | 01 |
| `zod` | Checking that data has the right shape (settings now, request bodies later) | 01 |
| `@prisma/client` | The runtime part of Prisma, used by the generated client | 02 |
| `@prisma/adapter-pg` | Connects Prisma to PostgreSQL through the `pg` driver | 02 |
| `bcryptjs` | Hashes and checks passwords | 02 |
| `jsonwebtoken` | Creates and checks the signed login tokens (JWT) | 03 |
| `cookie-parser` | Reads the `Cookie` header into `req.cookies` | 03 |
| `express-rate-limit` | Limits failed login attempts | 03 |

### Dev dependencies (only for development)

| Package | What we use it for | Since |
|---|---|---|
| `typescript` | The type checker (`tsc`) | 01 |
| `tsx` | Runs `.ts` files directly, restarts on save | 01 |
| `@types/node`, `@types/express` | Type descriptions for Node and Express, so the editor knows what `req`, `res` and `process` contain | 01 |
| `@types/jsonwebtoken`, `@types/cookie-parser` | Type descriptions for those two packages | 03 |
| `pino-pretty` | Makes log lines readable in the terminal | 01 |
| `prisma` | The Prisma command-line tool (`migrate`, `generate`, `studio`, `db seed`) | 02 |

### Overrides

```json
"overrides": {
  "mysql2": "^3.24.4",
  "deepmerge-ts": "^8.0.0"
}
```

`npm audit` checks installed packages against a list of known security problems. The
Prisma tool depends on two packages that had known issues in the versions it asks for.
(`mysql2` is only used for MySQL databases, which we don't even use.) **overrides**
tells npm: "wherever these packages appear, install at least these fixed versions".
Result: `found 0 vulnerabilities`.

> If `npm audit` ever suggests `npm audit fix --force`, don't run it blindly: `--force`
> may install an *older major version* of a package and break things.
