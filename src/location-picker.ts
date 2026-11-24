import { distanceMeters } from './game.ts';
import { inBulgaria, type Coordinates } from './boundary.ts';
import { environmentOf, regionOf, separation, type CatalogEntry } from './location-catalog.ts';
import type { Location } from './locations.ts';

export const LOCATION_HISTORY_KEY = 'geoquest-location-history-v1';
export interface HistoryStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
interface Visit { id: string; point: Coordinates; region: string; environment: CatalogEntry['environment'] }
interface History { queue: string[]; recent: Visit[]; cycle: string[] }
const visitCache=new WeakMap<Location,Visit>();
const visit = (l: Location): Visit => {
  const point=l.image.geometry.coordinates, cached=visitCache.get(l);
  if(cached && cached.id===l.image.id && cached.point[0]===point[0] && cached.point[1]===point[1]) return cached;
  const value:Visit={id:l.image.id,point:[...point],region:regionOf(point),environment:environmentOf(point)};
  visitCache.set(l,value);return value;
};
const nearby = (a: Visit, b: Visit, meters = 0) => a.id === b.id || distanceMeters(a.point,b.point) <
  Math.max(meters, separation(a), separation(b));

export class GeographicPicker {
  private history: History = { queue: [], recent: [], cycle: [] };
  private game: Visit[] = [];
  private storage?: HistoryStorage;
  private random: () => number;
  constructor(storage?: HistoryStorage, random = Math.random) {
    this.storage=storage; this.random=random;
    try {
      const value=JSON.parse(storage?.getItem(LOCATION_HISTORY_KEY)??'null');
      if(value && Array.isArray(value.queue) && Array.isArray(value.cycle) && Array.isArray(value.recent)) {
        this.history={queue:value.queue.filter((id:unknown)=>typeof id==='string').slice(0,10000),
          cycle:value.cycle.filter((id:unknown)=>typeof id==='string').slice(0,10000),
          recent:value.recent.filter((v:Visit)=>v && typeof v.id==='string' && Array.isArray(v.point) && v.point.length===2 &&
            inBulgaria(v.point) && typeof v.region==='string' && ['urban','rural','unknown'].includes(v.environment)).slice(-300)};
      }
    } catch { /* Private browsing, corrupt history and quota errors must not break gameplay. */ }
  }
  beginGame() { this.game=[]; }
  private save() { try {this.storage?.setItem(LOCATION_HISTORY_KEY,JSON.stringify(this.history));} catch { /* Memory fallback. */ } }
  private shuffle(ids: string[]) {
    for(let i=ids.length-1;i>0;i--) {const j=Math.floor(this.random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
    return ids;
  }
  canPlay(location: Location) { const v=visit(location);return !this.game.some(other=>nearby(v,other)); }
  recordPlayed(location: Location) {
    if(!this.canPlay(location)) return false;
    const v=visit(location); this.game.push(v); this.history.recent.push(v);
    this.history.recent=this.history.recent.slice(-300);
    this.save(); return true;
  }
  recordConnections(_id: string, _available: boolean) { /* Connectivity must not bias geographic diversity. */ }
  next(pool: Location[], excluded: ReadonlySet<string> = new Set()): Location | undefined {
    const valid=pool.filter(l=>inBulgaria(l.image.geometry.coordinates));
    const ids=new Set(valid.map(l=>l.image.id));
    this.history.queue=this.history.queue.filter(id=>ids.has(id));
    this.history.cycle=this.history.cycle.filter(id=>ids.has(id));
    const known=new Set([...this.history.queue,...this.history.cycle]);
    this.history.queue.push(...this.shuffle([...ids].filter(id=>!known.has(id))));
    const eligible=valid.filter(l=>!excluded.has(l.image.id) && this.canPlay(l));
    if(!eligible.length) return;
    let queued=eligible.filter(l=>this.history.queue.includes(l.image.id));
    if(!queued.length) {
      // Exhaustion cannot override this game's ID and geographic exclusions.
      this.history.cycle=[];
      this.history.queue=this.shuffle([...ids]);
      queued=eligible;
    }
    const recent=this.history.recent.slice(-Math.min(100,Math.floor(ids.size*.4)));
    const fresh=queued.filter(l=>!recent.some(other=>nearby(visit(l),other)));
    if(fresh.length) queued=fresh;
    // Prefer wide separation. Only relax to the density-aware street exclusion if necessary.
    for(const meters of [50000,20000,10000,5000,0]) {
      const separated=queued.filter(l=>![...this.game,...this.history.recent.slice(-5)].some(other=>nearby(visit(l),other,meters)));
      if(separated.length) {queued=separated;break;}
    }
    const visits=[...this.history.recent.slice(-30),...this.game];
    const score=(l:Location)=>{
      const v=visit(l);
      const regional=visits.filter(other=>other.region===v.region).length;
      const urbanPenalty=v.environment==='urban' && this.game.filter(other=>other.environment==='urban').length>=2 ? 10 : 0;
      return regional+urbanPenalty;
    };
    const lowest=Math.min(...queued.map(score));
    const preferred=queued.filter(l=>score(l)===lowest);
    preferred.sort((a,b)=>this.history.queue.indexOf(a.image.id)-this.history.queue.indexOf(b.image.id));
    const chosen=preferred[0];
    this.history.queue=this.history.queue.filter(id=>id!==chosen.image.id);
    this.history.cycle.push(chosen.image.id);
    this.save();
    return chosen;
  }
}
