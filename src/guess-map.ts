import { t } from './i18n.ts';
import { LngLatBounds, Map, Marker, NavigationControl, setWorkerUrl, type GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type { Coordinates } from './boundary.ts';
import type { RoundResult } from './game.ts';

setWorkerUrl(workerUrl);
const sourceId = 'geoquest-results';

export class GuessMap {
  private map: Map;
  private markers: Marker[] = [];
  private rounds: readonly RoundResult[] = [];
  private observer: ResizeObserver;
  private localize: () => void;

  constructor(container: HTMLElement, choose: (point: Coordinates) => boolean, reportError: () => void) {
    this.map = new Map({
      container,
      style: {
        version: 8,
        sources: {
          streets: {
            type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256, maxzoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          },
          [sourceId]: { type: 'geojson', data: this.lines() },
        },
        layers: [
          { id: 'streets', type: 'raster', source: 'streets' },
          {
            id: sourceId, source: sourceId, type: 'line',
            paint: { 'line-color': '#36236c', 'line-width': 3, 'line-dasharray': [2, 1] },
          },
        ],
      },
      center: [25.3, 42.72], zoom: 5.4, minZoom: 2, maxZoom: 19,
      dragRotate: false, pitchWithRotate: false, touchPitch: false, renderWorldCopies: false,
      attributionControl: { compact: false },
    });
    this.map.touchZoomRotate.disableRotation();
    this.map.addControl(new NavigationControl({ showCompass: false }));
    this.localize = () => {
      for (const [selector, label] of [['.maplibregl-ctrl-zoom-in', 'Zoom in'], ['.maplibregl-ctrl-zoom-out', 'Zoom out']] as const) {
        const button = container.querySelector<HTMLButtonElement>(selector);
        button?.setAttribute('title', t(label)); button?.setAttribute('aria-label', t(label));
      }
      container.querySelector('.pin.guess')?.setAttribute('aria-label', t('Your guess'));
    };
    this.localize(); window.addEventListener('languagechange', this.localize);
    this.map.on('error', reportError);
    this.map.on('load', () => this.updateLines());
    this.map.on('click', ({ lngLat }) => {
      const point: Coordinates = [lngLat.wrap().lng, lngLat.lat];
      if (!choose(point)) return;
      this.clearMarkers();
      this.pin(point, 'guess', t('Your guess'));
    });
    this.observer = new ResizeObserver(() => this.map.resize());
    this.observer.observe(container);
  }

  reset() {
    this.clearMarkers();
    this.rounds = [];
    this.updateLines();
    this.map.resize();
    this.map.jumpTo({ center: [25.3, 42.72], zoom: 5.1 });
  }

  reveal(rounds: readonly RoundResult[]) {
    this.clearMarkers();
    this.rounds = rounds;
    this.updateLines();
    const bounds = new LngLatBounds();
    for (const [index, round] of rounds.entries()) {
      const label = rounds.length > 1 ? String(index + 1) : '';
      const same = round.meters !== null && round.meters < 1;
      if (round.guess) this.pin(round.guess, 'guess', t('Your guess'), label, same ? [-9, 0] : [0, 0]);
      this.pin(round.actual, 'actual', t('Actual location'), label, same ? [9, 0] : [0, 0]);
      if (round.guess) bounds.extend([...round.guess]);
      bounds.extend([...round.actual]);
    }
    this.map.resize();
    this.map.fitBounds(bounds, { padding: 38, maxZoom: 15, duration: 0 });
  }

  destroy() {
    window.removeEventListener('languagechange', this.localize);
    this.observer.disconnect();
    this.clearMarkers();
    this.map.remove();
  }

  private pin(point: Readonly<Coordinates>, kind: string, name: string, label = '', offset: [number, number] = [0, 0]) {
    const element = document.createElement('div');
    element.className = 'pin ' + kind;
    element.textContent = label;
    element.title = label ? name + ' · ' + t('Round') + ' ' + label : name;
    element.setAttribute('aria-label', element.title);
    this.markers.push(new Marker({ element, offset }).setLngLat([...point]).addTo(this.map));
  }

  private clearMarkers() {
    for (const marker of this.markers) marker.remove();
    this.markers = [];
  }

  private lines() {
    return {
      type: 'FeatureCollection' as const,
      features: this.rounds.filter(round => round.guess !== null).map(({ guess, actual }) => ({
        type: 'Feature' as const, properties: {},
        geometry: { type: 'LineString' as const, coordinates: [[...guess!], [...actual]] },
      })),
    };
  }

  private updateLines() {
    this.map.getSource<GeoJSONSource>(sourceId)?.setData(this.lines());
  }
}


