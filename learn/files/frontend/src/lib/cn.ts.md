# `frontend/src/lib/cn.ts`

> Added in **patch 05** · [View the code](../../../../../frontend/src/lib/cn.ts) · Background: [Tailwind](../../../../concepts/tailwind.md)

## What it is for

A tiny helper to **build a `className` from several pieces**. Every UI component uses it.

```ts
cn('px-4 py-2', isActive && 'bg-primary', className)
```

## The two problems it solves

**1. Conditional classes.** Writing
`` className={`px-4 ${isActive ? 'bg-primary' : ''} ${className ?? ''}`} ``
is messy. `clsx` takes any mix of strings, `false`, `undefined` and `null`, keeps only the
real strings, and joins them with spaces:

```ts
clsx('px-4', false, undefined, 'bg-primary')   // → 'px-4 bg-primary'
```

**2. Clashing Tailwind classes.** Our `Button` has `bg-primary`. If a page writes
`<Button className="bg-danger">`, the element gets *both* classes, and which one wins
depends on the order inside Tailwind's CSS file, not on the order you wrote them.
`twMerge` (from **tailwind-merge**) understands Tailwind and removes the earlier class
of each clashing pair:

```ts
twMerge('px-4 bg-primary', 'bg-danger')          // → 'px-4 bg-danger'
twMerge('text-sm text-text-secondary', 'text-danger') // → 'text-sm text-danger'
//        text-sm stays: it's a font size, not a colour
```

## The code

```ts
export function cn(...classes: ClassValue[]) {
  return twMerge(clsx(classes));
}
```
- `...classes` is a **rest parameter**: `cn(a, b, c)` receives them as one array `[a, b, c]`.
- `ClassValue` is clsx's type for "anything clsx accepts".
- First clsx cleans and joins, then twMerge resolves clashes.

The name `cn` ("class names") is a common convention in React projects that use Tailwind.
