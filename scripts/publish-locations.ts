import {loadEnv} from 'vite';
import {readFileSync} from 'node:fs';
import {distinctEntries,validEntry,type CatalogEntry} from '../src/location-catalog.ts';
const env={...loadEnv('development',process.cwd(),''),...process.env};
const url=env.VITE_SUPABASE_URL;
// Never read a service key from a VITE_ variable; it belongs only on a trusted maintenance host.
const key=env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key) throw new Error('Publishing requires VITE_SUPABASE_URL and server-only SUPABASE_SERVICE_ROLE_KEY');
const entries=JSON.parse(readFileSync('src/data/location-catalog.json','utf8')) as CatalogEntry[];
if(entries.length<100 || !entries.every(validEntry) || distinctEntries(entries).length!==entries.length) throw new Error('Catalog validation failed; publication stopped');
for(let i=0;i<entries.length;i+=100) {
  const response=await fetch(`${url}/rest/v1/location_catalog?on_conflict=panorama_id`,{
    method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},
    body:JSON.stringify(entries.slice(i,i+100).map(e=>({panorama_id:e.id,metadata:e,verification_status:'verified',verified_at:e.verifiedAt}))),
    signal:AbortSignal.timeout(15000),
  });
  if(!response.ok) throw new Error(`Catalog publication failed: HTTP ${response.status}`);
}
const report=JSON.parse(readFileSync('docs/LOCATION_DISCOVERY.json','utf8'));
const unavailable=(report.unavailableIds??[]).filter((id:unknown)=>typeof id==='string' && /^\d+$/.test(id) && !entries.some(e=>e.id===id)) as string[];
for(let i=0;i<unavailable.length;i+=100) {
  const response=await fetch(`${url}/rest/v1/location_catalog?panorama_id=in.(${unavailable.slice(i,i+100).join(',')})`,{
    method:'PATCH',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
    body:JSON.stringify({verification_status:'unavailable'}),signal:AbortSignal.timeout(15000),
  });
  if(!response.ok) throw new Error(`Catalog retirement failed: HTTP ${response.status}`);
}
console.log(`Published ${entries.length} verified metadata records. No imagery was stored.`);
