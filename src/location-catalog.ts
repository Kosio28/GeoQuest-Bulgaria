import { inBulgaria, type Coordinates } from './boundary.ts';
import { distanceMeters } from './game.ts';
import type { Capture } from './mapillary-api.ts';
import type { Location } from './locations.ts';

export interface CatalogEntry {
  id: string;
  coordinates: Coordinates;
  sequence?: string;
  region: string;
  environment: 'urban' | 'rural' | 'unknown';
  verifiedAt: string;
  cameraType: 'spherical';
  verification: 'metadata';
}

// Geographic strata, deliberately not represented as administrative boundaries.
export function regionOf([lng, lat]: Coordinates) {
  return (lat >= 42.8 ? 'North' : 'South') + (lng < 24.2 ? 'west' : lng < 26.2 ? ' Central' : 'east');
}

// Conservative settlement proximity proxy, not a claim about road type or land use.
const settlements: [number, number, number][] = [
  [23.322,42.698,9000], [24.745,42.135,6000], [27.915,43.208,6000], [27.471,42.498,5000],
  [25.955,43.849,4500], [25.635,42.426,4000], [24.617,43.417,4000], [25.646,43.084,3000],
  [27.833,43.567,3500], [26.922,43.271,3500], [26.325,42.682,3500], [26.51,42.484,3500],
  [22.875,43.99,3000], [23.225,43.412,3000], [23.55,43.21,3000], [25.335,42.874,3000],
  [24.333,42.192,3500], [25.555,41.934,3500], [25.373,41.634,3000], [24.713,41.577,3000],
  [23.095,42.61,3500], [23.094,42.02,3000], [22.691,42.283,3000], [23.487,41.838,2000],
  [23.278,41.565,2000], [25.393,42.62,2500], [24.804,42.643,2000], [24.716,42.884,2000],
  [22.685,43.625,1500], [23.557,42.337,2500], [26.524,43.527,2500], [26.572,43.25,2500],
];
export function environmentOf(point: Coordinates): CatalogEntry['environment'] {
  const ratios = settlements.map(([lng,lat,radius]) => distanceMeters(point,[lng,lat])/radius);
  return Math.min(...ratios) <= 1 ? 'urban' : Math.min(...ratios) >= 2 ? 'rural' : 'unknown';
}

export function separation(entry: Pick<CatalogEntry, 'environment'>) {
  return entry.environment === 'urban' ? 1500 : 3000;
}
export function distinctEntries(entries: CatalogEntry[]) {
  const kept: CatalogEntry[] = [];
  for (const entry of entries) {
    if (!validEntry(entry) || kept.some(other => other.id === entry.id ||
      distanceMeters(other.coordinates, entry.coordinates) < Math.max(separation(other), separation(entry)))) continue;
    kept.push(entry);
  }
  return kept;
}
export function validEntry(value: unknown): value is CatalogEntry {
  if (!value || typeof value !== 'object') return false;
  const e = value as CatalogEntry;
  return /^\d+$/.test(e.id) && Array.isArray(e.coordinates) && e.coordinates.length === 2 &&
    inBulgaria(e.coordinates) && e.cameraType === 'spherical' && e.verification === 'metadata' &&
    ['urban','rural','unknown'].includes(e.environment) && e.region === regionOf(e.coordinates) &&
    Number.isFinite(Date.parse(e.verifiedAt));
}
export function entryFromCapture(image: Capture): CatalogEntry | undefined {
  if (image.camera_type !== 'spherical' || !image.geometry || !inBulgaria(image.geometry.coordinates)) return;
  const coordinates = image.geometry.coordinates;
  return { id: image.id, coordinates, sequence: image.sequence, region: regionOf(coordinates),
    environment: environmentOf(coordinates), cameraType: 'spherical', verification: 'metadata', verifiedAt: new Date().toISOString() };
}
export function asLocation(entry: CatalogEntry): Location {
  return { site: { name: entry.region, region: entry.region, kind: entry.environment, center: entry.coordinates },
    image: { id: entry.id, camera_type: 'spherical', geometry: { type: 'Point', coordinates: entry.coordinates }, sequence: entry.sequence },
    sequenceHint: Boolean(entry.sequence) };
}
