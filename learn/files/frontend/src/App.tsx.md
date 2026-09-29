# `frontend/src/App.tsx`

> Added in **patch 04** · Changed in **patch 05** · [View the code](../../../../frontend/src/App.tsx) · Background: [React basics](../../../concepts/react-basics.md)

## What it is for

The **root component**: the top of the component tree, drawn by [`main.tsx`](main.tsx.md).

## Now (patch 05)

```tsx
import { LoginPage } from './features/auth/LoginPage';

export function App() {
  return <LoginPage />;
}
```

The app is only the [login screen](features/auth/LoginPage.tsx.md) for now. In patch 06,
`App` becomes the list of **routes**: which page to show for which URL (`/login`, `/`),
and which pages need a logged-in user.

## Before (patch 04)

In patch 04, `App` showed a test card with the `ApiStatus` component, to prove the
frontend could reach the backend:

```tsx
export function App() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg border border-border p-8 w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-primary">GeoAnnotator</h1>
        <p className="text-sm text-text-secondary mt-1">The frontend is running.</p>
        <ApiStatus />
      </div>
    </main>
  );
}
```

- A component is just a **function that returns JSX**. `export` lets `main.tsx` import it.
- `<main>` fills at least the whole screen height (`min-h-screen`) and centres its child
  both ways (`flex items-center justify-center`).
- `w-full max-w-sm` = full width on phones, but never wider than 24rem (384px).

That card became the login card: the same classes are in `LoginPage`.
