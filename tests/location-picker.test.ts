import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { GeographicPicker, LOCATION_HISTORY_KEY } from '../src/location-picker.ts';
import { asLocation, distinctEntries, environmentOf, regionOf, separation, validEntry, type CatalogEntry } from '../src/location-catalog.ts';
import { distanceMeters } from '../src/game.ts';

const catalog=JSON.parse(readFileSync(new URL('../src/data/location-catalog.json',import.meta.url),'utf8')) as CatalogEntry[];
function storage() {const data=new Map<string,string>();return {getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);}};}
function seeded(seed=42) {return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};}
test('catalog contains at least 100 individually checked, distinct Bulgarian spherical panoramas',()=>{
  assert.ok(catalog.length>=100);
  assert.ok(catalog.every(validEntry));
  assert.equal(distinctEntries(catalog).length,catalog.length);
  assert.equal(new Set(catalog.map(e=>e.id)).size,catalog.length);
});
test('100 selections across 20 games and refreshes have no ID or street repeats',()=>{
  const memory=storage(), pool=catalog.map(asLocation), chosen:CatalogEntry[]=[];
  for(let game=0;game<20;game++) {
    const picker=new GeographicPicker(memory,seeded(game+1));
    picker.beginGame(); const rounds:CatalogEntry[]=[];
    for(let round=0;round<5;round++) {
      const location=picker.next(pool); assert.ok(location);
      assert.ok(picker.recordPlayed(location));
      const entry=catalog.find(e=>e.id===location.image.id)!;
      for(const previous of rounds) assert.ok(distanceMeters(previous.coordinates,entry.coordinates)>=Math.max(separation(previous),separation(entry)));
      rounds.push(entry);chosen.push(entry);
    }
  }
  assert.equal(new Set(chosen.map(e=>e.id)).size,100);
  assert.equal(distinctEntries(chosen).length,100);
  assert.ok(new Set(chosen.map(e=>e.region)).size>=5);
  assert.ok(chosen.filter(e=>e.environment==='urban').length<=50);
});
test('exhaustion reshuffles while keeping hard exclusions within each game',()=>{
  const pool=catalog.slice(0,7).map(asLocation), picker=new GeographicPicker(storage(),seeded());
  for(let game=0;game<30;game++) {
    picker.beginGame();const seen=new Set<string>();
    for(let round=0;round<5;round++) {const location=picker.next(pool);assert.ok(location);assert.ok(!seen.has(location.image.id));seen.add(location.image.id);assert.ok(picker.recordPlayed(location));}
  }
});
test('nearby IDs cannot bypass geographic exclusion and unsuccessful loads are not played history',()=>{
  const a=asLocation(catalog[0]), b=structuredClone(a);b.image.id='999999999999999';b.image.geometry.coordinates[0]+=.00001;
  const memory=storage(),picker=new GeographicPicker(memory,seeded());picker.beginGame();
  const selected=picker.next([a,b]);assert.ok(selected);
  assert.equal(JSON.parse(memory.getItem(LOCATION_HISTORY_KEY)!).recent.length,0);
  assert.ok(picker.recordPlayed(selected));
  assert.equal(picker.next([a,b]),undefined);
  assert.equal(picker.recordPlayed(selected),false);
});
test('queue and recent history survive a refresh and catalog changes',()=>{
  const memory=storage(),pool=catalog.slice(0,50).map(asLocation);
  const first=new GeographicPicker(memory,seeded());const selected=first.next(pool)!;first.recordPlayed(selected);
  const restored=new GeographicPicker(memory,seeded());const second=restored.next(pool)!;
  assert.notEqual(second.image.id,selected.image.id);
  const withRemoved=new GeographicPicker(memory,seeded());
  const third=withRemoved.next(pool.slice(5))!;
  assert.ok(pool.slice(5).some(l=>l.image.id===third.image.id));
});
test('corrupt or blocked storage and empty pools do not crash selection',()=>{
  for(const s of [ {getItem:()=>'{broken',setItem:()=>{throw new Error('blocked');}}, {getItem:()=>{throw new Error('blocked');},setItem:()=>{}} ]) {
    const picker=new GeographicPicker(s,seeded());assert.equal(picker.next([]),undefined);assert.ok(picker.next(catalog.map(asLocation)));
  }
});
test('temporary load exclusions do not erase the persisted rotation or mark failures as played',()=>{
  const memory=storage(),pool=catalog.slice(0,20).map(asLocation),picker=new GeographicPicker(memory,seeded());
  const first=picker.next(pool)!;picker.recordPlayed(first);
  const excluded=new Set([first.image.id,...pool.slice(5).map(l=>l.image.id)]);
  const second=picker.next(pool,excluded)!;
  assert.ok(!excluded.has(second.image.id));
  const state=JSON.parse(memory.getItem(LOCATION_HISTORY_KEY)!);
  assert.ok(state.cycle.includes(first.image.id));
  assert.equal(state.queue.length,18);
  assert.equal(state.recent.length,1);
});
test('metadata validation rejects non-spherical, outside-country and corrupt entries',()=>{
  for(const bad of [{...catalog[0],cameraType:'perspective'},{...catalog[0],coordinates:[0,0]}, {...catalog[0],coordinates:[NaN,42]}, {...catalog[0],region:'invented'}]) assert.equal(validEntry(bad),false);
  assert.equal(regionOf(catalog[0].coordinates),catalog[0].region);
  assert.equal(environmentOf(catalog[0].coordinates),catalog[0].environment);
});
test('catalog RLS permits verified reads and denies browser writes and unverified reads',async()=>{
  const db=new PGlite();
  try {
    await db.exec('create role anon; create role authenticated;');
    await db.exec(readFileSync(new URL('../supabase/migrations/20261124185830_verified_location_catalog.sql',import.meta.url),'utf8'));
    const e=catalog[0];
    await db.query('insert into location_catalog values ($1,$2,$3,$4)',[e.id,JSON.stringify(e),'verified',e.verifiedAt]);
    const b={...e,id:'123'};
    await db.query('insert into location_catalog values ($1,$2,$3,$4)',[b.id,JSON.stringify(b),'unavailable',b.verifiedAt]);
    for(const role of ['anon','authenticated']) {
      await db.exec(`set role ${role}`);
      assert.equal((await db.query('select * from location_catalog')).rows.length,1);
      await assert.rejects(db.query('delete from location_catalog'));
      await assert.rejects(db.query("update location_catalog set verification_status='verified'"));
      await assert.rejects(db.query('insert into location_catalog values ($1,$2,$3,$4)',['456',JSON.stringify({...e,id:'456'}),'verified',e.verifiedAt]));
      await db.exec('reset role');
    }
  } finally {await db.close();}
});
