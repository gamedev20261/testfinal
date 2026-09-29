# `frontend/src/main.tsx`

> Added in **patch 04** · [View the code](../../../../frontend/src/main.tsx) · Background: [React basics](../../../concepts/react-basics.md)

## What it is for

The frontend's **entry point**: the first file of our code that runs in the browser
(`index.html` loads it). It starts React and puts the app on the page.

## The code

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
```
- `import './index.css'` has no name: it just loads the CSS (Tailwind + our tokens)
  into the page.

```tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```
- `document.getElementById('root')` finds `<div id="root">` from `index.html`.
  The `!` tells TypeScript "I'm sure it exists" (the function could return `null`).
- `createRoot(…)` hands that div to React, and `.render(…)` draws our component tree in it.
- `<App />` is the top of the tree ([App.tsx](App.tsx.md)).
- `<StrictMode>` is a development helper that runs some code twice to reveal bugs early
  (see [React basics → StrictMode](../../../concepts/react-basics.md#8-strictmode)).
  It has no effect in production.

In patch 06 this file also sets up the app-wide **providers** (routing and data fetching),
because they must wrap the whole app.
