-- Metadata only. Original images and thumbnail URLs are never stored here.
create table public.location_catalog (
  panorama_id text primary key check (panorama_id ~ '^[0-9]+$'),
  metadata jsonb not null,
  verification_status text not null default 'verified' check (verification_status in ('verified','unavailable','pending')),
  verified_at timestamptz not null,
  check (metadata->>'id' = panorama_id),
  check (metadata->>'cameraType' = 'spherical'),
  check (metadata->>'verification' = 'metadata'),
  check (jsonb_typeof(metadata->'coordinates') = 'array'),
  check (jsonb_array_length(metadata->'coordinates') = 2),
  check (metadata - array['id','coordinates','sequence','region','environment','verifiedAt','cameraType','verification'] = '{}'::jsonb)
);
alter table public.location_catalog enable row level security;
revoke all on public.location_catalog from anon, authenticated;
grant select on public.location_catalog to anon, authenticated;
create policy verified_catalog_read on public.location_catalog for select to anon, authenticated
  using (verification_status = 'verified');
-- Only trusted maintenance (postgres/service role) may publish verified metadata.
