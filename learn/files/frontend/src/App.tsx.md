# `frontend/src/App.tsx`

> Added in **patch 04** · [View the code](../../../../frontend/src/App.tsx) · Background: [React basics](../../../concepts/react-basics.md), [Tailwind](../../../concepts/tailwind.md)

## What it is for

The **root component**: the top of the component tree. For now it shows one card that
proves two things: the frontend runs, and it can reach the backend.
In patch 05 it will show the login screen instead.

## The code

```tsx
import { ApiStatus } from './components/ApiStatus';

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
  both ways (`flex items-center justify-center`). `p-4` keeps a margin on small screens.
- The card: white, rounded, shadowed, with our light border; `w-full max-w-sm` = full
  width on phones, but never wider than 24rem (384px).
- `<ApiStatus />` uses our own component ([ApiStatus.tsx](components/ApiStatus.tsx.md)),
  exactly like an HTML tag.

The card's classes are the same ones the original login card uses, so the next patch
starts from the right look.
