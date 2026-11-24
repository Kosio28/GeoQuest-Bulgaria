import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { DIFFICULTIES } from '../src/game.ts';

test('settings migration preserves history and derives only new game time limits', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as $$select null::uuid$$;`);
    await db.exec(readFileSync(new URL('../supabase/migrations/20261124181619_personal_score_history.sql', import.meta.url), 'utf8'));
    const user = '00000000-0000-4000-8000-000000000001';
    await db.query('insert into auth.users values($1)', [user]);
    await db.query(`insert into public.game_scores values($1,$1,'classic',12345,1000,'2026-01-01')`, [user]);
    await db.exec(readFileSync(new URL('../supabase/migrations/20261124183303_gameplay_settings.sql', import.meta.url), 'utf8'));
    const historical = (await db.query('select * from public.game_scores')).rows[0];
    assert.equal(historical.total_points, 12345);
    assert.equal(historical.difficulty, null);
    assert.equal(historical.time_limit_seconds, null);
    assert.equal(historical.scoring_version, null);
    for (const [difficulty, seconds] of Object.entries(DIFFICULTIES)) {
      const id = '00000000-0000-4000-8000-' + String(Object.keys(DIFFICULTIES).indexOf(difficulty) + 2).padStart(12, '0');
      await db.query(`insert into public.game_scores(user_id,id,mode,total_points,duration_ms,completed_at,difficulty,scoring_version)
        values($1,$2,'no-move',25000,1000,now(),$3,'distance-v1')`, [user,id,difficulty]);
      const saved = (await db.query('select time_limit_seconds,mode,scoring_version from public.game_scores where id=$1', [id])).rows[0];
      assert.equal(saved.time_limit_seconds, seconds);
      assert.equal(saved.mode, 'no-move');
      assert.equal(saved.scoring_version, 'distance-v1');
    }
  } finally { await db.close(); }
});
