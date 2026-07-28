/**
 * Tailwind v4 needs no JS config file — the design system lives in CSS (`src/app/globals.css`),
 * which is the right place for it here: `tokens.css` is transcribed from
 * docs/04_UX_DESIGN_SYSTEM.md §2 and stays the single source of truth.
 */
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
