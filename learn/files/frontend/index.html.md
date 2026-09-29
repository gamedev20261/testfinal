# `frontend/index.html`

> Added in **patch 04** · [View the file](../../../frontend/index.html) · Background: [How a web page works](../../concepts/how-a-web-page-works.md)

## What it is for

The **only HTML page** of the app. The browser downloads it first. It's almost empty
on purpose: React builds everything else ([single-page application](../../concepts/how-a-web-page-works.md#3-a-single-page-application)).

## Line by line

```html
<!doctype html>
<html lang="en">
```
"This is a modern HTML page, in English." `lang` helps screen readers and translators.

```html
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GeoAnnotator</title>
  </head>
```
The `<head>` holds information *about* the page, nothing visible:
- `charset="UTF-8"`: which text encoding to use (so `…`, `·` and `é` display correctly).
- `icon`: the little logo in the browser tab, from [`public/favicon.svg`](public/favicon.svg.md).
- `viewport`: on phones, use the real screen width instead of pretending to be a desktop.
- `<title>`: the text in the browser tab.

```html
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
```
- `<div id="root">`: an empty box. React will draw the whole app inside it.
- `<script type="module" src="/src/main.tsx">`: load our code, starting with
  [`main.tsx`](src/main.tsx.md). A `.tsx` file can't run in a browser, but Vite translates
  it on the fly when the browser asks for it.
