# GeoQuest Bulgaria design guidelines

## Brand identity

Use `Logo()` from `src/Logo.ts` for every application brand lockup. The shared
shell in `src/ui.ts` renders it on Play (including gameplay and results),
Leaderboard, and Panorama Lab. Do not duplicate the markup or restore the old
letter G icon.

`public/logo.svg` is the original supplied SVG vector and the single source for
both the logo image and browser favicon. Preserve its 64 × 64 viewBox, rounded
green tile, white location pin, and compass arrow. Do not rasterize, crop, stretch,
recolor, add a background, or apply theme filters. Its fixed artwork colors are
green `#41634E` and white `#FFFFFF`; the transparent outer inset is intentional.
All HTML entry points reference this asset as an `image/svg+xml` favicon.

## Wordmark and layout

Preserve the text **GeoQuest Bulgaria** and its existing typography: shared body
font, bold weight, letter spacing `-.035em`, and theme text color, with Bulgaria
in the theme primary color. The icon does not replace the wordmark.

- Render the icon at 44 × 44 CSS pixels, with explicit image dimensions to avoid
  layout shift and no flex shrinking.
- Keep a 12px (`--space-3`) gap between icon and wordmark; vertically center both.
- Keep the wordmark on one line. Use the existing 18px desktop and 16px mobile
  type sizes, with the existing mobile breakpoint at 760px.
- Let navigation wrap using the shared header rules. Preserve header padding,
  content alignment, and the minimum supported viewport width of 320px.
- Retain the home link and visible keyboard focus. The link has the accessible
  name “GeoQuest Bulgaria”; the adjacent icon is decorative to avoid repeating it.

## Themes and scope

Keep the icon's original colors across surfaces and system color preferences.
Wordmark colors continue to use `--color-text` and `--color-primary` so they
inherit the application theme. The current application defines a light theme;
do not introduce a new theme as part of branding changes.

Reuse `src/design.css` tokens and the existing page styles. Branding changes
must not alter page composition, gameplay, authentication, or database behavior.

## Verification

Run `npm run build`. Check both public HTML pages and the development-only lab at desktop and mobile
widths for a loaded vector icon, unchanged wordmark, consistent spacing, no
clipping, working home navigation, and the shared SVG favicon. Recheck English
and Bulgarian and system light/dark preferences when updating the lockup.

## Shared design system

The homepage is the visual reference: pale green canvas, forest green branding,
white surfaces, restrained outlines, and a clear hierarchy. All tokens live in
`src/design.css`; page CSS controls composition rather than redefining controls.
No framework or component dependency is required by this vanilla TypeScript app.

### Palette

| Token | Value | Use |
| --- | --- | --- |
| `--color-primary` | `#3d684e` | Primary actions, scores, selected controls |
| `--color-primary-hover` | `#31573f` | Primary action hover |
| `--color-secondary` | `#63796a` | Supporting labels |
| `--color-canvas` | `#f5f7f4` | Page backgrounds |
| `--color-surface` | `#ffffff` | Cards, navigation, dialogs, fields |
| `--color-soft` | `#edf3ed` | Selected rows, quiet badges, icon tiles |
| `--color-text` | `#1c2520` | Main text |
| `--color-muted` | `#5f6e64` | Descriptions and secondary text |
| `--color-border` | `#dce4db` | Surface outlines and separators |
| `--color-border-strong` | `#b5c7b7` | Form boundaries |
| `--color-error` | `#a43131` | Errors and urgent timer |
| `--color-warning` | `#8b580e` | Timer warning |
| `--color-gold` | `#947027` | Achievement accents |
| `--color-guess` | `#6440ab` | Guess marker, distinct from the green actual marker |
| `--color-viewer` | `#14241c` | Panorama background and readable overlays |

Keep the supplied logo artwork and geographic illustration colors intact.
Purple denotes a guess on the map; it is not a second brand color. Dark viewer
surfaces are intentional, while results and surrounding controls use the shared
light theme. Do not introduce page-specific gradients or alternate color schemes.

### Typography

Use `--font-body`: Inter when available, then Segoe UI and system sans-serif.
There is no external font request; Cyrillic falls back locally. Normal, medium,
semibold and bold weights are 400, 500, 600 and 700. Use the shared size tokens:
12px captions, 14px secondary copy/controls, 16px body, 18px supporting headings,
24px modal headings. Page headings scale from 32px to 56px; the homepage retains
its larger hero type. Body line height is 1.6, headings 1.15. Use tabular numbers
for scores and clocks. Do not reduce essential body copy to fit a layout.

### Spacing, surfaces, and layout

The spacing scale is 4, 8, 12, 16, 20, 24, 32, 40, 48 and 64px, exposed as
`--space-*`. Use these tokens for repeated padding and gaps. Controls use a 12px
radius, cards 20px, dialogs 24px and badges a pill radius. Small map internals
use 8px. Surfaces have a 1px outline and the shared subtle shadow tokens.

`initializeShell(page)` in `src/ui.ts` supplies the shared `Logo()`, navigation,
active route, account modal, language control, footer, and skip link. Call it
once before `initializeLanguage()` and before binding page controls. Do not
copy header or account markup into a new entry page. `account-markup.ts` owns
one account view; `account.ts` retains all account behavior. Account access is
available on every entry page using the same auth storage key.

Use `.page-container` for new standard pages. Content width is 80rem (1280px),
with responsive gutters of 20–48px; header and footer edges align with this
column. The homepage shares those dimensions. Gameplay uses the measured
`--header-height` to fill the remaining viewport; never hardcode header height.

The shared narrow-screen breakpoint is 760px. Navigation remains visible and
wraps without hiding features, with the language control beside the wordmark.
At 320px, labels use the caption size. At 1000px, split lab layouts become one
column; below 480px, the podium stacks in rank order. Tables scroll inside their
container; the whole page must not scroll horizontally. Dialogs stay within the
viewport and scroll internally. Map controls retain 44px touch targets.

### Component contract

| Element | Reuse |
| --- | --- |
| Button | Native `button`, `.button` for links, `.primary` for primary actions |
| Card | `.card`; add a composition class for layout only |
| Input / dropdown | Native labelled `input`, `select`, `textarea`; shared base rules |
| Modal | Native `dialog.modal`, opened with `showModal()` |
| Navigation | `initializeShell()`; use `aria-current="page"` |
| Score | `.score-display`; locale-aware number formatting in its controller |
| Difficulty / eligibility | `.badge` or `.difficulty-badge`; always a text label |
| Loading | `.loading::before` or `.spinner`, with a nearby `role="status"` |
| Notification | Inline `role="status"`; `showToast(message)` for nonblocking failures |
| Tooltip | Native `title` alongside an accessible name; never essential instructions |
| Icons | `icon()` from `ui.ts`, 24px viewBox, 1.7px rounded currentColor strokes |

Keep loading indicators for actual loading only; failed game loads hide the
spinner and expose the existing retry control. Keep form validation beside the
field, and error/retry messages visible until acted upon. Toasts use a polite
live region, a dismissal button, and a seven-second lifetime. Do not use toast
messages as the only record of important errors. Do not add unused parallel
component systems or replace accessible native selects/dialogs with custom widgets.

### Interaction and motion

All actionable controls have a visible 3px forest green keyboard outline with a
3px offset. Hover changes background and border over 150ms. Use the 250ms token
for resizing the guessing map; a modal may fade/translate 6px over 150ms. Preserve
existing perfect-score celebration behavior. Honor `prefers-reduced-motion`
across scrolling, transitions and animation. Avoid looping decorative motion.
Native dialogs trap focus, support Escape and restore focus; the shell also
supports dismissal by clicking outside their bounding box.

### Language and future work

Every visible label and accessible name must support English and Bulgarian.
Use `data-en`/`data-bg` for static paired strings or `t()` for controller text;
mark controller-owned containers `data-dynamic` where appropriate. Preserve
technical IDs, proper names and attribution. Test long Bulgarian labels and
switching languages while dialogs or results are visible.

Before adding or changing a screen, inspect existing classes and controller
contracts, reuse them, and add a token only when it represents a reusable design
decision. A shared component change must work across Play, Leaderboard and Lab,
including account dialogs and gameplay/results states. Keep scoring, timing,
location selection, map integration, Supabase/auth and database contracts outside
presentation-only work.

### Route and state inventory

- `/` and `/index.html`: homepage, mode/difficulty dialog, loading/retry,
  panorama gameplay, map, round result, final summary and replay.
- `/leaderboard.html`: filters, loading/retry, empty/podium/table/pagination,
  and authenticated personal record.
- Development-only `/lab.html`: retained panorama viewer, fullscreen, lookup, coverage and navigation tools. This page is excluded from public navigation and production build inputs by a separate concurrent change.
- All three: signed-out sign-in/registration, signed-in public username settings,
  email, score history, paging and sign-out in the shared account dialog.

There are no standalone login, registration, profile, settings or error routes.
Their existing states use the shared surfaces; do not invent duplicate pages.

For verification run `npm test` and `npm run build`, then inspect desktop,
laptop, tablet and mobile, both languages, signed-out and signed-in states.
Use isolated backend fixtures for writes and label them as fixtures; never claim
they verify live authentication or saving. Check console health, meaningful page
content, touch/keyboard actions, overflow, long labels, reduced motion, modal
focus, filters, game results and replay. Preserve any concurrently edited source.
