import { readFileSync, writeFileSync } from 'node:fs';
import { GeographicPicker } from '../src/location-picker.ts';
import { asLocation, distinctEntries, type CatalogEntry } from '../src/location-catalog.ts';
import { distanceMeters } from '../src/game.ts';
const catalog=JSON.parse(readFileSync('src/data/location-catalog.json','utf8')) as CatalogEntry[];
const pool=catalog.map(asLocation), values=new Map<string,string>();
const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}};
let seed=42;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
const selected:CatalogEntry[]=[],games:string[][]=[];
let minimumGameSeparation=Infinity;
for(let game=0;game<20;game++) {
  const picker=new GeographicPicker(storage,random);picker.beginGame();const rounds:CatalogEntry[]=[];
  for(let round=0;round<5;round++) {
    const location=picker.next(pool);if(!location) throw new Error('Insufficient distinct locations to complete a game');
    if(!picker.recordPlayed(location)) throw new Error('Geographic repeat');
    const entry=catalog.find(e=>e.id===location.image.id)!;
    for(const previous of rounds) minimumGameSeparation=Math.min(minimumGameSeparation,distanceMeters(previous.coordinates,entry.coordinates));
    rounds.push(entry);selected.push(entry);
  }
  games.push(rounds.map(e=>e.id));
}
const unique=new Set(selected.map(e=>e.id)).size;
const report={seed:42,selections:selected.length,games:games.length,uniquePanoramas:unique,geographicallyDistinct:distinctEntries(selected).length,
  repeats:selected.length-unique,withinGameRepeats:games.reduce((sum,ids)=>sum+ids.length-new Set(ids).size,0),minimumGameSeparationMeters:Math.round(minimumGameSeparation),
  regions:Object.fromEntries([...new Set(selected.map(e=>e.region))].sort().map(r=>[r,selected.filter(e=>e.region===r).length])),
  environments:Object.fromEntries(['urban','rural','unknown'].map(r=>[r,selected.filter(e=>e.environment===r).length])),
  note:'Urban/rural is a settlement-distance estimate, with uncertain fringe locations marked unknown. This simulates selection, not image rendering.',gamePanoramaIds:games};
writeFileSync('docs/LOCATION_SIMULATION.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
if(unique<100 || report.geographicallyDistinct<100 || report.withinGameRepeats) process.exitCode=1;
