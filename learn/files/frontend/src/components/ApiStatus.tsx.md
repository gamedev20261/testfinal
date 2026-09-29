# `frontend/src/components/ApiStatus.tsx`

> Added in **patch 04** · [View the code](../../../../../frontend/src/components/ApiStatus.tsx) · Background: [React basics → state and effects](../../../../concepts/react-basics.md#4-state-data-that-changes)

## What it is for

A small component that calls `GET /api/health` when it appears and shows the result:

| Situation | Shows |
|---|---|
| waiting for the answer | *Checking the API…* (grey) |
| backend and database fine | *API: ok · database: ok* (green) |
| database down | *API: error · database: unreachable* (red) |
| backend not running | *API not reachable. Is the backend running?* (red) |

It's our first component with **state** and an **effect**: the manual way to load data.
In patch 06 we'll load data with TanStack Query instead, and this component is removed in
patch 05. It's here to learn from.

## The code, piece by piece

### The shape of the answer

```ts
type Health = { status: string; database: string };
```
What we expect `/api/health` to return (the backend's
[health route](../../../backend/src/modules/health/health.routes.ts.md)).

### Two pieces of state

```ts
  const [health, setHealth] = useState<Health | null>(null);
  const [failed, setFailed] = useState(false);
```
- `health`: the answer, or `null` while we don't have it yet. `<Health | null>` tells
  TypeScript which values are allowed.
- `failed`: `true` if the request failed completely.

### The effect: fetch once

```ts
  useEffect(() => {
    fetch('/api/health')
      .then((response) => response.json())
      .then((data: Health) => setHealth(data))
      .catch(() => setFailed(true));
  }, []);
```
- `useEffect(fn, [])` runs `fn` once, after the component is first shown.
- `fetch('/api/health')` is the browser's built-in way to send a request. The path has no
  host, so it goes to the page's own server (Vite), whose [proxy](../../vite.config.ts.md)
  forwards it to the backend.
- `.then(...)` runs when the previous step finishes: first read the body as JSON, then
  store it in state. **Storing it re-renders the component**, which now shows the answer.
- `.catch(...)` runs if any step failed (backend down → the proxy answers with an error
  page that isn't JSON → `.json()` fails).

`.then()` chains are the older way to write what `async`/`await` does. Both work; you'll
see both in real code.

### Deciding what to show

```tsx
  if (failed) {
    return <p className="mt-6 text-sm text-danger">API not reachable. Is the backend running?</p>;
  }

  if (!health) {
    return <p className="mt-6 text-sm text-text-secondary">Checking the API…</p>;
  }

  const ok = health.status === 'ok';
  return (
    <p className={`mt-6 text-sm ${ok ? 'text-success' : 'text-danger'}`}>
      API: {health.status} · database: {health.database}
    </p>
  );
```
The component runs top to bottom **on every render**, and returns what fits the current
state. Early `return`s handle the special cases first.
- `className={`…${ok ? 'text-success' : 'text-danger'}`}`: a template string that picks
  the colour class.
- `{health.status}` inside JSX inserts the value.

## Watch it happen

1. Open the browser's dev tools (F12) → **Network** → reload. You'll see the `health`
   request and its JSON answer.
2. Look at the **backend terminal**: two `GET /api/health` lines per page load. That's
   `StrictMode` running the effect twice in development.
3. Stop the backend (`Ctrl+C`) and reload the page: red message. Start it again, reload: green.
