import { loadEnv } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';
import {VectorTile} from '@mapbox/vector-tile';import {PbfReader} from 'pbf';
import {inBulgaria,type Coordinates} from '../src/boundary.ts';
import {distanceMeters} from '../src/game.ts';
import {entryFromCapture,distinctEntries,environmentOf,separation,type CatalogEntry} from '../src/location-catalog.ts';
import {getCapture,MapillaryApiError} from '../src/mapillary-api.ts';
const token=loadEnv('development',process.cwd(),'VITE_MAPILLARY_').VITE_MAPILLARY_ACCESS_TOKEN!;
const known=JSON.parse(readFileSync('src/data/location-catalog.json','utf8')) as CatalogEntry[];
const hints:Coordinates[]=[];let requests=0,failed=0;
const wait=()=>new Promise(r=>setTimeout(r,350));
async function tile(z:number,x:number,y:number) {
 requests++;await wait();const u=new URL(`https://tiles.mapillary.com/maps/vtp/mly1_public/2/${z}/${x}/${y}`);u.searchParams.set('access_token',token);
 const r=await fetch(u,{signal:AbortSignal.timeout(12000)});if([401,403,429].includes(r.status)) throw new Error(`Stopped: HTTP ${r.status}`);if(!r.ok) return;
 return new VectorTile(new PbfReader(new Uint8Array(await r.arrayBuffer())));
}
const cache=JSON.parse(readFileSync('.cache/location-tiles.json','utf8'));
for(const key of Object.keys(cache)) {
 const [z,x,y]=key.split('/').map(Number);const t=await tile(z,x,y);const layer=t?.layers.sequence;
 for(let i=0;layer && i<layer.length;i++) {const f=layer.feature(i);if(!f.properties.is_pano)continue;
 const g=f.toGeoJSON(x,y,z).geometry;
 const lines=g.type==='LineString'?[g.coordinates]:g.type==='MultiLineString'?g.coordinates:[];
 for(const line of lines) for(let j=0;j<line.length;j+=Math.max(1,Math.floor(line.length/8))) {
 const p=line[j] as Coordinates;
 if(!inBulgaria(p))continue;
 const radius=separation({environment:environmentOf(p)})+100;
 if(known.some(e=>distanceMeters(e.coordinates,p)<Math.max(separation(e)+100,radius))||hints.some(q=>distanceMeters(q,p)<Math.max(separation({environment:environmentOf(q)})+100,radius)))continue;
 hints.push(p);
 }
 }
}
// Reproducible geographic interleaving, with an explicit refinement request cap.
hints.sort((a,b)=>((Math.round(a[0]*10000)*73856093^Math.round(a[1]*10000)*19349663)>>>0)-((Math.round(b[0]*10000)*73856093^Math.round(b[1]*10000)*19349663)>>>0));
console.log(JSON.stringify({refinementHints:hints.length,requests}));
let additions:CatalogEntry[]=[];let probes=0,verifications=0;
for(const point of hints.slice(0,120)) {
 if(additions.length>=120)break;
 const z=14,n=2**z,x=Math.floor((point[0]+180)/360*n),y=Math.floor((1-Math.asinh(Math.tan(point[1]*Math.PI/180))/Math.PI)/2*n);
 const t=await tile(z,x,y);probes++;const layer=t?.layers.image;
 const points:CatalogEntry[]=[];
 for(let i=0;layer&&i<layer.length;i++) {const f=layer.feature(i);if(!f.properties.is_pano)continue;
 const g=f.toGeoJSON(x,y,z).geometry;if(g.type!=='Point')continue;
 const p=g.coordinates as Coordinates;if(!inBulgaria(p))continue;
 const e:CatalogEntry={id:String(f.properties.id),coordinates:p,sequence:String(f.properties.sequence_id),region:'',environment:'unknown',verifiedAt:'',cameraType:'spherical',verification:'metadata'};
 const radius=separation({environment:environmentOf(p)})+50;
 if([...known,...additions,...points].some(q=>distanceMeters(q.coordinates,p)<Math.max(separation({environment:environmentOf(q.coordinates)})+50,radius)))continue;
 points.push(e);
 }
 for(const hint of points.slice(0,2)) {
 requests++;verifications++;await wait();try {const e=entryFromCapture(await getCapture(token,hint.id));if(e) additions=distinctEntries([...additions,e]);}
 catch(error){if(error instanceof MapillaryApiError&&([401,403,429].includes(error.status)||error.code===190))throw new Error(`Stopped: HTTP ${error.status}`);failed++;}
 }
 writeFileSync('.cache/location-refinement.json',JSON.stringify(additions,null,2));
 if(probes%10===0)console.log(JSON.stringify({probes,additions:additions.length,requests,verifications,failed}));
}
writeFileSync('.cache/location-refinement-summary.json',JSON.stringify({requests,probes,verifications,failed,additions:additions.length}));
const latest=JSON.parse(readFileSync('src/data/location-catalog.json','utf8')) as CatalogEntry[];
const merged=distinctEntries([...latest,...additions]);
if(merged.length>=100) writeFileSync('src/data/location-catalog.json',JSON.stringify(merged,null,2)+'\n');
const summary=JSON.parse(readFileSync('docs/LOCATION_DISCOVERY.json','utf8'));
summary.refinementPasses=[...(summary.refinementPasses??[]),{requests,probes,verifications,failed,additions:additions.length}];
summary.totalDiscoveryRequests=(summary.totalDiscoveryRequests??summary.requests)+requests;
summary.distinctLocations=merged.length;summary.minimumMet=merged.length>=100;
summary.preferredTargetMet=merged.length>=summary.target;summary.completedAt=new Date().toISOString();
summary.regions=Object.fromEntries([...new Set(merged.map(e=>e.region))].map(r=>[r,merged.filter(e=>e.region===r).length]));
summary.environments=Object.fromEntries(['urban','rural','unknown'].map(r=>[r,merged.filter(e=>e.environment===r).length]));
writeFileSync('docs/LOCATION_DISCOVERY.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({requests,probes,verifications,failed,additions:additions.length}));
