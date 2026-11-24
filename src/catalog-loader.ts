import bundled from './data/location-catalog.json' with { type: 'json' };
import { asLocation, distinctEntries, validEntry, type CatalogEntry } from './location-catalog.ts';

export const bundledCatalog = distinctEntries(bundled as CatalogEntry[]);
const CACHE_KEY='geoquest-catalog-v1';
// One public metadata request per day per browser; no discovery fan-out from gameplay.
export async function loadLocationCatalog() {
  let entries=bundledCatalog;
  let cached: {at:number;entries:CatalogEntry[]} | undefined;
  try { cached=JSON.parse(localStorage.getItem(CACHE_KEY)??'null'); } catch { /* Optional cache. */ }
  if(cached && Array.isArray(cached.entries)) entries=distinctEntries(cached.entries.filter(validEntry));
  const url=import.meta.env.VITE_SUPABASE_URL?.trim();
  const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if(!url || !key || (cached && Date.now()-cached.at<86400000)) return entries.map(asLocation);
  try {
    const response=await fetch(`${url}/rest/v1/location_catalog?select=metadata&verification_status=eq.verified&order=panorama_id&limit=1000`,
      {headers:{apikey:key},signal:AbortSignal.timeout(4000)});
    if(response.ok) {
      const rows=await response.json();
      if(Array.isArray(rows)) {
        // A successful catalog response is authoritative, including an intentionally empty catalog.
        entries=distinctEntries(rows.map(row=>row.metadata).filter(validEntry));
        try {localStorage.setItem(CACHE_KEY,JSON.stringify({at:Date.now(),entries}));} catch { /* Optional cache. */ }
      }
    }
  } catch { /* The bundled catalog keeps gameplay available if Supabase is unreachable. */ }
  return entries.map(asLocation);
}
