# `frontend/package.json`

> Added in **patch 04** · Changed in **patches 05, 06** · [View the file](../../../frontend/package.json) · Background: [Node, npm and TypeScript](../../concepts/node-npm-typescript.md)

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
| `react-hook-form` | *(patch 05)* Form state, submit handling and error messages ([forms](../../concepts/forms.md)) |
| `zod` | *(patch 05)* Validation rules, the same library as the backend |
| `@hookform/resolvers` | *(patch 05)* Lets React Hook Form validate with a Zod schema |
| `clsx`, `tailwind-merge` | *(patch 05)* Build `className` strings cleanly ([`cn`](src/lib/cn.ts.md)) |
| `axios` | *(patch 06)* Sends requests to the API ([client](src/api/client.ts.md)) |
| `@tanstack/react-query` | *(patch 06)* Loads, caches and updates server data ([data flow](../../concepts/frontend-data-flow.md)) |
| `react-router` | *(patch 06)* Pages and URLs ([router](src/router.tsx.md)) |
| `lucide-react` | *(patch 06)* Icons, the same set as the original app |

## Dev dependencies (tools, not shipped to the browser)

| Package | What we use it for |
|---|---|
| `vite` | Dev server and production bundler |
| `@vitejs/plugin-react` | Teaches Vite to handle React's JSX and instant updates |
| `tailwindcss`, `@tailwindcss/vite` | Tailwind CSS and its Vite plugin |
| `typescript` | The type checker |
| `@types/react`, `@types/react-dom` | Type descriptions for React |
