# `frontend/src/components/FullPageLoader.tsx`

> Added in **patch 06** · [View the code](../../../../../frontend/src/components/FullPageLoader.tsx)

## What it is for

A spinning icon in the middle of the screen, shown while the app is still finding out who
is logged in (usually for a split second when you open the app).

```tsx
<div role="status" aria-label="Loading" className="flex min-h-screen items-center justify-center text-text-secondary">
  <Loader2 size={24} className="animate-spin" />
</div>
```

- `Loader2` is an icon from **lucide-react**, the icon library the original app uses. Every
  icon is a React component: `<Loader2 size={24} />` draws a 24px SVG.
- `animate-spin` is a Tailwind class that rotates it forever.
- `role="status"` + `aria-label="Loading"`: a screen reader says "Loading" instead of
  describing nothing.

It lives in `components/` (not `components/ui/`) because it's a whole-page piece rather
than a small building block. Other features will use it too.
