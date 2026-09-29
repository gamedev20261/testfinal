# Node.js, npm and TypeScript

## Node.js

JavaScript was made to run inside browsers. **Node.js** is a program that runs JavaScript
*outside* the browser, so we can write a server with it. When you type `node file.js`,
Node reads the file and runs it.

Things Node can do that a browser page cannot: open a port and listen for requests, read
and write files on disk, connect to a database.

## npm and `package.json`

**npm** installs *packages*: code other people wrote and published, like `express`
(a web server framework) or `zod` (data validation).

Every project has a `package.json` that lists:
- **dependencies**: packages the app needs to run (`express`, `zod`, …)
- **devDependencies**: packages only needed while developing (`typescript`, `tsx`, …)
- **scripts**: named commands, run with `npm run <name>`

| Command | What it does |
|---|---|
| `npm install` | Reads `package.json` and downloads everything into `node_modules/` |
| `npm install zod` | Adds a new dependency (and writes it into `package.json`) |
| `npm install -D tsx` | Adds a dev dependency |
| `npm run dev` | Runs the `dev` script |

- **`node_modules/`** holds the downloaded packages. It is huge and is **never committed**
  to git (it is in `.gitignore`); `npm install` recreates it.
- **`package-lock.json`** records the *exact* version of every package that was installed,
  so everyone gets the same versions. It *is* committed. Don't edit it by hand.

### Version numbers

`"express": "^5.2.1"` means *major.minor.patch* = 5.2.1. The `^` allows newer minor and
patch versions (5.3.0 is fine) but not a new major version (6.0.0 could break things).

## TypeScript

**TypeScript** is JavaScript plus **types**. A type says what kind of value a variable
holds. TypeScript checks your code *before* it runs and underlines mistakes in the editor.

```ts
// JavaScript: nothing stops this mistake until the code runs
function greet(user) {
  return 'Hello ' + user.nmae; // typo → prints "Hello undefined"
}

// TypeScript: the editor underlines `nmae` immediately
type User = { name: string; age: number };

function greet(user: User): string {
  return 'Hello ' + user.nmae;
  //                    ~~~~ Property 'nmae' does not exist on type 'User'
}
```

The syntax you will meet most often:

```ts
let count: number = 0;                  // a variable with a type
const names: string[] = ['Ana', 'Bo'];  // an array of strings

type Role = 'ADMIN' | 'ANNOTATOR' | 'AUDITOR'; // only these three strings are allowed

interface User {          // the shape of an object
  id: string;
  name: string;
  role: Role;
  avatarUrl?: string;     // `?` = optional
}

function isAdmin(user: User): boolean {  // parameter type and return type
  return user.role === 'ADMIN';
}
```

Often you don't have to write the type at all; TypeScript works it out
(`const total = 5` is a `number`). This is called *type inference*.

Browsers and Node can't run TypeScript directly. Tools remove the types first:
- **`tsx`** runs a `.ts` file straight away (we use it for the backend in development).
- **`tsc`** (the TypeScript compiler) checks the whole project for type errors:
  `npm run typecheck`.

## Modules: `import` and `export`

Code is split into files (modules). A file **exports** what others may use, and other files
**import** it:

```ts
// lib/math.ts
export function add(a: number, b: number) {
  return a + b;
}

// app.ts
import { add } from './lib/math'; // './' = a path relative to this file
import express from 'express';     // no './' = a package from node_modules
```

- `export function x` → imported with braces: `import { x } from …` (a *named* export)
- `export default x` → imported without braces: `import x from …` (the *default* export)

## `async` / `await`

Some work takes time: reading a file, asking the database. JavaScript doesn't wait by
blocking everything; instead such functions return a **Promise** (a value that arrives
later). `await` pauses *only this function* until the value arrives:

```ts
async function loadUser(id: string) {
  const user = await db.user.findUnique({ where: { id } }); // wait for the database
  return user;
}
```

Meanwhile the server keeps answering other requests. That is why one Node process can
serve many users at once.
