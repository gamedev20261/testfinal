# `frontend/src/App.tsx`

> Added in **patch 04** · Changed in **patches 05, 06** · [View the code](../../../../frontend/src/App.tsx) · Background: [Frontend data flow](../../../concepts/frontend-data-flow.md)

## What it is for

The **root component**, drawn by [`main.tsx`](main.tsx.md). Since patch 06 it doesn't show
anything itself: it puts the app-wide **providers** around the pages.

## Now (patch 06)

```tsx
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
```

- **`QueryClientProvider`** makes the [query cache](lib/query-client.ts.md) available to
  every component inside it. Without it, `useQuery` and `useMutation` would fail with
  "No QueryClient set".
- **`RouterProvider`** reads the browser's URL and draws the matching page from
  [`router.tsx`](router.tsx.md). It comes from `react-router/dom`, the browser version of
  React Router.

A **provider** is a component that shares something with all components below it, however
deep, without passing props through every level. (React calls this mechanism *context*.)
Order matters: the pages call `useQuery`, so the router must be *inside* the query provider.

```
App
└── QueryClientProvider        ← the cache, for everything below
    └── RouterProvider         ← picks the page for the URL
        ├── /login → LoginPage
        └── RequireAuth → HomePage
```

## History

- **Patch 04:** a test card with the `ApiStatus` component, proving the frontend could
  reach the backend. See it with `git show a06d240:frontend/src/App.tsx`.
- **Patch 05:** `return <LoginPage />`, the app was just the login screen.
- **Patch 06:** providers + router (above).
