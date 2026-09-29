# `frontend/src/features/auth/RequireAuth.tsx`

> Added in **patch 06** · [View the code](../../../../../../frontend/src/features/auth/RequireAuth.tsx) · Background: [React Router → guards](../../../../../concepts/frontend-data-flow.md#guards)

## What it is for

The **guard** in front of every page that needs a logged-in user. In
[`router.tsx`](../../router.tsx.md) it wraps those pages:

```tsx
{ element: <RequireAuth />, children: [{ path: '/', element: <HomePage /> }] }
```

It's the frontend twin of the backend's [`requireAuth`](../../../../backend/src/middleware/require-auth.ts.md)
middleware: the backend one *protects the data*; this one *sends people to the right page*.

## The four outcomes

```ts
  const { data: user, isPending, isError, refetch } = useCurrentUser();
```
Ask the cache "who is logged in?" ([`use-auth.ts`](use-auth.ts.md)). Then, in order:

| Situation | Shows |
|---|---|
| `isPending`: waiting for `/api/auth/me` | [`FullPageLoader`](../../components/FullPageLoader.tsx.md) |
| `isError`: the server couldn't be reached | "The server could not be reached." + **Try again** (calls `refetch()`) |
| `!user`: nobody is logged in | Redirect to `/login` |
| logged in | `<Outlet />`: the page for the current URL |

### The redirect

```tsx
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
```
- `<Navigate>` redirects as soon as it's drawn.
- `replace`: the protected URL is replaced in the history, so pressing Back on the login
  page doesn't bounce you straight back here.
- `state={{ from: location.pathname }}`: invisible data passed to the next page. It
  remembers where you wanted to go (e.g. `/projects/42`), and after login the
  [login page](LoginPage.tsx.md) takes you there instead of the start page.

### The outlet

```tsx
  return <Outlet />;
```
`<Outlet />` means "draw the child route that matches the URL here". `RequireAuth` has no
look of its own: it either blocks or shows its child.
