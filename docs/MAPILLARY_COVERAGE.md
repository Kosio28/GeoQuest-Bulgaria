# Bulgaria Mapillary imagery coverage

**9 November 2026.** The prototype queried the Mapillary Graph API with the public client token shipped in Mapillary’s official demo, used temporarily for local verification. Each site had one window extending 0.006° east and west and 0.004° north and south from the center in `src/coverage-sites.ts`. Each request asked for up to 25 panoramas. Results were checked against the Bulgarian boundary and panorama metadata. The table records the completed browser scan. A separate terminal scan returned six Sofia panoramas, illustrating that a single response is a sample. A zero means the query returned zero for that window.

| Sample area | Bulgarian panoramas returned | Representative capture loaded | Graph evidence |
| --- | ---: | --- | --- |
| Sofia | 25 | 881801330329324 | 5 edges. Followed Next to 558486230070761. |
| Plovdiv | 0 | — | — |
| Varna | 15 | 1063700872091604 | 4 edges. |
| Burgas | 12 | 1239864333821430 | 2 edges observed. |
| Ruse | 10 | 948294009987917 | 1 edge observed. |
| Stara Zagora | 0 | — | — |
| Pleven | 0 | — | — |
| Veliko Tarnovo | 24 | 1207358020530779 | 2 edges observed. |
| Bansko | 25 | 1803861943503421 | 2 edges. |
| Samokov | 0 | — | — |
| Karlovo | 0 | — | — |
| Troyan | 0 | — | — |
| Kazanlak | 25 | 1057671988635673 | 1 edge observed. |
| Sandanski | 24 | 7174818719299336 | Multiple distinct positions in a shared sequence. |
| Dobrudzha near Dobrich (rural) | 0 | — | — |
| Koprivlen (village) | 0 | — | — |
| Oreshak (village) | 0 | — | — |
| Shipka Pass (mountain area) | 25 | 1290415322406725 | 3 edges. The reviewed frame is on a slope near the monument. |
| A1 Trakia near Ihtiman (highway corridor) | 0 | — | — |
| I-9 near Obzor (coastal road) | 0 | — | — |
| Belogradchik | 25 | 1860040181139409 | Multiple distinct positions in a shared sequence. |

Every representative above loaded as a genuine spherical image at 5,760 × 2,880 source resolution. Graph counts are edges observed in MapillaryJS. Shared sequences are evidence of nearby captures, with navigation unverified. Visual spot checks found readable street context in Sofia and Bansko. The two Shipka views showed a steeply tilted horizon and a foreground person blocking part of a monument view, respectively. Road-level navigation at the pass and visual quality at the remaining sites need further review.

**Prototype verdict.** The imagery is promising for a small set of curated city and town rounds. Three starting points in Sofia, Varna, and Bansko are bundled. The scan can expand the pool to 30 distinct locations as coverage allows, using sequence evidence to prioritize candidates. The 21 windows yielded ten areas with panoramas, with coverage concentrated at the sampled city and town sites. A pool of 20–30 visually reviewed locations and continuous navigation across rural, highway, mountain, and coastal roads remain unverified.

## Sources

- [Mapillary’s official demo](https://github.com/mapillary/api-demo) and [MapillaryJS](https://mapillary.github.io/mapillary-js/docs/) informed API and viewer integration. Imagery is credited to Mapillary and its contributors under [Mapillary’s CC BY-SA policy](https://help.mapillary.com/hc/en-us/articles/115001770409-CC-BY-SA-license-for-open-data).
- The bundled polygon is the Bulgarian geometry from [Natural Earth Admin 0 Countries, 1:10m, v5.1.2](https://github.com/nvkelso/natural-earth-vector/blob/v5.1.2/geojson/ne_10m_admin_0_countries.geojson), [public domain](https://www.naturalearthdata.com/about/terms-of-use/). It is generalized near borders and coasts.
