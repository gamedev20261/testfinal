# `frontend/tsconfig.json`

> Added in **patch 04** · [View the file](../../../frontend/tsconfig.json)

## What it is for

TypeScript settings for the frontend. Similar to the [backend's](../backend/tsconfig.json.md),
with a few browser-specific differences.

| Option | Meaning |
|---|---|
| `"lib": ["ES2022", "DOM", "DOM.Iterable"]` | We run in a **browser**, so TypeScript knows about `document`, `window`, `fetch`, HTML elements… |
| `"types": ["vite/client"]` | Vite's extras, e.g. that `import './index.css'` is allowed |
| `"module": "preserve"`, `"moduleResolution": "bundler"` | Imports are resolved the way Vite does it |
| `"jsx": "react-jsx"` | `.tsx` files contain JSX, compiled for React |
| `"strict": true` | All safety checks on |
| `"noUnusedLocals"`, `"noUnusedParameters"` | Unused variables are errors. Keeps the code clean: leftovers show up immediately. |
| `"noEmit": true` | `tsc` only checks; Vite does the translating |
| `"isolatedModules": true` | Warns about code Vite can't translate file by file |
| `"skipLibCheck": true` | Don't type-check packages in `node_modules` |
| `"include": ["src"]` | Our code is in `src/` |
