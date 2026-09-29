# `backend/tsconfig.json`

> Added in **patch 01** · [View the file](../../../backend/tsconfig.json)

## What it is for

Settings for the TypeScript checker (`npm run typecheck`) and for the editor's red underlines.

## The options that matter

| Option | Meaning |
|---|---|
| `"target": "ES2023"`, `"lib": ["ES2023"]` | We write modern JavaScript; Node 22 understands all of it. |
| `"types": ["node"]` | Load the type descriptions for Node (`process`, `Buffer`, …). |
| `"module": "preserve"`, `"moduleResolution": "bundler"` | Keep our `import` lines as they are and resolve them the way modern tools (tsx, bundlers) do. This is why we can write `import { env } from './config/env'` without a `.js` ending. |
| `"strict": true` | Turn on all the safety checks. For example, TypeScript forces you to handle a value that might be `null`. This catches many bugs. |
| `"noEmit": true` | `tsc` only checks; `tsx` does the running. |
| `"esModuleInterop": true` | Lets us write `import express from 'express'` for packages written in the older style. |
| `"isolatedModules": true` | Warns about code that tools like tsx can't handle file by file. |
| `"skipLibCheck": true` | Don't type-check the packages inside `node_modules` (faster; their authors already did). |
| `"include": ["src"]` | Only the `src` folder is our code. |

You rarely need to change this file.
