import { loadEnv } from 'vite';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { inBulgaria, type Coordinates } from '../src/boundary.ts';
import { getCapture, MapillaryApiError } from '../src/mapillary-api.ts';
import { distinctEntries, entryFromCapture, environmentOf, regionOf, type CatalogEntry } from '../src/location-catalog.ts';

const token = loadEnv('development', process.cwd(), 'VITE_MAPILLARY_').VITE_MAPILLARY_ACCESS_TOKEN?.trim();
if (!token) throw new Error('Mapillary client token is not configured');
const target = Number(process.env.LOCATION_TARGET ?? 500);
const budget = Number(process.env.LOCATION_REQUEST_BUDGET ?? 800);
const output = 'src/data/location-catalog.json';
const cacheFile = '.cache/location-tiles.json';
mkdirSync('.cache', { recursive: true });
interface CachedTile { at: number; entries: CatalogEntry[] }
let cache: Record<string, CachedTile> = {};
try { cache = JSON.parse(readFileSync(cacheFile, 'utf8')); } catch { /* First run. */ }
let previous: CatalogEntry[] = [];
try { previous = JSON.parse(readFileSync(output, 'utf8')); } catch { /* First run. */ }
let requests = 0, failed = 0, tileCount = 0, verificationRequests = 0;
const unavailableIds:string[]=[];
const candidates = new Map<string,CatalogEntry>();
for(const entry of previous) candidates.set(entry.id, entry);
const z=8, n=2**z;
const tileX=(lng:number)=>Math.floor((lng+180)/360*n);
const tileY=(lat:number)=>Math.floor((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n);
const pause=()=>new Promise(resolve=>setTimeout(resolve,350));
// Countrywide sequence tiles avoid thousands of Graph bbox requests.
for(let x=tileX(22.3);x<=tileX(28.7);x++) for(let y=tileY(44.3);y<=tileY(41.2);y++) {
  const key=`${z}/${x}/${y}`;
  let saved=cache[key];
  if(!saved || Date.now()-saved.at>=7*86400000) {
    if(requests>=budget) break;
    requests++; await pause();
    const url=new URL(`https://tiles.mapillary.com/maps/vtp/mly1_public/2/${key}`);
    url.searchParams.set('access_token',token);
    try {
      const response=await fetch(url,{signal:AbortSignal.timeout(12000)});
      if([401,403,429].includes(response.status)) throw new MapillaryApiError(response.status);
      if(!response.ok) {failed++;continue;}
      const tile=new VectorTile(new PbfReader(new Uint8Array(await response.arrayBuffer())));
      const entries: CatalogEntry[]=[];
      const layer=tile.layers.sequence;
      for(let i=0;layer && i<layer.length;i++) {
        const feature=layer.feature(i), p=feature.properties;
        if(!p.is_pano || !p.image_id) continue;
        const geometry=feature.toGeoJSON(x,y,z).geometry;
        const point=(geometry.type==='LineString' ? geometry.coordinates[0] : geometry.type==='MultiLineString' ? geometry.coordinates[0]?.[0] : undefined) as Coordinates|undefined;
        if(!point || !inBulgaria(point)) continue;
        // Tile coordinates are discovery hints; Graph replaces them before publication.
        entries.push({id:String(p.image_id),coordinates:point,sequence:String(p.id),region:regionOf(point),environment:environmentOf(point),
          verifiedAt:new Date().toISOString(),cameraType:'spherical',verification:'metadata'});
      }
      saved={at:Date.now(),entries}; cache[key]=saved;
      writeFileSync(cacheFile,JSON.stringify(cache));
    } catch(error) {
      if(error instanceof MapillaryApiError) throw new Error(`Discovery stopped on HTTP ${error.status}; no retries`);
      failed++;continue;
    }
  }
  tileCount++;
  for(const entry of saved.entries) if(!candidates.has(entry.id)) candidates.set(entry.id,entry);
}
const potential=distinctEntries([...candidates.values()].sort((a,b)=>a.id.localeCompare(b.id)));
// Interleave strata before spending the verification budget.
const groups=new Map<string,CatalogEntry[]>();
for(const e of potential) {const k=e.region+'/'+e.environment;const list=groups.get(k)??[];list.push(e);groups.set(k,list);}
const queue:CatalogEntry[]=[];
while([...groups.values()].some(list=>list.length)) for(const list of groups.values()) if(list.length) queue.push(list.shift()!);
console.log(JSON.stringify({tileCount,requests,sequenceRepresentatives:candidates.size,geographicallyDistinctCandidates:potential.length}));
let verified:CatalogEntry[]=[];
for(const entry of queue) {
  if(verified.length>=target || requests>=budget) break;
  requests++; verificationRequests++; await pause();
  try {
    const current=entryFromCapture(await getCapture(token,entry.id));
    if(current) verified=distinctEntries([...verified,current]);
    else unavailableIds.push(entry.id);
  } catch(error) {
    if(error instanceof MapillaryApiError && ([401,403,429].includes(error.status)||error.code===190)) throw new Error(`Verification stopped: HTTP ${error.status}`);
    if(error instanceof MapillaryApiError && error.status===404) unavailableIds.push(entry.id);
    failed++;
  }
  writeFileSync('.cache/location-verification-checkpoint.json',JSON.stringify(verified,null,2)+'\n');
  if(verificationRequests%25===0) console.log(JSON.stringify({verificationRequests,verified:verified.length,failed}));
}
const summary={generatedAt:new Date().toISOString(),target,minimumMet:verified.length>=100,preferredTargetMet:verified.length>=target,distinctLocations:verified.length,totalDiscoveryRequests:requests,
  requests,verificationRequests,tileCount,failed,unavailableIds,sequenceRepresentatives:candidates.size,distinctCandidates:potential.length,
  regions:Object.fromEntries([...new Set(verified.map(e=>e.region))].map(r=>[r,verified.filter(e=>e.region===r).length])),
  environments:Object.fromEntries(['urban','rural','unknown'].map(r=>[r,verified.filter(e=>e.environment===r).length]))};
writeFileSync('docs/LOCATION_DISCOVERY.json',JSON.stringify(summary,null,2)+'\n');
if(verified.length>=100) writeFileSync(output,JSON.stringify(verified,null,2)+'\n');
console.log(JSON.stringify(summary));
if(verified.length<100) process.exitCode=2;
