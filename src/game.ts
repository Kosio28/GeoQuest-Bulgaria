import type { Coordinates } from './boundary.ts';

export const ROUND_COUNT = 5;
export const MAX_ROUND_SCORE = 5_000;
export const MAX_GAME_SCORE = ROUND_COUNT * MAX_ROUND_SCORE;
export type Mode = 'classic' | 'no-move';
type Point = Readonly<Coordinates>;

export function distanceMeters([lng1, lat1]: Point, [lng2, lat2]: Point) {
  const radians = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * radians / 2) ** 2 +
    Math.cos(lat1 * radians) * Math.cos(lat2 * radians) * Math.sin((lng2 - lng1) * radians / 2) ** 2;
  return 2 * 6_371_008.8 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}

export function scoreDistance(meters: number) {
  if (!Number.isFinite(meters) || meters < 0) return 0;
  // Roughly half credit at 55 km and under 1% at 370 km.
  return Math.round(MAX_ROUND_SCORE * Math.exp(-meters / 80_000));
}

export interface RoundResult {
  readonly actual: Point;
  readonly guess: Point;
  readonly meters: number;
  readonly points: number;
}

export class Game {
  private phase: 'loading' | 'exploring' | 'result' | 'summary' = 'loading';
  private actual?: Point;
  private guess?: Point;
  private rounds: RoundResult[] = [];
  private ended?: number;

  readonly mode: Mode;
  private readonly started: number;

  constructor(mode: Mode, started = performance.now()) {
    this.mode = mode;
    this.started = started;
  }

  get state() { return this.phase; }
  get round() { return Math.min(ROUND_COUNT, this.rounds.length + Number(this.phase !== 'result')); }
  get canMove() { return this.phase === 'exploring' && this.mode === 'classic'; }
  get hasGuess() { return this.guess !== undefined; }
  get results(): readonly RoundResult[] { return [...this.rounds]; }
  get totalPoints() { return this.rounds.reduce((sum, round) => sum + round.points, 0); }
  get totalMeters() { return this.rounds.reduce((sum, round) => sum + round.meters, 0); }
  get averageMeters() { return this.rounds.length ? this.totalMeters / this.rounds.length : 0; }
  get durationMs() { return (this.ended ?? performance.now()) - this.started; }

  openRound(actual: Point) {
    if (this.phase !== 'loading') return false;
    this.actual = Object.freeze([...actual] as Coordinates);
    this.phase = 'exploring';
    return true;
  }

  placeGuess(guess: Point) {
    if (this.phase !== 'exploring' || !guess.every(Number.isFinite) ||
        Math.abs(guess[0]) > 180 || Math.abs(guess[1]) > 90) return false;
    this.guess = Object.freeze([...guess] as Coordinates);
    return true;
  }

  submit(now = performance.now()) {
    if (this.phase !== 'exploring' || !this.guess || !this.actual) return;
    const meters = distanceMeters(this.actual, this.guess);
    const result = Object.freeze({ actual: this.actual, guess: this.guess, meters, points: scoreDistance(meters) });
    this.rounds.push(result);
    this.phase = 'result';
    if (this.rounds.length === ROUND_COUNT) this.ended = now;
    return result;
  }

  advance() {
    if (this.phase !== 'result') return false;
    this.actual = this.guess = undefined;
    this.phase = this.rounds.length === ROUND_COUNT ? 'summary' : 'loading';
    return this.phase;
  }
}


