# `frontend/src/index.css`

> Added in **patch 04** · [View the code](../../../../frontend/src/index.css) · Background: [Tailwind CSS](../../../concepts/tailwind.md)

## What it is for

The app's **only CSS file**. It loads Tailwind, loads the font, and defines our design
tokens (colours and font). Everything else is styled with Tailwind classes in the components.

## Piece by piece

```css
@import 'tailwindcss';
@import '@fontsource-variable/inter';
```
- Load Tailwind: its base styles and every utility class we use.
- Load the Inter font files from the installed package. Vite copies them into the build,
  so the app doesn't depend on Google Fonts being reachable.

```css
@theme {
  --font-sans: 'Inter Variable', system-ui, sans-serif;

  --color-primary: #1b6ef3;
  --color-primary-dark: #1251c1;
  --color-primary-light: #eef2ff;
  …
}
```
`@theme` is Tailwind 4's way to define **design tokens**. They are CSS variables with
special names:
- `--font-sans` sets the default font for the whole page. If Inter isn't loaded yet, the
  browser falls back to `system-ui`, the operating system's font.
- Every `--color-NAME` creates classes `bg-NAME`, `text-NAME`, `border-NAME`, `ring-NAME`…
  So `--color-text-secondary` gives `text-text-secondary` (grey text), and `--color-border`
  gives `border-border`.

These values are copied from the original GeoAnnotator, so the screens look the same.
Colours are written in **hex**: `#1b6ef3` = red `1b`, green `6e`, blue `f3`, each from `00`
to `ff`.

```css
@layer base {
  body {
    @apply bg-surface-alt text-text-primary antialiased;
  }
}
```
Default styles for the whole page: light grey background, near-black text, smoother font
edges. `@apply` uses Tailwind classes inside CSS; `@layer base` puts these rules *under*
the utility classes, so a class on an element can still override them.
