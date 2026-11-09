import { isSupported, NavigationDirection, Viewer, type ViewerNavigationEdgeEvent } from 'mapillary-js';
import 'mapillary-js/dist/mapillary.css';
import './play.css';
import { Game, MAX_GAME_SCORE, ROUND_COUNT, type Mode } from './game.ts';
import { GuessMap } from './guess-map.ts';
import { LocationPicker, starterLocations } from './locations.ts';
import { describeError, MapillaryApiError } from './mapillary-api.ts';
import { moveToCapture, PanoramaError, verifyCapture, viewerComponents } from './panorama.ts';

const byId = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const token = import.meta.env.VITE_MAPILLARY_ACCESS_TOKEN?.trim() as string | undefined;
const stage = byId('stage');
const panel = byId('map-panel');
const viewerContainer = byId('viewer');
const guessButton = byId<HTMLButtonElement>('guess');
const toggle = byId<HTMLButtonElement>('toggle-map');
const retry = byId<HTMLButtonElement>('retry');
const next = byId<HTMLButtonElement>('next');
const moves = byId('moves');
const exploreStatus = byId('explore-status');
const loadStatus = byId('load-status');
const mapError = byId('map-error');
const progress = byId('progress');
const number = new Intl.NumberFormat('en');
const points = (value: number) => number.format(value);
const distance = (meters: number) => meters < 1000 ? number.format(Math.round(meters)) + ' m' : (meters / 1000).toFixed(2) + ' km';
const failureText = (error: unknown) => error instanceof PanoramaError ? error.message : describeError(error);

let game: Game;
let viewer: Viewer | undefined;
let map: GuessMap | undefined;
let picker: LocationPicker;
let used: Set<string>;
let busy = false;
let currentId: string | undefined;
let movingTo: string | undefined;
const edgeStatuses = new Map<string, Partial<Record<'sequenceedges' | 'spatialedges', ViewerNavigationEdgeEvent['status']>>>();

function setExpanded(expanded: boolean) {
  panel.classList.toggle('expanded', expanded);
  toggle.setAttribute('aria-expanded', String(expanded));
  toggle.textContent = expanded ? 'Shrink map' : 'Expand map';
}

toggle.onclick = () => setExpanded(!panel.classList.contains('expanded'));

function updateProgress() {
  progress.textContent = (game.mode === 'classic' ? 'Classic' : 'No Move') +
    ' · Round ' + game.round + '/' + ROUND_COUNT + ' · ' + points(game.totalPoints) + ' pts';
}

function getViewer(accessToken: string) {
  if (viewer) return viewer;
  if (!isSupported()) throw new PanoramaError('WebGL support is required for interactive panoramas.');
  viewer = new Viewer({ container: viewerContainer, accessToken, component: viewerComponents });
  const onEdges = ({ type, status }: ViewerNavigationEdgeEvent) => {
    if (game.mode === 'no-move') return;
    const id = status.edges[0]?.source ?? movingTo ?? currentId;
    if (!id) return;
    const statuses = edgeStatuses.get(id) ?? {};
    statuses[type] = status;
    edgeStatuses.set(id, statuses);
    if (!busy && id === currentId) renderMoves();
  };
  viewer.on('sequenceedges', onEdges);
  viewer.on('spatialedges', onEdges);
  new ResizeObserver(() => {
    if (!viewerContainer.hidden) viewer?.resize();
  }).observe(viewerContainer);
  return viewer;
}

const movementLabels: Partial<Record<NavigationDirection, string>> = {
  [NavigationDirection.Next]: 'Next photo',
  [NavigationDirection.Prev]: 'Previous photo',
  [NavigationDirection.StepForward]: 'Step forward',
  [NavigationDirection.StepBackward]: 'Step back',
  [NavigationDirection.StepLeft]: 'Step left',
  [NavigationDirection.StepRight]: 'Step right',
  [NavigationDirection.TurnLeft]: 'Turn left',
  [NavigationDirection.TurnRight]: 'Turn right',
  [NavigationDirection.TurnU]: 'Turn around',
};

function renderMoves(message?: string) {
  moves.replaceChildren();
  if (!game.canMove || !currentId) {
    exploreStatus.textContent = 'No Move · Drag to look around. Scroll to zoom.';
    return;
  }
  const { sequenceedges, spatialedges } = edgeStatuses.get(currentId) ?? {};
  const edges = new Map([...sequenceedges?.edges ?? [], ...spatialedges?.edges ?? []]
    .filter(edge => edge.source === currentId && edge.target !== currentId)
    .map(edge => [edge.target, edge]));
  const complete = sequenceedges?.cached && spatialedges?.cached;
  if (edges.size || complete) picker.recordConnections(currentId, edges.size > 0);
  exploreStatus.textContent = message ?? (busy ? 'Moving…' : edges.size ? 'Drag to look around. Scroll to zoom.'
    : complete ? 'No connected photos here. You can still look around and zoom.' : 'Looking for nearby photos…');
  for (const edge of edges.values()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = movementLabels[edge.data.direction] ?? 'Nearby photo';
    button.disabled = busy;
    button.onclick = () => void explore(edge.target);
    moves.append(button);
  }
}

function credit(username?: string) {
  byId('creator').textContent = username ? username + ' · ' : '';
}

async function explore(id: string) {
  if (!game.canMove || busy || !viewer || !token) return;
  busy = true;
  guessButton.disabled = true;
  renderMoves();
  let message: string | undefined;
  try {
    const image = await verifyCapture(token, id, true);
    movingTo = id;
    await moveToCapture(viewer, id);
    currentId = id;
    credit(image.creator?.username);
  } catch (error) {
    message = failureText(error);
  } finally {
    movingTo = undefined;
    busy = false;
    guessButton.disabled = !game.hasGuess;
    renderMoves(message);
  }
}

function prepareMap() {
  if (map) return map;
  mapError.hidden = true;
  map = new GuessMap(byId('map'), point => {
    if (busy || !game.placeGuess(point)) return false;
    guessButton.disabled = false;
    return true;
  }, () => {
    mapError.textContent = 'Some map data could not load. Check your connection.';
    mapError.hidden = false;
  });
  return map;
}

async function loadRound() {
  if (game.state !== 'loading' || busy) return;
  busy = true;
  currentId = undefined;
  edgeStatuses.clear();
  updateProgress();
  stage.classList.remove('revealed');
  byId('results').hidden = byId('explore').hidden = byId('credits').hidden = panel.hidden = true;
  byId('loading').hidden = false;
  viewerContainer.hidden = retry.hidden = true;
  loadStatus.textContent = 'Finding a verified Bulgarian panorama…';
  let lastError: unknown;
  const attempted = new Set<string>();
  try {
    if (!token) throw new PanoramaError('Set VITE_MAPILLARY_ACCESS_TOKEN in .env.local and restart the server.');
    // Keep used starts out of the pool, and skip unavailable captures within this attempt.
    while (true) {
      const location = picker.next(starterLocations.filter(({ image }) => !used.has(image.id) && !attempted.has(image.id)));
      if (!location) throw lastError ?? new PanoramaError('No more verified panoramas are available.');
      const id = location.image.id;
      attempted.add(id);
      let image;
      try {
        image = await verifyCapture(token, id);
      } catch (error) {
        if (error instanceof MapillaryApiError && ([401, 403, 429].includes(error.status) || error.code === 190)) throw error;
        if (!(error instanceof MapillaryApiError) && !(error instanceof PanoramaError)) throw error;
        lastError = error;
        continue;
      }
      // Initialize the viewer with a measurable container before the first move.
      viewerContainer.hidden = false;
      const activeViewer = getViewer(token);
      try {
        movingTo = id;
        await moveToCapture(activeViewer, id);
      } catch (error) {
        viewerContainer.hidden = true;
        lastError = error;
        continue;
      }
      panel.hidden = false;
      toggle.hidden = guessButton.hidden = false;
      guessButton.disabled = true;
      setExpanded(false);
      try {
        prepareMap().reset();
      } catch {
        throw new PanoramaError('The guessing map could not start. Check that WebGL is enabled and retry.');
      }
      game.openRound(image.geometry.coordinates);
      used.add(id);
      currentId = id;
      credit(image.creator?.username);
      byId('loading').hidden = true;
      byId('explore').hidden = byId('credits').hidden = false;
      break;
    }
  } catch (error) {
    viewerContainer.hidden = panel.hidden = true;
    loadStatus.textContent = failureText(error);
    retry.hidden = false;
    retry.focus();
  } finally {
    movingTo = undefined;
    busy = false;
    if (currentId) renderMoves();
  }
}

function showResult() {
  const summary = game.state === 'summary';
  const result = game.results.at(-1)!;
  stage.classList.add('revealed');
  viewerContainer.hidden = byId('explore').hidden = byId('credits').hidden = true;
  toggle.hidden = guessButton.hidden = true;
  byId('results').hidden = false;
  const scores = byId('round-scores');
  scores.hidden = !summary;
  scores.replaceChildren();
  byId('result-label').textContent = summary ? 'GAME COMPLETE' : 'ROUND ' + game.round + ' RESULT';
  byId('result-title').textContent = summary ? points(game.totalPoints) + ' / ' + points(MAX_GAME_SCORE) + ' pts' : distance(result.meters) + ' away';
  const seconds = Math.floor(game.durationMs / 1000);
  byId('result-stats').textContent = summary
    ? 'Average error: ' + distance(game.averageMeters) + ' · Total error: ' + distance(game.totalMeters) +
      ' · Duration: ' + Math.floor(seconds / 60) + 'm ' + seconds % 60 + 's'
    : '+' + points(result.points) + ' pts · Total: ' + points(game.totalPoints) + ' pts';
  if (summary) {
    for (const [index, round] of game.results.entries()) {
      const row = document.createElement('li');
      row.textContent = 'Round ' + (index + 1) + ': ' + points(round.points) + ' pts · ' + distance(round.meters);
      scores.append(row);
    }
  }
  next.textContent = summary ? 'Play Again' : game.round === ROUND_COUNT ? 'View Game Summary' : 'Next Round';
  map?.reveal(summary ? game.results : [result]);
  updateProgress();
  byId('result-title').focus();
}

guessButton.onclick = () => {
  if (!busy && game.submit()) showResult();
};
retry.onclick = () => void loadRound();

function startGame(mode: Mode) {
  game = new Game(mode);
  picker = new LocationPicker();
  used = new Set();
  byId('home').hidden = byId('credits').hidden = true;
  byId('start').closest('main')!.querySelector<HTMLElement>('.lab-link')!.hidden = true;
  stage.hidden = progress.hidden = false;
  void loadRound();
}

byId<HTMLFormElement>('start').onsubmit = event => {
  event.preventDefault();
  if (busy || byId('home').hidden) return;
  startGame(new FormData(event.currentTarget as HTMLFormElement).get('mode') === 'no-move' ? 'no-move' : 'classic');
};
next.onclick = () => {
  if (busy) return;
  if (game.state === 'summary') {
    map?.destroy();
    map = undefined;
    stage.hidden = progress.hidden = true;
    byId('home').hidden = false;
    document.querySelector<HTMLElement>('.lab-link')!.hidden = false;
    byId('start').querySelector('button')!.focus();
  } else {
    const phase = game.advance();
    if (phase === 'summary') showResult();
    else if (phase === 'loading') void loadRound();
  }
};



