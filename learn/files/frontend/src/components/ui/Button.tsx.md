# `frontend/src/components/ui/Button.tsx`

> Added in **patch 05** · [View the code](../../../../../../frontend/src/components/ui/Button.tsx) · Background: [React basics → props](../../../../../concepts/react-basics.md#3-props-passing-data-into-a-component)

## What it is for

**The** button of the app. Every screen uses it, so all buttons look and behave the same,
and changing the design means editing one file.

```tsx
<Button type="submit">Sign In</Button>
<Button variant="secondary" onClick={close}>Cancel</Button>
<Button variant="danger" onClick={remove}>Delete user</Button>
<Button className="w-full" disabled>Signing in…</Button>
```

## The code, piece by piece

### Variants

```ts
const variants = {
  primary: 'bg-primary text-white hover:bg-primary-dark',
  secondary: 'bg-white text-text-primary border border-border hover:bg-surface-alt',
  danger: 'bg-danger text-white hover:bg-red-600',
};
```
The three looks, copied from the original app's `.btn-primary`, `.btn-secondary` and
`.btn-danger`. A plain object: the key is the variant name, the value its classes.

### The props type

```ts
type ButtonProps = ComponentProps<'button'> & {
  variant?: keyof typeof variants;
};
```
- `ComponentProps<'button'>`: **every prop a normal `<button>` accepts** (`type`, `onClick`,
  `disabled`, `children`, `aria-*`…). So our Button works anywhere a button would.
- `& { variant?: … }`: plus our own optional prop.
- `keyof typeof variants`: the keys of the object, i.e. `'primary' | 'secondary' | 'danger'`.
  Adding a fourth variant to the object automatically allows it here.

### The component

```tsx
export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
```
**Destructuring** the props: take `variant` (default `'primary'`) and `className` out, and
collect *everything else* into `props` (the `...` rest syntax).

```tsx
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
```
- The classes, grouped by purpose: shape and text; the keyboard focus ring; the disabled
  look; the variant's colours; and last, the caller's `className`, which wins any clash
  thanks to [`cn`](../../lib/cn.ts.md).
- `focus-visible:` shows a ring only when focused **with the keyboard** (Tab), not on mouse
  clicks. It's how keyboard users see where they are.
- `{...props}` passes everything else to the real `<button>`: `type`, `onClick`,
  `disabled`, and the `children` (the text between the tags).
- `<button … />` is self-closing here because `children` arrives through `props`.

## Try it

In `LoginPage.tsx`, add `variant="secondary"` to the Sign In button and look at the page.
Then try `variant="danger"`. Then try `variant="big"`: TypeScript refuses it.
