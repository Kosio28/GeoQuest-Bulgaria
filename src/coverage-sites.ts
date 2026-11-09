import type { Coordinates } from './boundary.ts';

export interface Site {
  name: string;
  region: string;
  kind: string;
  center: Coordinates;
}

// Each center defines a small API sample window, not a claim about local imagery.
export const sites: Site[] = [
  { name: 'Sofia', region: 'West', kind: 'Major city', center: [23.3219, 42.6977] },
  { name: 'Plovdiv', region: 'South Central', kind: 'Major city', center: [24.7453, 42.1354] },
  { name: 'Varna', region: 'Northeast', kind: 'Major city', center: [27.9147, 43.2082] },
  { name: 'Burgas', region: 'Southeast', kind: 'Major city', center: [27.4711, 42.4977] },
  { name: 'Ruse', region: 'North Central', kind: 'Major city', center: [25.955, 43.8487] },
  { name: 'Stara Zagora', region: 'South Central', kind: 'Major city', center: [25.6345, 42.4258] },
  { name: 'Pleven', region: 'North Central', kind: 'Major city', center: [24.6167, 43.417] },
  { name: 'Veliko Tarnovo', region: 'North Central', kind: 'Major city', center: [25.6456, 43.0836] },
  { name: 'Bansko', region: 'Southwest', kind: 'Small town', center: [23.4873, 41.8377] },
  { name: 'Samokov', region: 'West', kind: 'Small town', center: [23.557, 42.337] },
  { name: 'Karlovo', region: 'South Central', kind: 'Small town', center: [24.804, 42.643] },
  { name: 'Troyan', region: 'North Central', kind: 'Small town', center: [24.716, 42.884] },
  { name: 'Kazanlak', region: 'South Central', kind: 'Small town', center: [25.393, 42.62] },
  { name: 'Sandanski', region: 'Southwest', kind: 'Small town', center: [23.278, 41.565] },
  { name: 'Dobrudzha near Dobrich', region: 'Northeast', kind: 'Rural roads', center: [27.736, 43.612] },
  { name: 'Koprivlen', region: 'Southwest', kind: 'Village', center: [23.833, 41.516] },
  { name: 'Oreshak', region: 'North Central', kind: 'Village', center: [24.777, 42.883] },
  { name: 'Shipka Pass', region: 'South Central', kind: 'Mountain roads', center: [25.32, 42.75] },
  { name: 'A1 Trakia near Ihtiman', region: 'West', kind: 'Highway corridor', center: [23.815, 42.44] },
  { name: 'I-9 near Obzor', region: 'Southeast', kind: 'Coastal roads', center: [27.871, 42.83] },
  { name: 'Belogradchik', region: 'Northwest', kind: 'Small town', center: [22.685, 43.625] },
];
