# Tailwind CSS: styling with small classes

## 1. The idea

Instead of writing CSS rules in a separate file and inventing class names, **Tailwind**
gives you thousands of tiny ready-made classes. Each one does one thing, and you combine
them directly on the element:

```tsx
<button className="bg-primary text-white px-4 py-2 rounded text-sm font-medium hover:bg-primary-dark">
  Sign In
</button>
```

Read it left to right: blue background, white text, horizontal padding 4, vertical padding
2, rounded corners, small text, medium weight, darker blue when hovered.

Why this is nice:
- You see exactly how an element looks by reading it; no hunting in CSS files.
- No naming things, and no unused CSS: Tailwind only generates the classes you use.
- Every screen uses the same spacing and colour scale, so the design stays consistent.

## 2. The spacing scale

Numbers are steps of **0.25rem = 4px** (at the default font size):
`p-1` = 4px, `p-2` = 8px, `p-4` = 16px, `p-8` = 32px.

| Prefix | Meaning | Example |
|---|---|---|
| `p-` / `px-` / `py-` / `pt-` | padding (all / left+right / top+bottom / top) | `px-4 py-2` |
| `m-` / `mx-` / `mt-` / `mb-` | margin | `mt-1`, `mx-auto` (centre horizontally) |
| `gap-` | space between flex/grid children | `gap-2` |
| `space-y-` | vertical space between children | `space-y-4` |
| `w-` / `h-` | width / height | `w-full`, `h-12`, `min-h-screen` |
| `max-w-` | maximum width | `max-w-sm` (24rem) |

## 3. Colours: our design tokens

The original GeoAnnotator colours are defined once, in `src/index.css`:

```css
@theme {
  --color-primary: #1b6ef3;
  --color-text-secondary: #718096;
  …
}
```

Each `--color-NAME` becomes classes for every property: `bg-primary`, `text-primary`,
`border-primary`, `ring-primary`… Change the value in one place and the whole app follows.

| Token | Colour | Typical use |
|---|---|---|
| `primary` | blue `#1b6ef3` | buttons, links, the logo |
| `primary-dark` | darker blue | button hover |
| `primary-light` | very light blue | login page background |
| `surface` / `surface-alt` | white / light grey | cards / page background |
| `border` | light grey | borders of cards and inputs |
| `text-primary` / `text-secondary` | near-black / grey | main text / secondary text |
| `success`, `warning`, `danger` | green, yellow, red | statuses and errors |

`/30` after a colour sets transparency: `ring-primary/30` = 30% opaque.

## 4. Layout with flexbox

```tsx
<main className="min-h-screen flex items-center justify-center">
```
- `flex`: arrange the children in a row (or `flex-col` for a column).
- `items-center`: centre them on the cross axis (vertically, for a row).
- `justify-center`: centre them along the main axis (horizontally, for a row).
- `min-h-screen`: at least as tall as the window. Together: perfectly centred content.

## 5. Text, borders, shadows

| Class | Effect |
|---|---|
| `text-xs` `text-sm` `text-base` `text-lg` `text-2xl` | font size |
| `font-medium` `font-semibold` `font-bold` | font weight |
| `text-center` | centre the text |
| `border` + `border-border` | 1px border, in our border colour |
| `rounded` `rounded-lg` `rounded-xl` | rounded corners, bigger and bigger |
| `shadow` `shadow-lg` | drop shadow |

## 6. States and screen sizes

A prefix applies a class only in some situations:

| Prefix | When | Example |
|---|---|---|
| `hover:` | mouse over | `hover:bg-primary-dark` |
| `focus:` / `focus-visible:` | element focused (keyboard) | `focus:ring-2` |
| `disabled:` | disabled element | `disabled:opacity-50` |
| `md:` / `lg:` | screen at least 768px / 1024px wide | `md:flex-row` |

## 7. Tips

- Install the VS Code extension **Tailwind CSS IntelliSense**: it autocompletes classes and
  shows the real CSS when you hover one.
- The docs are excellent: https://tailwindcss.com/docs. Search for the CSS property you
  want ("padding", "flex").
- In the browser's Elements tab you can add or remove classes live to experiment.
