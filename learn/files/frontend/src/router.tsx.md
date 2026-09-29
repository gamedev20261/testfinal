# `frontend/src/router.tsx`

> Added in **patch 06** · [View the code](../../../../frontend/src/router.tsx) · Background: [React Router](../../../concepts/frontend-data-flow.md#4-react-router-pages-and-urls)

## What it is for

**The map of the app**: which page is shown for which URL. Every new screen adds a line here.

```tsx
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [{ path: '/', element: <HomePage /> }],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
```

| URL | What happens |
|---|---|
| `/login` | The [login page](features/auth/LoginPage.tsx.md), open to everyone |
| `/` | [`RequireAuth`](features/auth/RequireAuth.tsx.md) checks the session, then shows the [home page](features/home/HomePage.tsx.md) |
| anything else | Redirect to `/`, which in turn sends logged-out visitors to `/login` |

## How nesting works

The second entry has **no `path`**: it's a *layout route*. It matches whenever one of its
`children` matches, draws `RequireAuth`, and `RequireAuth` draws the child where it puts
`<Outlet />`.

```
URL "/"  →  <RequireAuth>          (checks the session)
               <Outlet/> = <HomePage/>
```

In the next screens, the admin pages go into the same `children` list, and they are
protected without writing any extra code:

```tsx
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/admin', element: <AdminSettingsPage /> },     // coming soon
    ],
```

`createBrowserRouter` uses normal-looking URLs (`/login`, not `/#/login`). In development,
Vite answers every unknown path with `index.html`, so reloading `/login` works. In
production, the web server is configured to do the same.
