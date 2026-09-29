# `backend/src/types/express.d.ts`

> Added in **patch 03** · [View the code](../../../../../backend/src/types/express.d.ts)

## What it is for

A **type declaration** file (`.d.ts`): it contains no code that runs, only information for
TypeScript. It tells TypeScript that Express requests may carry a `user`:

```ts
declare global {
  namespace Express {
    interface Request {
      user?: PublicUser;
    }
  }
}
```

## How it works

- Express's own types declare an interface `Express.Request`. In TypeScript, declaring an
  interface with the **same name again** *adds* properties to it. This is called
  *declaration merging*.
- `declare global { … }` is needed because this file has an `import`, which makes it a
  module; `global` reaches outside it to the shared `Express` namespace.
- `user?:` is optional: it is only set on routes behind [`requireAuth`](../middleware/require-auth.ts.md).
  In those handlers, `req.user` is typed `PublicUser | undefined`. When we need it as
  definitely present, we'll write `req.user!` (the `!` tells TypeScript "I know it's set").
- `export {};` at the end makes sure TypeScript treats the file as a module.

## When to touch it

Only when you want to attach something new to every request. You'll rarely edit it.
