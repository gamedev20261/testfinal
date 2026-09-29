# `frontend/src/lib/query-client.ts`

> Added in **patch 06** · [View the code](../../../../../frontend/src/lib/query-client.ts) · Background: [TanStack Query](../../../../concepts/frontend-data-flow.md#3-tanstack-query-server-data-in-components)

## What it is for

Creates the **one cache** that holds everything the app loads from the API. Every
`useQuery` and `useMutation` in the app reads from and writes to it.
[`App.tsx`](../App.tsx.md) makes it available to all components with `QueryClientProvider`.

## The code

```ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});
```

`defaultOptions` are settings for every query, unless a query overrides them.

### `staleTime: 30_000`

How long an answer counts as **fresh**. While fresh, any component that asks for the same
data gets the cached answer, with **no new request**.

Why it matters: when you reload the page while logged in, `RequireAuth` asks
`GET /api/auth/me`, and once the answer arrives it draws `HomePage`, which *also* calls
`useCurrentUser()`. With the library's default (`staleTime: 0`, "outdated immediately"),
`HomePage` appearing would trigger a second `/me` request. With 30 seconds, it reuses the
answer: **one request per page load**. (We measured this while building the patch.)

After 30 seconds the data becomes *stale*: it's still shown, but reloaded in the background
at the next good moment (a component needing it appears, or you come back to the tab).

### `retry: 1`

When a request fails, TanStack Query tries **once more** before reporting an error. (The
default is 3 retries with growing pauses, which would leave the spinner turning for
several seconds when the backend is down.)

Another default we keep: data nobody uses anymore is removed from the cache after 5 minutes.
