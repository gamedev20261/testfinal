# `frontend/src/components/ApiStatus.tsx` *(removed in patch 05)*

> Added in **patch 04** · **Removed in patch 05** (it was a test to prove the frontend could reach the API; the login screen replaced it)
>
> See the code as it was: `git show a06d240:frontend/src/components/ApiStatus.tsx`
> (`a06d240` is patch 04's commit id, from `git log --oneline`; `id:path` shows a file as it was in that commit.)

## What it was for

A small component that called `GET /api/health` when it appeared and showed the result:

| Situation | Shows |
|---|---|
| waiting for the answer | *Checking the API…* (grey) |
| backend and database fine | *API: ok · database: ok* (green) |
| database down | *API: error · database: unreachable* (red) |
| backend not running | *API not reachable. Is the backend running?* (red) |

It was our first component with **state** and an **effect**: the manual way to load data.
It's worth reading once, because in patch 06 a library (TanStack Query) does this work
for us, and it helps to know what the library is doing.

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
- `health`: the answer, or `null` while we don't have it yet.
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
- `.catch(...)` runs if any step failed (backend down → the proxy's error answer isn't
  JSON → `.json()` fails).

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

## What it taught (and what replaces it)

Loading data by hand needs: a state for the data, a state for errors, (often) a state for
"loading", an effect, and care with StrictMode's double run. Every screen that loads data
would repeat this. From patch 06, **TanStack Query** gives all of it in one line:
`const { data, isLoading, error } = useQuery(...)`.
