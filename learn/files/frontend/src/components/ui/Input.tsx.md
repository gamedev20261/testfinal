# `frontend/src/components/ui/Input.tsx`

> Added in **patch 05** · [View the code](../../../../../../frontend/src/components/ui/Input.tsx)

## What it is for

The app's text input: one look for every email, password, name and search box.
It works exactly like a normal `<input>` (any prop is passed through), and turns red when
marked invalid.

```tsx
<Input id="email" type="email" placeholder="name@organization.com" {...register('email')} />
```

## The code

```tsx
export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'w-full rounded border border-border bg-white px-3 py-2 text-sm',
        'placeholder:text-text-secondary/60',
        'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30',
        'aria-invalid:border-danger aria-invalid:focus:ring-danger/30',
        className,
      )}
      {...props}
    />
  );
}
```

The same pattern as [`Button`](Button.tsx.md): accept all normal `<input>` props, add our
classes, and let the caller's `className` win.

| Classes | Effect |
|---|---|
| `w-full rounded border border-border bg-white px-3 py-2 text-sm` | The base look, copied from the original `.input-field` |
| `placeholder:text-text-secondary/60` | The grey hint text (`name@organization.com`), at 60% opacity |
| `focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30` | When the input has the cursor: blue border and a soft blue glow (*ring*) instead of the browser's default outline |
| `aria-invalid:border-danger aria-invalid:focus:ring-danger/30` | When the input has `aria-invalid="true"`: red border and red glow |

## Styling from `aria-invalid`

Instead of a separate `error` prop, the red look comes from the **accessibility attribute**
the page already sets for screen readers. One attribute does both jobs, so the visual and
the screen-reader state can never disagree.

## How `register` reaches the real input

React Hook Form's `register('email')` returns props including a **`ref`**, a direct handle
on the DOM element that the library uses to read the value. In React 19, `ref` is a normal
prop for function components, so `{...props}` passes it straight to the `<input>`.
