# `frontend/public/favicon.svg`

> Added in **patch 04** · [View the file](../../../../frontend/public/favicon.svg)

The logo shown in the browser tab: a blue rounded square with a white "G", taken from the
original app.

**SVG** is an image format written as text (XML): shapes are described, not pixels, so it
stays sharp at any size.
- `<rect … rx="14" fill="#1B6EF3"/>`: a square with rounded corners, in our primary blue.
- `<path d="…" stroke="#fff" …/>`: the "G", drawn as a thick white line.

Files in `public/` are served **as they are**, at the root of the site:
`public/favicon.svg` → http://localhost:5173/favicon.svg.
