# `frontend/src/types/user.ts`

> Added in **patch 06** · [View the code](../../../../../frontend/src/types/user.ts)

## What it is for

Describes the **user object the backend sends**, so every part of the frontend agrees on
its shape and the editor can autocomplete `user.name`, `user.role`…

```ts
export type Role = 'ADMIN' | 'ANNOTATOR' | 'AUDITOR';

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};
```

It mirrors the backend's `PublicUser` in
[`auth.service.ts`](../../../backend/src/modules/auth/auth.service.ts.md) and the `Role`
enum in [`schema.prisma`](../../../backend/prisma/schema.prisma.md). If the backend adds a
field, add it here too.

`src/types/` holds shapes shared by several features. A type used by only one feature
stays inside that feature's folder.

## Note: a type is a promise, not a check

TypeScript types disappear when the code runs. Writing `api.get<{ user: User }>(…)` tells
TypeScript *what we expect*; it doesn't verify what the server really sent. That's fine
here because we control the backend, but it's why the backend itself checks everything it
receives.
