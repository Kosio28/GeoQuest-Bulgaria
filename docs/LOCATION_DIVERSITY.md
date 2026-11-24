# Location diversity — 24 November 2026

## Cause, established before changing selection

Gameplay used `starterLocations` exclusively: **9 hardcoded IDs at 9 different places**.
Their positions are widely separated; duplicate-looking neighboring IDs were not the
cause in that original gameplay pool. Lab discovery never fed gameplay. Its separate
scan sampled only 21 small windows, retained at most two sequences per site, and
`expandPool` stopped at 30 with only 120 m of separation. Those rules would also
understate useful coverage and admit starts on effectively the same street.

`Math.random()` was functioning. The old picker preferred least-visited regions and
connected captures, but a fresh picker was constructed for each game. No history
survived a new game or refresh. The regional labels were uneven too: North Central
had Ruse and Veliko Tarnovo, Southwest had Bansko and Sandanski, and each other
represented region had one starter. Connectivity priority could further narrow
choices. Five rounds drawn from nine starts inevitably overlap substantially.

## Verified catalog and provider limits

The new catalog contains **471 distinct Mapillary panoramas**, individually checked
through Graph metadata for `camera_type=spherical` and coordinates inside the
existing Natural Earth Bulgaria polygon. Coordinates come from Graph, never from
invented places or ordinary photographs. Pairwise exclusions are at least 1.5 km
in estimated urban areas and 3 km elsewhere, using the larger radius of each pair.
Different IDs within that distance count as one location.

The initial countrywide scan used 24 zoom-8 sequence tiles, finding 8,312 panorama
sequence representatives. Geographic thinning yielded 475 candidates; individual
Graph checks retained 460 distinct locations. Two image-tile refinement passes
added 8 and 3. Discovery used **599 requests**, including 501 individual metadata
checks; two transient requests failed. The counts and sampling limits are recorded
in [LOCATION_DISCOVERY.json](LOCATION_DISCOVERY.json).

**The 100-location minimum is met; the preferred 500 target was not reached.** This
bounded scan is not a census and does not establish a maximum on suitable imagery.
Metadata verification does not guarantee that every image tile can currently load.
Gameplay rechecks each start and skips provider/load failures before starting its
timer or recording played history. Each round/retry is capped at eight attempted
starts to bound requests during a provider outage.

| Geographic stratum | Catalog | First 100 selections |
| --- | ---: | ---: |
| Northwest | 78 | 16 |
| North Central | 46 | 16 |
| Northeast | 29 | 16 |
| Southwest | 200 | 19 |
| South Central | 95 | 17 |
| Southeast | 23 | 16 |

Strata are geographic longitude/latitude bands, not official administrative regions.
The underlying imagery is concentrated in the southwest; selection balances it
while unseen candidates remain available. With an uneven finite pool, exhausting
all IDs once cannot also give perfectly equal regional totals over an entire cycle.

The catalog includes starts near Sofia, Plovdiv, Varna, Burgas, Ruse, Stara Zagora,
Pleven, Veliko Tarnovo, Bansko, Sandanski, Belogradchik, Kazanlak, Oreshak and Shipka
Pass. For example, verified captures are 223 m from the Bansko sample center,
1.18 km from Oreshak and 230 m from the Shipka Pass sample center. These are proximity
checks, not visual certification of road types. The scan found no retained start
within 5 km of the existing Dobrich rural, Koprivlen, Ihtiman highway or Obzor coastal
sample centers. Comprehensive highway, village and coastal-road coverage remains
unverified; those categories have not been fabricated to meet a quota.

Urban/rural classification is a conservative distance-to-settlement proxy using
32 settlement centers and explicit urban/fringe radii. The catalog has **60 estimated
urban, 376 estimated rural and 35 unknown** entries. Small villages may fall within
the rural estimate. These figures are not authoritative land-use classification.

## Selection and persistence

`GeographicPicker` maintains a Fisher–Yates shuffled ID queue, a consumed-cycle list,
and the last 300 successful starts under `geoquest-location-history-v1` in browser
storage. New games reset only the current game's exclusions. New catalog IDs join
the queue; retired IDs disappear. Failed loads consume a queue attempt but do not
enter played history or affect regional counts.

Current-game ID and density-aware geographic exclusions are hard constraints.
Recent avoidance uses up to 100 starts (40% of a small pool). Selection prefers
50 km separation from the game's starts and the last five starts, relaxing to
20/10/5 km and ultimately the hard 1.5/3 km radius if necessary. Regional counts
over the recent 30 starts break preferences, with a penalty after two urban starts
in a game. Connectivity does not steer gameplay back toward familiar places.

Exhaustion reshuffles with the same geographic and current-game exclusions.
If no valid location remains within a game, selection returns unavailable rather
than repeating a location. Corrupt, blocked or full browser storage falls back to
memory; persistence naturally cannot work when the browser refuses storage.

## Shared catalog and periodic discovery

The existing Supabase project now has 471 rows in `public.location_catalog`. The
additive migration stores only identifiers, coordinates, sequence, geographic
stratum, environment estimate, verification time and status. RLS lets guests and
signed-in users read verified rows and denies browser writes. Existing account,
score, leaderboard and timer contracts are untouched. No image or thumbnail data
is stored in Supabase.

Browsers fetch the shared catalog at most once daily after gameplay code loads,
with a 4-second timeout and a bundled catalog fallback. A successful response is
authoritative, so retired rows are not resurrected from the bundle. The shared
catalog is currently limited to 1,000 rows per browser fetch; paginate before
growing beyond that. There is no per-player discovery fan-out.

Periodic discovery is practical as trusted maintenance, for example weekly:

```powershell
npm run locations:discover
npm run locations:refine
npm run locations:simulate
npm test
npm run locations:publish
```

No recurring job was installed. These commands can be invoked by an existing local
scheduler. Discovery has a configurable request budget (`LOCATION_REQUEST_BUDGET`,
default 800) and target (`LOCATION_TARGET`, default 500). Sequence tile metadata is
cached locally for seven days; graph verification is refreshed per run. Refinement
has a separate hard cap of 24 sequence tiles, 120 point tiles and two metadata
checks per point tile. Calls are sequential with a 350 ms pause, timeouts, and
immediate stops on HTTP 401/403/429; there is no automatic retry storm. Failed
small scans do not replace an existing catalog with fewer than 100 entries.

Publishing requires a server-only `SUPABASE_SERVICE_ROLE_KEY`; never put it in a
`VITE_` variable. The initial publication used the connected Supabase tool, without
creating or exposing such a key locally. Future publication upserts verified
metadata and retires IDs explicitly found missing or no longer spherical/in-country;
transient errors are not treated as proof of removal. No new paid service is used.

[Mapillary's official integration example](https://github.com/mapillary/api-demo/)
documents coverage tiles and Graph metadata. Bbox image searches are now limited
to less than 0.01 square degrees; this was also confirmed by live API responses.
Countrywide discovery therefore uses coverage tiles, as recommended by
[Mapillary staff](https://forum.mapillary.com/t/webapp-ai-fetch-issue-looking-for-help/9973).
Only metadata is retained; imagery stays with Mapillary. The viewer keeps visible
Mapillary/contributor attribution and the
[CC BY-SA link required for imagery](https://help.mapillary.com/hc/en-us/articles/115001770409-CC-BY-SA-license-for-open-data).
Check current application terms and quota in the developer dashboard before
raising maintenance budgets; the public terms/docs pages required login during
this run.

## Validation

`npm run locations:simulate` uses seed 42 for 20 five-round games, reconstructing
the picker from persisted storage between games. Results:

- 100 selections, 100 unique panorama IDs, 100 geographically distinct places.
- Zero repeats overall and within games; minimum within-game separation 50,485 m.
- Estimated urban/rural/unknown distribution: **13 / 82 / 5**.
- Geographic distribution appears in the table above; complete selected IDs are in
  [LOCATION_SIMULATION.json](LOCATION_SIMULATION.json).

Automated tests exercise refresh persistence, failed-load exclusions, small-pool
exhaustion, nearby alternate IDs, corrupt/blocked storage, catalog validation,
and both Supabase browser roles' read/write restrictions in isolated Postgres.
Existing scoring, five-round, timer and leaderboard tests are retained. Production
build and browser validation are reported separately from the metadata audit.

Final checks: **26 automated tests passed; production build passed**, with the
existing large-bundle warning. Public database readback confirmed 471 unique,
spherical, verified records. Security advisors reported no finding on the new
catalog; existing leaderboard/auth advisories were outside this change.

Browser QA used installed Playwright with Edge because the Browser plugin was not
available. At `http://127.0.0.1:5178/`, two complete real-provider games passed:
Classic at 1440×1000, followed by No Move at 390×844 after a browser refresh. Ten
panoramas loaded, all ten IDs were unique, persisted history contained ten starts,
and guessing, round results, summaries and returning home worked. Page identity,
meaningful content, absence of framework error overlays, screenshots and target
interactions passed. There were no app/console errors. Mapillary emitted nine
missing optional mesh warnings without preventing image rendering. Screenshots
and temporary test scripts were kept outside the repository.

A separate fixture at 320×844 in Bulgarian intercepted all Mapillary metadata
calls with HTTP 404: exactly eight attempts occurred, the translated retry state
appeared, no played history was recorded and no horizontal overflow occurred.
This fixture verifies failure handling, not live provider availability. New
account sign-in and all 471 image renders were not manually tested.
