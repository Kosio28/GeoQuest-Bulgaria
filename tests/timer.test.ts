import test from 'node:test';
import assert from 'node:assert/strict';
import { RoundClock } from '../src/round-clock.ts';
import { DIFFICULTIES, Game, ROUND_COUNT } from '../src/game.ts';

test('all difficulty deadlines start on readiness, including unlimited Relaxed', () => {
  for (const seconds of Object.values(DIFFICULTIES)) {
    const clock = new RoundClock();
    assert.equal(clock.expired(1_000_000), false); // Loading never starts the clock.
    clock.start(seconds, 1_000_000);
    assert.equal(clock.remaining(1_000_000), seconds);
    if (seconds !== null) {
      assert.equal(clock.remaining(1_000_000 + seconds * 1000 - 1), 1);
      assert.equal(clock.expired(1_000_000 + seconds * 1000), true);
      assert.equal(clock.remaining(1_000_000 + seconds * 1000 + 60_000), 0);
    } else assert.equal(clock.expired(Number.MAX_SAFE_INTEGER), false);
  }
});

test('clock catches suspended tabs and resets cleanly between rounds and games', () => {
  const clock = new RoundClock();
  clock.start(15, 1000);
  assert.equal(clock.expired(100_000), true);
  clock.stop();
  assert.equal(clock.expired(100_000), false);
  assert.equal(clock.remaining(100_000), null);
  clock.start(120, 100_000);
  assert.equal(clock.remaining(100_001), 120);
});

test('timeout without marker awards zero, no invented coordinates or distance', () => {
  const game = new Game('classic');
  assert.equal(game.submit(1, true), undefined);
  game.openRound([25, 42]);
  const result = game.submit(100, true)!;
  assert.deepEqual(result, { actual: [25, 42], guess: null, meters: null, points: 0 });
  assert.equal(game.submit(101, true), undefined);
  assert.equal(game.placeGuess([25, 42]), false);
});

test('manual and deadline submissions race safely in both orders', () => {
  for (const timeoutFirst of [true, false]) {
    const game = new Game('no-move');
    game.openRound([25, 42]); game.placeGuess([25, 42]);
    assert.equal(game.submit(100, timeoutFirst)?.points, 5000);
    assert.equal(game.submit(101, !timeoutFirst), undefined);
    assert.equal(game.results.length, 1);
  }
});

test('five timeouts complete the normal game flow and clear old guesses', () => {
  const game = new Game('classic');
  for (let round = 1; round <= ROUND_COUNT; round++) {
    game.openRound([25, 42]);
    if (round === 1) game.placeGuess([25, 42]);
    assert.equal(game.submit(round * 100, true)?.points, round === 1 ? 5000 : 0);
    assert.equal(game.advance(), round === ROUND_COUNT ? 'summary' : 'loading');
    assert.equal(game.hasGuess, false);
  }
  assert.equal(game.totalPoints, 5000);
  assert.equal(game.results.length, 5);
});
