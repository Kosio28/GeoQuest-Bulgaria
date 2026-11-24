# Gameplay upgrade and reference homepage

The homepage follows the user's second supplied screenshot (light background, green brand, three-line headline, landscape illustration, paired actions, statistics and three instruction cards). The dark generated concept was discarded. The illustration is an original code-native SVG based on that reference, with no external asset service or licensing dependency. Start game opens a settings dialog so the reference layout stays intact. Account/profile controls and concurrently developed navigation are preserved.

## Gameplay

- Classic and No Move remain separate from Relaxed / Easy / Normal / Hard / Expert difficulty (unlimited / 120 / 60 / 30 / 15 seconds).
- The clock starts after the initial Mapillary move resolves and the map is initialized. Absolute deadlines are checked on interval callbacks, focus, visibility changes, marker placement and submission. Loading is excluded. A late callback cannot grant extra time.
- Timeout submits the last placed guess, or records zero with null guess/distance. The existing exponential distance curve and 5,000-per-round / 25,000-per-game limits are unchanged. Error aggregates include only rounds with guesses; missed rounds remain explicit in the summary.
- Mouse entry expands the same map instance upwards/leftwards over 250 ms. Pointer interaction, control focus and pinning keep it open. ResizeObserver resizes the canvas throughout the transition. Touch opens on the first tap and places a marker on a subsequent tap.
- A successful 5,000-point round submission triggers the 2.7-second celebration once. Result rendering, language switching, summary and refresh do not trigger it. Reduced motion uses a static counter with no particles. Continuing immediately dismisses it.
- New UI and account flows support Bulgarian and English. The homepage stylesheet is separate from gameplay/shared styles.

## Database migration

`supabase/migrations/20261124183303_gameplay_settings.sql` adds nullable difficulty, time limit and scoring version columns. No old score is updated or assigned a difficulty. A before-insert trigger derives the nominal time limit for a new score from its supplied difficulty. Relaxed and unknown historical difficulty retain a null time limit.

The current shared checkout also contains score submission RPC work developed separately. Gameplay passes the stable per-game ID, mode, difficulty and total; the RPC supplies completion time and scoring version, and the trigger supplies time limit. Pending-score retries reuse the same ID. Deploy the compatible migrations in timestamp order through the existing deployment process; review them before production application. This gameplay task did not issue production SQL or apply migrations. Deployment activity from another chat is outside these verification claims.

## Verification (2026-11-24)

Automated: `npm test` passed 17 tests, including the original five gameplay tests, deadline/reset/race/missed-guess cases, and isolated Postgres checks of history preservation and all five time limits. The shared checkout's existing leaderboard SQL tests also passed. `npm run build` passed; the existing map/viewer bundles still produce the Vite size warning.

Rendered environment: http://127.0.0.1:5174/, installed Chrome through Playwright, because Browser plugin was not available. Desktop 1440 × 1000 and reference-native 2870 × 1541; mobile 390 × 844 with touch emulation. Page identity, meaningful content, absence of a framework overlay, and page runtime errors were checked. No application runtime errors were seen in the tested flows.

Live Mapillary/OSM checks: hover/shrink, pin, center/zoom/marker preservation, selected-guess timeout, empty timeout, all five rounds, final summary and restart. Mobile first-tap expansion and second-tap placement, No Move, Relaxed, and translated results passed. Each difficulty's starting countdown was checked after deliberately delaying metadata loading; loading time was excluded. Perfect counter, particles, lifetime and reduced-motion behavior passed.

Account verification used intercepted Supabase responses: registration confirmation, login, owner history, personal best, score RPC difficulty/mode payload, personal-best response and language switching. No real account was created and no test score was written to production. Actual production registration/email delivery, login credentials, and score persistence require an authenticated live check.

Reference comparison used local image inspection of the supplied screenshot and final screenshots. Checked palette, headline line breaks, hero proportions/spacing, illustration, buttons, instruction cards and mobile stacking. Intentional differences: 5,000 is labelled points per round to preserve the actual scoring meaning; functional account/navigation controls remain; settings are in a dialog. System font rendering can vary from the screenshot.
