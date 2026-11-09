import boundary from './data/bulgaria.json' with { type: 'json' };

export type Coordinates = [longitude: number, latitude: number];

function insideRing([lng, lat]: Coordinates, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[j];
    const [bx, by] = ring[i];
    if ((ay > lat) !== (by > lat) && lng < (bx - ax) * (lat - ay) / (by - ay) + ax) {
      inside = !inside;
    }
  }
  return inside;
}

// Natural Earth Admin 0 Countries, 1:10m, v5.1.2 (public domain).
export function inBulgaria(point: Coordinates): boolean {
  const [lng, lat] = point;
  return Number.isFinite(lng) && Number.isFinite(lat) &&
    insideRing(point, boundary.coordinates[0]) &&
    !boundary.coordinates.slice(1).some(hole => insideRing(point, hole));
}
