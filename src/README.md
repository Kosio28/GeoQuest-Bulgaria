# GeoQuest source

- `play.ts` connects the five-round game to the viewer, guessing map, and results screen.
- `game.ts` contains round state, distance, and scoring independent of the UI.
- `guess-map.ts` renders the interactive MapLibre map and result overlays.
- `panorama.ts` shares capture validation and Mapillary movement between the game and lab.

- `main.ts` wires the developer interface to MapillaryJS.
- `mapillary-api.ts` queries image metadata and panorama samples.
- `locations.ts` builds and selects the region-balanced pool independently of the UI.
- `coverage-sites.ts` defines the API sample windows.
- `boundary.ts` checks image coordinates against the Bulgarian polygon in `data/bulgaria.json`.

See [setup](../README.md#setup-and-panorama-lab) and the [coverage report](../docs/MAPILLARY_COVERAGE.md).

