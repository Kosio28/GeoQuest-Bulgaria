import test from 'node:test';
import assert from 'node:assert/strict';
import { getCapture } from '../src/mapillary-api.ts';

test('capture metadata coalesces requests, expires, isolates tokens and retries failures', async () => {
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  let now = 1_000;
  let requests = 0;
  let fail = false;
  Date.now = () => now;
  globalThis.fetch = async () => {
    requests++;
    return new Response(JSON.stringify(fail ? { error: { code: 190 } } : { id: 'cache-test' }), { status: fail ? 401 : 200 });
  };
  try {
    await Promise.all([getCapture('test-token', 'cache-test'), getCapture('test-token', 'cache-test')]);
    await getCapture('test-token', 'cache-test');
    assert.equal(requests, 1, 'simultaneous and repeated reads share a request');
    await getCapture('other-token', 'cache-test');
    assert.equal(requests, 2);
    now += 5 * 60_000;
    await getCapture('test-token', 'cache-test');
    assert.equal(requests, 3, 'expired entries refresh');
    fail = true;
    await assert.rejects(getCapture('test-token', 'failure-test'));
    fail = false;
    await getCapture('test-token', 'failure-test');
    assert.equal(requests, 5, 'failure is not cached');
    for (let index = 0; index < 128; index++) await getCapture('test-token', 'bounded-' + index);
    const before = requests;
    await getCapture('test-token', 'cache-test');
    assert.equal(requests, before + 1, 'old entries are evicted at the cache limit');
  } finally {
    globalThis.fetch = originalFetch;
    Date.now = originalNow;
  }
});
