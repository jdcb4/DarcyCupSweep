# Design Tokens

Visual style for this project is defined as tokens: single, named values referenced everywhere they're used.

## Current implementation

The current scaffold uses plain CSS tokens in `public/assets/styles.css`. Tailwind is not installed because the initial Hono app is small, server-rendered, and does not yet need a component build pipeline.

## Token source

`public/assets/styles.css` is the current source of truth for:

- surfaces
- text colours
- accents
- borders
- shadows
- radii
- font family

## Rules

- Add or change visual values in the token block first.
- Use token variables in component/page CSS.
- Do not scatter raw colour values through app-specific selectors.
- Keep cards and panels at 8px radius or less unless this document is updated with a clear reason.

