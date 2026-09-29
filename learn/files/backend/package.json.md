# `backend/package.json`

> Added in **patch 01** · [View the file](../../../backend/package.json) · Background: [Node, npm and TypeScript](../../concepts/node-npm-typescript.md)

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
Documents that Node 22 or newer is needed (we use `process.loadEnvFile()`, added in Node 21).

```json
"scripts": {
  "dev": "tsx watch src/server.ts",
  "typecheck": "tsc --noEmit"
}
```
- `npm run dev`: **tsx** runs `src/server.ts` directly (no build step). `watch` restarts
  the server every time you save a file.
- `npm run typecheck`: **tsc** checks every file for type errors. `--noEmit` means
  "only check, don't write any output files".

### Dependencies (needed to run)

| Package | What we use it for |
|---|---|
| `express` | The web framework: receives requests, routes them to our code, sends responses |
| `helmet` | Adds security headers to every response |
| `pino` | Logging (printing what the server is doing) |
| `zod` | Checking that data has the right shape (settings now, request bodies later) |

### Dev dependencies (only for development)

| Package | What we use it for |
|---|---|
| `typescript` | The type checker (`tsc`) |
| `tsx` | Runs `.ts` files directly, restarts on save |
| `@types/node`, `@types/express` | Type descriptions for Node and Express, so the editor knows what `req`, `res` and `process` contain |
| `pino-pretty` | Makes log lines readable in the terminal |

More packages are added in later patches; each patch guide says which and why.
