# GeoQuest Bulgaria instructions

Read [DESIGN.md](./DESIGN.md) before changing frontend presentation. Preserve the
homepage-based forest green design language across all existing pages and states.

- Inspect the current implementation before editing. This is an existing vanilla
  TypeScript/Vite app; reuse working functionality and preserve unrelated changes.
- Reuse `initializeShell()` in `src/ui.ts`, `Logo()` in `src/Logo.ts`, the account
  view in `src/account-markup.ts`, and tokens/components in `src/design.css`.
  Do not duplicate navigation, account forms, button/input/card/modal styles,
  spacing scales, or brand markup. Page CSS should describe page composition.
- New routes and features must follow DESIGN.md automatically. Add shared variants
  before page-specific overrides; do not create an independent page theme.
- Preserve English and Bulgarian, including accessible names and dynamic states.
- Keep native semantic controls, visible focus, 44px targets, responsive layouts,
  and reduced-motion support. Verify 320px mobile through desktop widths.
- Presentation refactors must preserve Supabase/auth, schema and leaderboard
  contracts, score math, timers, Mapillary, location selection and the guessing map.
- Run `npm test` and `npm run build` for meaningful changes. Inspect affected
  routes and shared states visually on desktop/mobile in EN/BG. Distinguish
  isolated-fixture evidence from live provider/account verification.
- Keep screenshots and temporary browser scripts outside the repository. Do not
  commit secrets or alter unrelated source, data, migrations or pending work.
