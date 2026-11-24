import { t } from './i18n.ts';
import { inBulgaria, type Coordinates } from './boundary.ts';
import type { Site } from './coverage-sites.ts';

export interface Capture {
  id: string;
  geometry?: { type: 'Point'; coordinates: Coordinates };
  camera_type?: string;
  is_pano?: boolean;
  sequence?: string;
  width?: number;
  height?: number;
  creator?: { username?: string };
}

export const sampleLimit = 25;
const fields = 'id,geometry,is_pano,camera_type,sequence,width,height';

export class MapillaryApiError extends Error {
  readonly status: number;
  readonly code?: number;

  constructor(status: number, code?: number) {
    super(`Mapillary API returned HTTP ${status}${code ? ` (code ${code})` : ''}.`);
    this.status = status;
    this.code = code;
  }
}

export function describeError(error: unknown): string {
  if (error instanceof MapillaryApiError) {
    if (error.status === 401 || error.status === 403 || error.code === 190) {
      return t('Mapillary access was denied. Check the client token.');
    }
    return t('Mapillary is temporarily unavailable. Try again.');
  }
  if (error instanceof Error && error.name === 'TimeoutError') {
    return t('The Mapillary request timed out. Try again.');
  }
  return t('Mapillary could not complete the request. Check the connection and try again.');
}

async function request<T>(token: string, path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(path, 'https://graph.mapillary.com/');
  url.search = new URLSearchParams(params).toString();
  url.searchParams.set('access_token', token);
  const response = await fetch(url, {
    signal: AbortSignal.timeout(12_000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.error) throw new MapillaryApiError(response.status, body?.error?.code);
  if (!body) throw new Error('Empty Mapillary response');
  return body as T;
}

export async function sampleSite(token: string, { center: [lng, lat] }: Site) {
  const bbox = [lng - 0.006, lat - 0.004, lng + 0.006, lat + 0.004]
    .map(value => value.toFixed(6)).join(',');
  const response = await request<{ data: Capture[] }>(token, 'images', {
    fields, bbox, is_pano: 'true', limit: String(sampleLimit),
  });
  const panoramas = response.data.filter(image =>
    image.geometry?.type === 'Point' &&
    inBulgaria(image.geometry.coordinates) &&
    (image.camera_type === 'spherical' || (image.camera_type == null && image.is_pano === true)));
  return { returned: response.data.length, panoramas };
}

// Short-lived, bounded metadata cache also coalesces simultaneous requests.
// Keep validation in verifyCapture so edge photos and round starts retain their rules.
const captures = new Map<string, { expires: number; value: Promise<Capture> }>();
export function getCapture(token: string, id: string): Promise<Capture> {
  const key = token + ':' + id;
  const now = Date.now();
  const cached = captures.get(key);
  if (cached && cached.expires > now) return cached.value;
  const value = request<Capture>(token, encodeURIComponent(id), { fields: `${fields},creator` });
  const entry = { expires: now + 5 * 60_000, value };
  captures.delete(key);
  captures.set(key, entry);
  if (captures.size > 128) captures.delete(captures.keys().next().value!);
  void value.catch(() => { if (captures.get(key) === entry) captures.delete(key); });
  return value;
}

// One bounded metadata page. Callers control cadence and never persist paging URLs/tokens.
export async function discoverWindow(token: string, bbox: number[], after?: string) {
  return request<{ data: Capture[]; paging?: { cursors?: { after?: string }; next?: string } }>(token, 'images', {
    fields, bbox: bbox.map(n => n.toFixed(6)).join(','), is_pano: 'true', limit: '100',
    ...(after ? { after } : {}),
  });
}
