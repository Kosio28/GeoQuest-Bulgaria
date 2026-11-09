import test from 'node:test';
import assert from 'node:assert/strict';
import { distanceMeters, scoreDistance, Game, MAX_GAME_SCORE, ROUND_COUNT } from '../src/game.ts';
import { starterLocations } from '../src/locations.ts';

test('Haversine handles local, city-to-city and antimeridian distances', () => {
  assert.equal(distanceMeters([23.32, 42.7], [23.32, 42.7]), 0);
  assert.ok(Math.abs(distanceMeters([23.32, 42.7], [23.32, 42.701]) - 111.195) < 0.01);
  const sofiaToVarna = distanceMeters([23.3219, 42.6977], [27.9147, 43.2082]);
  assert.ok(Math.abs(sofiaToVarna / 1000 - 378) < 1);
  assert.ok(Math.abs(distanceMeters([179.5, 0], [-179.5, 0]) / 1000 - 111.195) < 0.01);
});

test('the Bulgaria scoring curve is bounded and rewards accuracy', () => {
  assert.equal(scoreDistance(0), 5000);
  assert.ok(scoreDistance(10) >= 4999);
  assert.ok(scoreDistance(5000) > 4500);
  assert.ok(scoreDistance(55_000) > 2400 && scoreDistance(55_000) < 2600);
  assert.ok(scoreDistance(380_000) < 50);
  assert.equal(scoreDistance(20_000_000), 0);
  for (const invalid of [-1, NaN, Infinity]) assert.equal(scoreDistance(invalid), 0);
  for (let km = 1; km <= 600; km++) assert.ok(scoreDistance(km * 1000) <= scoreDistance((km - 1) * 1000));
});

test('five rounds, immutable starting point, repositioning, and guarded transitions', () => {
  const game = new Game('classic', 100);
  for (let i = 1; i <= ROUND_COUNT; i++) {
    assert.equal(game.round, i);
    assert.equal(game.state, 'loading');
    assert.equal(game.placeGuess([23, 42]), false);
    assert.equal(game.advance(), false);
    const start: [number, number] = [23, 42];
    assert.equal(game.openRound(start), true);
    start[0] = 24;
    assert.equal(game.canMove, true);
    assert.equal(game.openRound([24, 42]), false);
    assert.equal(game.submit(), undefined);
    assert.equal(game.placeGuess([NaN, 42]), false);
    assert.equal(game.placeGuess([24, 42]), true);
    assert.equal(game.placeGuess([23, 42]), true);
    assert.deepEqual(game.submit(250 + i * 100), { actual: [23, 42], guess: [23, 42], meters: 0, points: 5000 });
    assert.equal(game.round, i);
    assert.equal(game.canMove, false);
    assert.equal(game.placeGuess([24, 42]), false);
    assert.equal(game.submit(), undefined);
    assert.equal(game.advance(), i < ROUND_COUNT ? 'loading' : 'summary');
  }
  assert.equal(game.results.length, ROUND_COUNT);
  assert.equal(game.totalPoints, MAX_GAME_SCORE);
  assert.equal(game.durationMs, 650);
  assert.equal(game.averageMeters, 0);
  assert.equal(game.totalMeters, 0);
  assert.equal(game.advance(), false);
  assert.equal(game.openRound([23, 42]), false);
  assert.equal(game.submit(), undefined);
});

test('No Move blocks image navigation while allowing a fresh game and scoring', () => {
  const game = new Game('no-move');
  assert.equal(game.totalPoints, 0);
  assert.equal(game.round, 1);
  assert.equal(game.openRound([23, 42]), true);
  assert.equal(game.canMove, false);
  assert.equal(game.placeGuess([24, 42]), true);
  const result = game.submit()!;
  assert.ok(result.meters > 82_000 && result.meters < 83_000);
  assert.equal(game.totalMeters, result.meters);
  assert.equal(game.averageMeters, result.meters);
  assert.equal(game.totalPoints, result.points);
});

test('the curated pool can supply five distinct starts', () => {
  assert.ok(new Set(starterLocations.map(location => location.image.id)).size >= ROUND_COUNT);
});
