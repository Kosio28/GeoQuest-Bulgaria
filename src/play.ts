import { t, lang } from './i18n.ts';
import { isSupported, NavigationDirection, Viewer, type ViewerNavigationEdgeEvent } from 'mapillary-js';
import 'mapillary-js/dist/mapillary.css';
import { saveCompletedScore } from './account-entry.ts';
import { Game, MAX_GAME_SCORE, MAX_ROUND_SCORE, ROUND_COUNT, DIFFICULTIES, SCORING_VERSION, type Difficulty, type Mode } from './game.ts';
import { RoundClock } from './round-clock.ts';
import { celebratePerfect, stopCelebration } from './celebration.ts';
import { GuessMap } from './guess-map.ts';
import type { Location } from './locations.ts';
import { GeographicPicker } from './location-picker.ts';
import { loadLocationCatalog, bundledCatalog } from './catalog-loader.ts';
import { asLocation } from './location-catalog.ts';
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
const scoreStatus = byId('score-status');
const retryScore = byId<HTMLButtonElement>('retry-score');
const points = (value: number) => new Intl.NumberFormat(lang()).format(value);
const distance = (meters: number | null) => meters === null ? t('No guess placed') : meters < 1000 ? points(Math.round(meters)) + ' ' + t('m') : new Intl.NumberFormat(lang(), { maximumFractionDigits: 2 }).format(meters / 1000) + ' ' + t('km');
const failureText = (error: unknown) => error instanceof PanoramaError ? error.message : describeError(error);

let game: Game;
let gameId: string;
let viewer: Viewer | undefined;
let viewerObserver: ResizeObserver | undefined;
let map: GuessMap | undefined;
let historyStorage: Storage | undefined;
try { historyStorage = localStorage; } catch { /* Optional persistence. */ }
const picker = new GeographicPicker(historyStorage);
let locationPool: Location[] = bundledCatalog.map(asLocation);
const catalogReady = loadLocationCatalog().then(pool => { locationPool = pool; });
let used: Set<string>;
let busy = false;
let explorationVersion = 0;
let currentId: string | undefined;
let movingTo: string | undefined;
let difficulty: Difficulty = 'relaxed';
const clock = new RoundClock();
let ticking: ReturnType<typeof setInterval> | undefined;
let displayedRemaining: number | null | undefined;
let pointerInside = false;
let touching = false;
let interacting = false;
let openingTap = false;
const timer = byId('timer');
function stopClock() { clock.stop(); clearInterval(ticking); ticking = undefined; displayedRemaining = undefined; timer.hidden = true; }
function tick() {
  if (!game || game.state !== 'exploring') return;
  if (clock.expired()) { submitGuess(true); return; }
  const remaining = clock.remaining();
  if (remaining === displayedRemaining) return;
  displayedRemaining = remaining;
  timer.hidden = remaining === null;
  timer.textContent = remaining === null ? '' : Math.floor(remaining / 60) + ':' + String(remaining % 60).padStart(2, '0');
  timer.classList.toggle('warning', remaining !== null && remaining <= 10);
  timer.classList.toggle('urgent', remaining !== null && remaining <= 5);
}
document.addEventListener('visibilitychange', tick);
window.addEventListener('focus', tick);
const edgeStatuses = new Map<string, Partial<Record<'sequenceedges' | 'spatialedges', ViewerNavigationEdgeEvent['status']>>>();

function setExpanded(expanded: boolean) {
  if (panel.classList.contains('expanded') === expanded && toggle.textContent === (expanded ? t('Shrink map') : t('Expand map'))) return;
  panel.classList.toggle('expanded', expanded);
  toggle.setAttribute('aria-expanded', String(expanded));
  toggle.textContent = expanded ? t('Shrink map') : t('Expand map');
}

function automaticExpansion() {
  const focused = document.activeElement;
  const controlFocused = focused instanceof HTMLElement && panel.contains(focused) && Boolean(focused.closest('button,input,select,.maplibregl-ctrl'));
  setExpanded(touching || pointerInside || interacting || controlFocused);
}
panel.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { pointerInside = true; automaticExpansion(); } });
panel.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse') { pointerInside = false; automaticExpansion(); } });
panel.addEventListener('pointerdown', event => {
  openingTap = false;
  interacting = true;
  if (event.pointerType !== 'mouse' && !panel.classList.contains('expanded') && !stage.classList.contains('revealed')) {
    touching = true;
    openingTap = true;
    setExpanded(true);
    // First tap opens the map; it must not also place a blind guess.
    event.preventDefault(); event.stopPropagation();
  }
}, true);
panel.addEventListener('click', event => {
  if (!openingTap) return;
  openingTap = false; event.preventDefault(); event.stopImmediatePropagation();
}, true);
window.addEventListener('pointerup', () => { interacting = false; automaticExpansion(); });
window.addEventListener('pointercancel', () => { interacting = false; automaticExpansion(); });
panel.addEventListener('focusin', automaticExpansion);
panel.addEventListener('focusout', () => queueMicrotask(automaticExpansion));
toggle.onclick = () => {
  touching = !panel.classList.contains('expanded');
  if (!touching) { pointerInside = false; toggle.blur(); }
  setExpanded(touching);
};

function updateProgress() {
  progress.textContent = (game.mode === 'classic' ? t('Classic') : t('No Move')) +
    ' · ' + t('Round') + ' ' + game.round + '/' + ROUND_COUNT + ' · ' + points(game.totalPoints) + ' ' + t('pts');
}

function getViewer(accessToken: string) {
  if (viewer) return viewer;
  if (!isSupported()) throw new PanoramaError(t('WebGL support is required for interactive panoramas.'));
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
  viewerObserver = new ResizeObserver(() => {
    if (!viewerContainer.hidden) viewer?.resize();
  });
  viewerObserver.observe(viewerContainer);
  return viewer;
}

const movementLabels = (): Partial<Record<NavigationDirection, string>> => ({
  [NavigationDirection.Next]: t('Next photo'),
  [NavigationDirection.Prev]: t('Previous photo'),
  [NavigationDirection.StepForward]: t('Step forward'),
  [NavigationDirection.StepBackward]: t('Step back'),
  [NavigationDirection.StepLeft]: t('Step left'),
  [NavigationDirection.StepRight]: t('Step right'),
  [NavigationDirection.TurnLeft]: t('Turn left'),
  [NavigationDirection.TurnRight]: t('Turn right'),
  [NavigationDirection.TurnU]: t('Turn around'),
});

function renderMoves(message?: string) {
  moves.replaceChildren();
  if (!game.canMove || !currentId) {
    exploreStatus.textContent = t('No Move · Drag to look around. Scroll to zoom.');
    return;
  }
  const { sequenceedges, spatialedges } = edgeStatuses.get(currentId) ?? {};
  const edges = new Map([...sequenceedges?.edges ?? [], ...spatialedges?.edges ?? []]
    .filter(edge => edge.source === currentId && edge.target !== currentId)
    .map(edge => [edge.target, edge]));
  const complete = sequenceedges?.cached && spatialedges?.cached;
  if (edges.size || complete) picker.recordConnections(currentId, edges.size > 0);
  exploreStatus.textContent = message ?? (busy ? t('Moving…') : edges.size ? t('Drag to look around. Scroll to zoom.')
    : complete ? t('No connected photos here. You can still look around and zoom.') : t('Looking for nearby photos…'));
  for (const edge of edges.values()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = movementLabels()[edge.data.direction] ?? t('Nearby photo');
    button.disabled = busy;
    button.onclick = () => void explore(edge.target);
    moves.append(button);
  }
}

function credit(username?: string) {
  const creator=byId('creator');
  creator.replaceChildren();
  if(username) {
    const link=document.createElement('a');
    link.textContent=username;
    link.href='https://www.mapillary.com/app/?username='+encodeURIComponent(username);
    creator.append(link,' · ');
  }
  const source=byId('credits').querySelector<HTMLAnchorElement>(':scope > a[href^="https://www.mapillary.com/"]');
  if(source) source.href=currentId ? 'https://www.mapillary.com/app/?pKey='+encodeURIComponent(currentId) : 'https://www.mapillary.com/';
}

async function explore(id: string) {
  if (!game.canMove || busy || !viewer || !token) return;
  const version = ++explorationVersion;
  busy = true;
  guessButton.disabled = true;
  renderMoves();
  let message: string | undefined;
  try {
    const image = await verifyCapture(token, id, true);
    if (version !== explorationVersion) return;
    movingTo = id;
    await moveToCapture(viewer, id);
    if (version !== explorationVersion) return;
    currentId = id;
    credit(image.creator?.username);
  } catch (error) {
    message = failureText(error);
  } finally {
    if (version !== explorationVersion) return;
    movingTo = undefined;
    busy = false;
    guessButton.disabled = game.state !== 'exploring' || !game.hasGuess;
    if (game.state === 'exploring') renderMoves(message);
  }
}

function prepareMap() {
  if (map) return map;
  mapError.hidden = true;
  map = new GuessMap(byId('map'), point => {
    if (clock.expired()) { submitGuess(true); return false; }
    if (busy || !game.placeGuess(point)) return false;
    guessButton.disabled = false;
    return true;
  }, () => {
    mapError.textContent = t('Some map data could not load. Check your connection.');
    mapError.hidden = false;
  });
  return map;
}

async function loadRound() {
  if (game.state !== 'loading' || busy) return;
  busy = true;
  stopClock(); stopCelebration();
  currentId = undefined;
  edgeStatuses.clear();
  updateProgress();
  stage.classList.remove('revealed');
  byId('results').hidden = byId('explore').hidden = byId('credits').hidden = panel.hidden = true;
  byId('loading').hidden = false;
  viewerContainer.hidden = retry.hidden = true;
  loadStatus.textContent = t('Finding a verified Bulgarian panorama…');
  let lastError: unknown;
  const attempted = new Set<string>();
  try {
    if (!token) throw new PanoramaError(t('Set VITE_MAPILLARY_ACCESS_TOKEN in .env.local and restart the server.'));
    await catalogReady;
    // Keep used starts out of the pool, and skip unavailable captures within this attempt.
    while (true) {
      // A provider outage must not turn one round into hundreds of API requests.
      if (attempted.size >= 8) throw lastError ?? new PanoramaError(t('No more verified panoramas are available.'));
      const location = picker.next(locationPool, new Set([...used, ...attempted]));
      if (!location) throw lastError ?? new PanoramaError(t('No more verified panoramas are available.'));
      const id = location.image.id;
      attempted.add(id);
      let image;
      try {
        image = await verifyCapture(token, id);
        location.image.geometry = image.geometry;
        if (!picker.canPlay(location)) continue;
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
      touching = pointerInside = interacting = false;
      setExpanded(false);
      try {
        prepareMap().reset();
      } catch {
        throw new PanoramaError(t('The guessing map could not start. Check that WebGL is enabled and retry.'));
      }
      game.openRound(image.geometry.coordinates);
      clock.start(DIFFICULTIES[difficulty]);
      if (DIFFICULTIES[difficulty] !== null) ticking = setInterval(tick, 100);
      tick();
      used.add(id);
      picker.recordPlayed(location);
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
  byId('result-label').textContent = summary ? t('GAME COMPLETE') : t('ROUND') + ' ' + game.round + ' · ' + t('RESULT');
  byId('result-title').textContent = summary ? points(game.totalPoints) + ' / ' + points(MAX_GAME_SCORE) : points(result.points) + ' / ' + points(MAX_ROUND_SCORE);
  const seconds = Math.floor(game.durationMs / 1000);
  byId('result-stats').textContent = summary
    ? t('Average error:') + ' ' + (game.results.some(round => round.guess) ? distance(game.averageMeters) : '—') + ' · ' + t('Total error:') + ' ' + (game.results.some(round => round.guess) ? distance(game.totalMeters) : '—') +
      ' · ' + t('Duration:') + ' ' + Math.floor(seconds / 60) + ' ' + t('min') + ' ' + seconds % 60 + ' ' + t('s')
    : distance(result.meters) + ' · ' + t('Total:') + ' ' + points(game.totalPoints) + ' ' + t('pts');
  if (summary) {
    for (const [index, round] of game.results.entries()) {
      const row = document.createElement('li');
      row.textContent = t('Round') + ' ' + (index + 1) + ': ' + points(round.points) + ' ' + t('pts') + ' · ' + distance(round.meters);
      scores.append(row);
    }
  }
  next.textContent = summary ? t('Play Again') : game.round === ROUND_COUNT ? t('View Game Summary') : t('Next Round');
  map?.reveal(summary ? game.results : [result]);
  updateProgress();
  byId('result-title').focus();
}

function submitGuess(expired = false) {
  if ((!expired && busy) || !game.submit(performance.now(), expired || clock.expired())) return;
  // A slow navigation request must not hold the result/next-round controls hostage.
  explorationVersion++; busy = false; movingTo = undefined;
  stopClock();
  showResult();
  if (game.results.at(-1)?.points === MAX_ROUND_SCORE) celebratePerfect();
  if (game.round === ROUND_COUNT) {
    void showSaveStatus(game, () => saveCompletedScore({
      id: gameId,
      mode: game.mode,
      total_points: game.totalPoints,
      duration_ms: Math.round(game.durationMs),
      completed_at: new Date().toISOString(),
      difficulty,
      time_limit_seconds: DIFFICULTIES[difficulty],
      scoring_version: SCORING_VERSION,
    }));
  }
}
guessButton.onclick = () => submitGuess();
retry.onclick = () => void loadRound();

async function showSaveStatus(completed: Game, save: () => ReturnType<typeof saveCompletedScore>) {
  retryScore.hidden = true;
  scoreStatus.hidden = false;
  scoreStatus.textContent = t('Saving your score…');
  const result = await save();
  if (game !== completed) return;
  const messages = {
    saved: result.status === 'saved' && result.personalBest ? t('New personal best!') + ' ' + t('Score saved to your account.') : t('Score saved to your account.'),
    guest: t('Sign in before finishing your next game to save its score.'),
    unavailable: '',
    failed: t('Could not save your score.'),
    pending: t('Score is waiting to sync. Retry when you’re connected.'),
  };
  scoreStatus.textContent = messages[result.status];
  scoreStatus.hidden = result.status === 'unavailable';
  if (result.status === 'pending') {
    retryScore.hidden = false;
    retryScore.onclick = () => void showSaveStatus(completed, result.retry);
  }
}

export function startGame(mode: Mode, selectedDifficulty: Difficulty = 'relaxed') {
  explorationVersion++;
  gameId = crypto.randomUUID();
  stopClock(); stopCelebration();
  difficulty = selectedDifficulty in DIFFICULTIES ? selectedDifficulty : 'relaxed';
  game = new Game(mode);
  picker.beginGame();
  used = new Set();
  scoreStatus.hidden = retryScore.hidden = true;
  retryScore.onclick = null;
  byId('home').hidden = byId('credits').hidden = true;
  stage.hidden = progress.hidden = false;
  void loadRound();
}

next.onclick = () => {
  if (busy) return;
  stopCelebration();
  if (game.state === 'summary') {
    disposeRenderers();
    stage.hidden = progress.hidden = true;
    byId('home').hidden = false;
    byId('open-settings').focus();
  } else {
    const phase = game.advance();
    if (phase === 'summary') showResult();
    else if (phase === 'loading') void loadRound();
  }
};

function disposeRenderers() {
  explorationVersion++;
  stopClock(); stopCelebration();
  viewerObserver?.disconnect();
  viewerObserver = undefined;
  viewer?.remove();
  viewer = undefined;
  map?.destroy();
  map = undefined;
  edgeStatuses.clear();
}
window.addEventListener('pagehide', event => { if (!event.persisted) disposeRenderers(); });

window.addEventListener('languagechange', () => {
  if (!game || stage.hidden) return;
  updateProgress(); setExpanded(panel.classList.contains('expanded'));
  if (game.state === 'exploring') { displayedRemaining = undefined; tick(); renderMoves(); }
  if (game.state === 'result' || game.state === 'summary') showResult();
});



