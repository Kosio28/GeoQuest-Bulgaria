import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('leaderboard SQL, submissions and access controls in isolated Postgres', async t => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key,is_anonymous boolean default false);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to anon,authenticated;
      grant execute on function auth.uid() to anon,authenticated;`);
    await db.exec(readFileSync(new URL('../supabase/migrations/20261124181619_personal_score_history.sql',import.meta.url),'utf8'));
    for(let n=1;n<=26;n++) {
      await db.query('insert into auth.users(id) values($1)',[uuid(n)]);
      await db.query(`insert into public.game_scores(user_id,id,mode,total_points,duration_ms,completed_at) values($1,$2,'classic',$3,10000,'2026-01-01')`,[uuid(n),uuid(n+100),n===1 || n===2 ? 24000 : 25000-n*100]);
    }
    // Seed historical records before applying the additive migrations.
    const migrations = new URL('../supabase/migrations/',import.meta.url);
    for (const file of readdirSync(migrations).filter(file=>file.endsWith('.sql') && !file.includes('personal_score_history')).sort()) {
      await db.exec(readFileSync(new URL(file,migrations),'utf8'));
    }
    await db.query(`insert into public.game_scores(user_id,id,mode,total_points,duration_ms,completed_at,difficulty,scoring_version) values
      ($1,$2,'classic',1000,10000,'2026-01-02','hard','distance-v1'),
      ($1,$3,'no-move',24500,10000,'2026-01-03','expert','distance-v1'),
      ($1,$4,'classic',25000,10000,'2026-01-01','easy','incompatible')`,[uuid(1),uuid(201),uuid(202),uuid(203)]);
    await db.query(`insert into public.profiles(id,username) values($1,'Explorer One')`,[uuid(1)]);
    const board = async (mode: string | null=null, verified=false, offset=0,difficulty: string | null=null) =>
      (await db.query<{value:any}>('select public.get_leaderboard($1,$2,$3,$4) as value',[mode,verified,offset,difficulty])).rows[0].value;
    await t.test('personal bests, pagination, ties, legacy and scoring compatibility',async()=>{
      const data=await board();
      assert.equal(data.total,26); assert.equal(data.rows.length,20);
      assert.equal(new Set(data.rows.map((r:any)=>r.player_id)).size,20);
      assert.equal(data.rows.find((r:any)=>r.player_id===uuid(1)).score,24500);
      const classic=await board('classic');
      const tied=classic.rows.filter((r:any)=>r.score===24000);
      assert.deepEqual(tied.map((r:any)=>r.player_id),[uuid(1),uuid(2),uuid(10)]);
      assert.equal(tied[0].difficulty,null);
      assert.equal((await board(null,false,20)).rows.length,6);
      assert.equal((await board(null,false,0,'hard')).rows[0].score,1000);
      assert.equal((await board('no-move')).total,1);
      assert.equal((await board(null,true)).total,0);
      await db.query("update public.game_scores set completed_at='2026-02-01' where user_id=$1",[uuid(1)]);
      assert.equal((await board('classic')).rows.filter((r:any)=>r.score===24000)[0].player_id,uuid(2));
      await db.query("update public.game_scores set verification='verified' where user_id=$1",[uuid(2)]);
      assert.equal((await board(null,true)).total,1);
      await db.query("update public.game_scores set verification='unverified' where user_id=$1",[uuid(2)]);
      assert.equal((await db.query<{count:number}>('select count(*)::int as count from public.game_scores')).rows[0].count,29);
    });
    await t.test('guest public projection exposes no emails or raw scores',async()=>{
      await db.exec('set role anon');
      assert.equal((await board()).total,26);
      assert.equal((await board()).personal,null);
      await assert.rejects(db.query('select * from public.game_scores'),/permission denied/);
      await assert.rejects(db.query('select * from public.profiles'),/permission denied/);
      await assert.rejects(db.query('select * from private.leaderboard_rows(null,false,null)'),/permission denied/);
      await assert.rejects(db.query('select public.submit_game_score($1,\'classic\',1,1,null)',[uuid(500)]),/permission denied/);
      assert.deepEqual(Object.keys((await board()).rows[0]).sort(),['achieved_at','avatar_url','difficulty','mode','player_id','rank','score','username','verification'].sort());
      await db.exec('reset role');
    });
    await t.test('authenticated off-page ranking and owner-only history',async()=>{
      await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uuid(26)]);
      await db.exec('set role authenticated');
      const data=await board(); assert.ok(data.personal.rank>20); assert.equal(data.completed_games,1);
      assert.equal((await db.query('select * from public.game_scores')).rows.length,1);
      await assert.rejects(db.query('update public.game_scores set total_points=25000'),/permission denied/);
      await assert.rejects(db.query('delete from public.game_scores'),/permission denied/);
      await assert.rejects(db.query(`insert into public.game_scores(user_id,id,mode,total_points,duration_ms,completed_at) values($1,$2,'classic',1,1,now())`,[uuid(1),uuid(500)]),/permission denied/);
      assert.equal((await db.query('update public.profiles set username=\'Stolen\' returning id')).rows.length,0);
      await db.query('insert into public.profiles(id,username) values($1,\'My Name\')',[uuid(26)]);
      assert.equal((await db.query('update public.profiles set username=\'New Name\' where id=$1 returning id',[uuid(26)])).rows.length,1);
      await assert.rejects(db.query('update public.profiles set id=$1',[uuid(25)]),/permission denied/);
      await db.exec('reset role');
    });
    await t.test('server bounds, idempotency, personal best and lower-score preservation',async()=>{
      await db.exec('set role authenticated');
      const submit=async(id:number,points:number)=>(await db.query<{value:any}>('select public.submit_game_score($1,\'classic\',$2,10000,\'hard\') as value',[uuid(id),points])).rows[0].value;
      await assert.rejects(submit(500,25001),/Invalid game/);
      assert.equal((await submit(500,24900)).personal_best,true);
      assert.equal((await submit(500,25000)).personal_best,false);
      assert.equal((await submit(501,100)).personal_best,false);
      const data=await board(); assert.equal(data.personal.score,24900); assert.equal(data.completed_games,3);
      assert.equal(data.personal.verification,'unverified');
      assert.equal((await board(null,false,0,'hard')).personal.score,24900);
      await db.exec('reset role');
      assert.equal((await db.query('select * from public.game_scores where user_id=$1 and id=$2',[uuid(26),uuid(500)])).rows.length,1);
      await db.query("select set_config('request.jwt.claim.sub','',false)");
      await assert.rejects(db.query('select public.submit_game_score($1,\'classic\',1,1,null)',[uuid(600)]),/Sign in required/);
    });
    await t.test('anonymous auth accounts remain ineligible',async()=>{
      await db.query('insert into auth.users(id,is_anonymous) values($1,true)',[uuid(27)]);
      await db.query("insert into public.game_scores(user_id,id,mode,total_points,duration_ms,completed_at) values($1,$2,'classic',25000,1,now())",[uuid(27),uuid(700)]);
      assert.equal((await board()).total,26);
      await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uuid(27)]);
      await db.exec('set role authenticated');
      await assert.rejects(db.query('select public.submit_game_score($1,\'classic\',1,1,null)',[uuid(701)]),/Sign in required/);
      await db.exec('reset role');
    });
  } finally { await db.close(); }
});
