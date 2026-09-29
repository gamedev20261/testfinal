# `frontend/package.json`

> Added in **patch 04** · [View the file](../../../frontend/package.json) · Background: [Node, npm and TypeScript](../../concepts/node-npm-typescript.md)

## What it is for

Same idea as the [backend's `package.json`](../backend/package.json.md): the frontend's
packages and commands. The frontend is a **separate project** with its own `node_modules/`.
Run its commands from inside the `frontend/` folder.

## Scripts

| Command | Runs | What it does |
|---|---|---|
| `npm run dev` | `vite` | Starts the dev server at http://localhost:5173. Saving a file updates the page instantly. |
| `npm run typecheck` | `tsc --noEmit` | Checks every file for type errors |
| `npm run build` | `tsc --noEmit && vite build` | Type-checks, then builds optimized files into `dist/` for production. `&&` = run the second command only if the first succeeded. |
| `npm run preview` | `vite preview` | Serves the built `dist/` folder, to test the production build locally |

## Dependencies (end up in the browser)

| Package | What we use it for |
|---|---|
| `react` | Components, state, hooks: the core of the UI |
| `react-dom` | Draws React components into the browser page (the DOM) |
| `@fontsource-variable/inter` | The **Inter** font, bundled with the app, so it works without internet access to Google Fonts (the original app did the same) |

## Dev dependencies (tools, not shipped to the browser)

| Package | What we use it for |
|---|---|
| `vite` | Dev server and production bundler |
| `@vitejs/plugin-react` | Teaches Vite to handle React's JSX and instant updates |
| `tailwindcss`, `@tailwindcss/vite` | Tailwind CSS and its Vite plugin |
| `typescript` | The type checker |
| `@types/react`, `@types/react-dom` | Type descriptions for React |

More packages are added in patches 05 and 06 (forms, routing, API calls).
