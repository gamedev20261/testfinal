# `backend/src/server.ts`

> Added in **patch 01** · Changed after **patch 06** (database check) · [View the code](../../../../backend/src/server.ts)

## What it is for

The **entry point**: the file Node runs first (`npm run dev` → `tsx watch src/server.ts`).
It creates the app and starts listening for requests.

## The code

```ts
const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`API ready on http://localhost:${env.PORT}`);
  void checkDatabaseConnection();
});
```

- `createApp()` builds the app (see [`app.ts`](app.ts.md)).
- `app.listen(port, callback)` asks the operating system for the port (3001) and starts
  waiting for connections. The **callback** (the arrow function) runs once the port is
  open, so "API ready" means the server can really accept requests.

- `checkDatabaseConnection()` (added after patch 06) asks the database one quick question
  and prints either `Database connected: postgres@localhost:5432/geoannotator` or exactly
  what's wrong ([explained here](lib/database-check.ts.md)). `void` means "start it, but
  don't wait for it": the server is already accepting requests meanwhile.

From now on the program does not exit: it waits for requests until you press `Ctrl+C`.

## Why so small?

Later patches add things that belong to "starting and stopping", not to the app itself:
real-time connections (Socket.IO) and a clean shutdown. They go here, and `app.ts` stays
about requests and routes.

## Common problem

`Error: listen EADDRINUSE: address already in use :::3001` means another program (often
a server you started earlier in another terminal) is already using port 3001. Stop the
other one with `Ctrl+C`, or set `PORT=3002` in `.env`.
