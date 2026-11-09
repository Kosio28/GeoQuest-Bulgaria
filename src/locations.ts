import { sites, type Site } from './coverage-sites.ts';
import { MapillaryApiError, sampleSite, type Capture } from './mapillary-api.ts';
import { inBulgaria, type Coordinates } from './boundary.ts';

export type SiteResult =
  | { site: Site; sample: Awaited<ReturnType<typeof sampleSite>> }
  | { site: Site; error: unknown };

export async function scanCoverage(token: string, onResult: (result: SiteResult) => void) {
  const results: SiteResult[] = [];
  for (let i = 0; i < sites.length; i += 3) {
    const batch = await Promise.all(sites.slice(i, i + 3).map(async site => {
      try {
        return { site, sample: await sampleSite(token, site) };
      } catch (error) {
        return { site, error };
      }
    }));
    for (const result of batch) {
      onResult(result);
      results.push(result);
    }
    const rejected = batch.find(result => 'error' in result &&
      result.error instanceof MapillaryApiError &&
      ([401, 403, 429].includes(result.error.status) || result.error.code === 190));
    if (rejected && 'error' in rejected) throw rejected.error;
  }
  return results;
}

export interface Location {
  site: Site;
  image: Capture & { geometry: { type: 'Point'; coordinates: Coordinates } };
  sequenceHint: boolean;
}

// Browser-loaded spherical captures. The lab rechecks metadata before every move.
export const starterLocations: Location[] = [
  { name: 'Sofia', id: '881801330329324', coordinates: [23.3238924, 42.6907381] },
  { name: 'Varna', id: '1063700872091604', coordinates: [27.9096981, 43.2054776] },
  { name: 'Burgas', id: '1239864333821430', coordinates: [27.474234, 42.4962452] },
  { name: 'Ruse', id: '948294009987917', coordinates: [25.9607613, 43.8507664] },
  { name: 'Veliko Tarnovo', id: '1207358020530779', coordinates: [25.6425703, 43.0811246] },
  { name: 'Kazanlak', id: '1057671988635673', coordinates: [25.3883015, 42.6229173] },
  { name: 'Sandanski', id: '7174818719299336', coordinates: [23.2819695, 41.567606] },
  { name: 'Belogradchik', id: '1860040181139409', coordinates: [22.6816043, 43.6249989] },
  { name: 'Bansko', id: '1803861943503421', coordinates: [23.4822478, 41.8346764] },
].flatMap(({ name, id, coordinates }) => {
  const site = sites.find(candidate => candidate.name === name);
  const point: Coordinates = [coordinates[0], coordinates[1]];
  return site && inBulgaria(point) ? [{
    site, image: { id, geometry: { type: 'Point', coordinates: point } }, sequenceHint: true,
  }] : [];
});

export function expandPool(starters: Location[], additions: Location[]): Location[] {
  const pool = [...starters];
  for (const location of additions) {
    const [lng, lat] = location.image.geometry.coordinates;
    const nearby = pool.some(other => {
      const [otherLng, otherLat] = other.image.geometry.coordinates;
      return other.image.id === location.image.id ||
        Math.hypot((lng - otherLng) * 82_000, (lat - otherLat) * 111_000) < 120;
    });
    if (!nearby) pool.push(location);
    if (pool.length === 30) break;
  }
  return pool;
}

export function candidates(results: SiteResult[]): Location[] {
  const pool = new Map<string, Location>();
  for (const result of results) {
    if (!('sample' in result)) continue;
    const panoramas = result.sample.panoramas;
    const sequences = new Map<string, Set<string>>();
    for (const image of panoramas) {
      if (!image.sequence) continue;
      const points = sequences.get(image.sequence) ?? new Set<string>();
      points.add(image.geometry!.coordinates.join(','));
      sequences.set(image.sequence, points);
    }
    const represented = new Set<string>();
    const hasSequence = (image: Capture) =>
      image.sequence != null && (sequences.get(image.sequence)?.size ?? 0) > 1;
    const ordered = [...panoramas].sort((a, b) =>
      Number(hasSequence(b)) - Number(hasSequence(a)) || (b.width ?? 0) - (a.width ?? 0));
    for (const image of ordered) {
      const geometry = image.geometry!;
      const key = image.sequence ?? geometry.coordinates.join(',');
      if (represented.has(key) || pool.has(image.id)) continue;
      represented.add(key);
      pool.set(image.id, {
        site: result.site,
        image: { ...image, geometry },
        sequenceHint: hasSequence(image),
      });
      if (represented.size === 2) break;
    }
  }
  return [...pool.values()];
}

export class LocationPicker {
  private seen = new Set<string>();
  private regionVisits = new Map<string, number>();
  private connected = new Map<string, boolean>();
  private last?: Location;

  recordConnections(id: string, available: boolean) {
    this.connected.set(id, available);
  }

  next(pool: Location[]): Location | undefined {
    if (!pool.length) return undefined;
    let unseen = pool.filter(location => !this.seen.has(location.image.id));
    if (!unseen.length) {
      this.seen.clear();
      unseen = pool.length === 1 ? pool : pool.filter(location => location.image.id !== this.last?.image.id);
    }
    const regions = unseen.filter(location => location.site.region !== this.last?.site.region);
    const choices = regions.length ? regions : unseen;
    const visits = (location: Location) => this.regionVisits.get(location.site.region) ?? 0;
    const lowest = Math.min(...choices.map(visits));
    const regional = choices.filter(location => visits(location) === lowest);
    const priority = ({ image, sequenceHint }: Location) =>
      this.connected.get(image.id) === true ? 2 :
        this.connected.get(image.id) === false ? 0 : Number(sequenceHint);
    const best = Math.max(...regional.map(priority));
    const preferred = regional.filter(location => priority(location) === best);
    const chosen = preferred[Math.floor(Math.random() * preferred.length)];
    this.seen.add(chosen.image.id);
    this.regionVisits.set(chosen.site.region, visits(chosen) + 1);
    this.last = chosen;
    return chosen;
  }
}

