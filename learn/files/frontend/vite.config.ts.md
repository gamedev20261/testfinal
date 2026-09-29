# `frontend/vite.config.ts`

> Added in **patch 04** · [View the code](../../../frontend/vite.config.ts) · Background: [How a web page works → dev server and proxy](../../concepts/how-a-web-page-works.md#5-the-dev-server-and-the-build)

## What it is for

Settings for **Vite**, the tool that serves the app during development and builds it for
production.

## The code

```ts
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
```
**Plugins** teach Vite new tricks:
- `react()`: understands JSX, and updates a component on screen the moment you save its
  file, without losing what you typed (*Fast Refresh*).
- `tailwindcss()`: scans our files for Tailwind classes (`bg-primary`, `px-4`…) and
  generates exactly the CSS they need.

```ts
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
```
- `port`: the dev server's address, http://localhost:5173.
- `proxy`: every request whose path starts with `/api` is **forwarded to the backend**.
  The page calls `fetch('/api/health')`; Vite passes it to `http://localhost:3001/api/health`
  and hands the answer back.

Why a proxy? For the browser, everything now comes from one address (`localhost:5173`).
No cross-origin (CORS) rules get in the way, and the login cookie (patch 06) belongs to
the same site as the page. In production, nginx plays the same role.

`defineConfig(...)` only adds types, so the editor can autocomplete these settings.
