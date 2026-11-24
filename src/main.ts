import { initializeShell } from './ui.ts';
import { initializeLanguage } from './i18n.ts';
import { isSupported, NavigationDirection, Viewer, type ViewerNavigationEdgeEvent } from 'mapillary-js';
import 'mapillary-js/dist/mapillary.css';
import './style.css';
import { moveToCapture, PanoramaError, verifyCapture, viewerComponents } from './panorama.ts';
import { candidates, expandPool, LocationPicker, scanCoverage, starterLocations } from './locations.ts';
import { describeError } from './mapillary-api.ts';

initializeShell('lab');
initializeLanguage();

const byId = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const token = import.meta.env.VITE_MAPILLARY_ACCESS_TOKEN?.trim() as string | undefined;
const random = byId<HTMLButtonElement>('random');
const scan = byId<HTMLButtonElement>('scan');
const loadId = byId<HTMLButtonElement>('load-id');
const fullscreen = byId<HTMLButtonElement>('fullscreen');
const status = byId('status');
const error = byId('error');
const edges = byId('edges');
const stage = byId('stage');
const placeholder = byId('placeholder');
const picker = new LocationPicker();
let viewer: Viewer | undefined;
let pool = starterLocations;
let busy = false;
let currentId: string | undefined;
let sequence: ViewerNavigationEdgeEvent['status'] | undefined;
let spatial: ViewerNavigationEdgeEvent['status'] | undefined;

function showError(message: string) {
  error.hidden = false;
  error.textContent = message;
  status.textContent = currentId ? 'Showing the current image.' : 'No image loaded.';
}

function setBusy(value: boolean) {
  busy = value;
  for (const button of [random, scan, loadId, ...edges.querySelectorAll('button')]) {
    button.disabled = value;
  }
}

async function run(action: (accessToken: string) => Promise<void>) {
  if (busy) return;
  if (!token) {
    showError('Mapillary token missing. Set VITE_MAPILLARY_ACCESS_TOKEN in .env.local and restart the dev server.');
    return;
  }
  error.hidden = true;
  setBusy(true);
  try {
    await action(token);
  } catch (failure) {
    showError(failure instanceof PanoramaError ? failure.message : describeError(failure));
  } finally {
    setBusy(false);
  }
}



async function refreshCoverage(accessToken: string) {
  byId<HTMLDetailsElement>('coverage').open = true;
  const samples = byId('samples');
  samples.replaceChildren();
  status.textContent = 'Sampling Mapillary coverage…';
  const results = await scanCoverage(accessToken, result => {
    const row = document.createElement('li');
    const { name, kind } = result.site;
    row.textContent = 'error' in result
      ? `${name} · ${kind} · ${describeError(result.error)}`
      : `${name} · ${kind} · ${result.sample.panoramas.length} Bulgarian panoramas from ${result.sample.returned} returned images`;
    samples.append(row);
  });
  const expanded = expandPool(starterLocations, candidates(results));
  pool = expanded;
  status.textContent = `${pool.length} starting locations available, including the verified starter set.`;
}

function renderEdges() {
  if (!currentId) return;
  const links = new Map(
    [...sequence?.edges ?? [], ...spatial?.edges ?? []]
      .filter(edge => edge.source === currentId)
      .map(edge => [edge.target, edge]),
  );
  const complete = sequence?.cached && spatial?.cached;
  if (links.size || complete) picker.recordConnections(currentId, links.size > 0);
  byId('connections').textContent = links.size
    ? `${links.size} Mapillary graph connections. Destinations are checked when selected.`
    : complete ? 'No connections in the loaded graph.' : 'Waiting for Mapillary navigation data…';
  edges.replaceChildren();
  for (const edge of links.values()) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.disabled = busy;
    button.textContent = `${NavigationDirection[edge.data.direction]} · ${edge.target}`;
    button.onclick = () => void run(accessToken => loadImage(accessToken, edge.target, byId('area').textContent ?? '—', true));
    item.append(button);
    edges.append(item);
  }
}

function getViewer(accessToken: string) {
  if (viewer) return viewer;
  if (!isSupported()) throw new PanoramaError('WebGL support is required for interactive panoramas.');
  viewer = new Viewer({
    container: byId('viewer'),
    accessToken,
    // Explicit edge buttons let the lab validate a destination before navigating.
    component: viewerComponents,
  });
  viewer.on('sequenceedges', event => { sequence = event.status; renderEdges(); });
  viewer.on('spatialedges', event => { spatial = event.status; renderEdges(); });
  new ResizeObserver(() => viewer?.resize()).observe(stage);
  return viewer;
}

async function loadImage(accessToken: string, id: string, area: string, fromEdge = false) {
  status.textContent = `Checking image ${id}…`;
  const image = await verifyCapture(accessToken, id, fromEdge);

  const activeViewer = getViewer(accessToken);
  status.textContent = `Loading image ${id}…`;
  const previous = { currentId, sequence, spatial };
  currentId = id;
  sequence = spatial = undefined;
  renderEdges();
  let loaded;
  try {
    loaded = await moveToCapture(activeViewer, id);
  } catch (failure) {
    ({ currentId, sequence, spatial } = previous);
    renderEdges();
    throw failure;
  }
  const [lng, lat] = image.geometry.coordinates;
  byId('area').textContent = area;
  byId('coords').textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  byId('image-id').textContent = id;
  byId('panoramic').textContent = loaded.cameraType === 'spherical' ? 'Yes · 360° spherical' : 'No · connected photo';
  byId('dimensions').textContent = image.width && image.height ? `${image.width} × ${image.height}` : 'Unavailable';
  byId<HTMLAnchorElement>('image-link').href = `https://www.mapillary.com/app/?pKey=${id}`;
  const username = image.creator?.username;
  const author = byId<HTMLAnchorElement>('author-link');
  author.textContent = username ?? '';
  if (username) author.href = `https://www.mapillary.com/app/user/${encodeURIComponent(username)}`;
  byId('author-credit').hidden = !username;
  byId('image-credit').hidden = false;
  placeholder.hidden = true;
  random.textContent = 'Next random panorama';
  status.textContent = 'Image loaded.';
}

random.onclick = () => void run(async accessToken => {
  const location = picker.next(pool);
  if (!location) throw new PanoramaError('The sampled areas returned no usable panoramas. Try scanning again.');
  await loadImage(accessToken, location.image.id, location.site.name);
});

scan.onclick = () => void run(refreshCoverage);
byId<HTMLFormElement>('lookup').onsubmit = event => {
  event.preventDefault();
  const id = byId<HTMLInputElement>('lookup-id').value.trim();
  if (/^\d+$/.test(id)) void run(accessToken => loadImage(accessToken, id, 'Manual lookup'));
};

function updateFullscreen() {
  const expanded = document.fullscreenElement === stage || stage.classList.contains('expanded');
  fullscreen.textContent = expanded ? 'Exit fullscreen' : 'Fullscreen';
}

fullscreen.onclick = async () => {
  if (document.fullscreenElement === stage) {
    await document.exitFullscreen().catch(() => showError('The browser could not exit fullscreen.'));
  } else if (stage.classList.contains('expanded')) {
    stage.classList.remove('expanded');
  } else {
    try {
      await stage.requestFullscreen();
    } catch {
      stage.classList.add('expanded');
    }
  }
  updateFullscreen();
};
document.addEventListener('fullscreenchange', updateFullscreen);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && stage.classList.contains('expanded')) {
    stage.classList.remove('expanded');
    updateFullscreen();
  }
});

if (!token) status.textContent = 'Mapillary client token required.';

