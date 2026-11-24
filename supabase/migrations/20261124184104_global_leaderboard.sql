-- Existing records use the current five-round curve, but have no authoritative proof.
alter table public.game_scores add column if not exists scoring_version text default 'distance-v1';
alter table public.game_scores add column verification text not null default 'unverified'
  check (verification in ('unverified','verified'));
alter table public.game_scores add column if not exists difficulty text check (difficulty in ('relaxed','easy','normal','hard','expert'));
alter table public.game_scores add column if not exists time_limit_seconds integer;
create index game_scores_best_idx on public.game_scores
  (scoring_version, verification, user_id, total_points desc, completed_at, id);
create index game_scores_mode_best_idx on public.game_scores
  (mode, scoring_version, user_id, total_points desc, completed_at, id);

-- Only public display information; never copy emails or arbitrary auth metadata.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text check (username ~ '^[A-Za-z0-9А-Яа-я_ -]{3,30}$'),
  avatar_url text check (length(avatar_url) <= 2048 and avatar_url ~ '^https://')
);
alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant insert(id,username), update(username) on public.profiles to authenticated;
create policy profiles_own_read on public.profiles for select to authenticated using ((select auth.uid())=id);
create policy profiles_own_insert on public.profiles for insert to authenticated with check ((select auth.uid())=id);
create policy profiles_own_update on public.profiles for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);

-- Direct browser inserts could choose verification, dates and scoring versions.
-- Preserve owner history policies; writes now go through the narrow RPC below.
revoke insert on public.game_scores from authenticated;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function public.submit_game_score(p_id uuid,p_mode text,p_points integer,p_duration bigint,p_difficulty text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); previous_best integer; inserted_count integer;
begin
  if owner_id is null or not exists(select 1 from auth.users where id=owner_id and not is_anonymous) then
    raise exception 'Sign in required' using errcode='42501';
  end if;
  if p_id is null or p_mode is null or p_mode not in ('classic','no-move') or p_points is null or p_points not between 0 and 25000
    or p_duration is null or p_duration not between 0 and 9007199254740991 then
    raise exception 'Invalid game' using errcode='22023';
  end if;
  if p_difficulty is not null and p_difficulty not in ('relaxed','easy','normal','hard','expert') then raise exception 'Invalid difficulty'; end if;
  -- Serialize submissions per player for consistent personal-best notifications.
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text,0));
  select max(total_points) into previous_best from public.game_scores where user_id=owner_id and (scoring_version='distance-v1' or scoring_version is null);
  insert into public.game_scores(user_id,id,mode,total_points,duration_ms,completed_at,scoring_version,verification,difficulty,time_limit_seconds)
    values(owner_id,p_id,p_mode,p_points,p_duration,clock_timestamp(),'distance-v1','unverified',p_difficulty,
      case p_difficulty when 'easy' then 120 when 'normal' then 60 when 'hard' then 30 when 'expert' then 15 else null end)
    on conflict(user_id,id) do nothing;
  get diagnostics inserted_count = row_count;
  return jsonb_build_object('personal_best',inserted_count=1 and (previous_best is null or p_points>previous_best));
end $$;
revoke all on function public.submit_game_score(uuid,text,integer,bigint,text) from public,anon;
grant execute on function public.submit_game_score(uuid,text,integer,bigint,text) to authenticated;

-- A deliberately bounded public projection; owner-only table RLS stays in place.
-- These functions need definer privileges to aggregate across players, not to expose records.
create function private.leaderboard_rows(p_mode text,p_verified boolean,p_difficulty text)
returns table(rank bigint,player_id uuid,username text,avatar_url text,score integer,mode text,difficulty text,achieved_at timestamptz,verification text)
language sql stable security definer set search_path='' as $$
  with best as (
    select distinct on(s.user_id) s.* from public.game_scores s
    join auth.users u on u.id=s.user_id and not u.is_anonymous
    where (s.scoring_version='distance-v1' or s.scoring_version is null)
      and (p_mode is null or s.mode=p_mode)
      and (p_difficulty is null or s.difficulty=p_difficulty)
      and (not p_verified or s.verification='verified')
    order by s.user_id,s.total_points desc,s.completed_at,s.id
  )
  select row_number() over(order by b.total_points desc,b.completed_at,b.id,b.user_id),
    b.user_id,p.username,p.avatar_url,b.total_points,b.mode,b.difficulty,b.completed_at,b.verification
  from best b left join public.profiles p on p.id=b.user_id
$$;
revoke all on function private.leaderboard_rows(text,boolean,text) from public,anon,authenticated;

create function public.get_leaderboard(p_mode text default null,p_verified boolean default false,p_offset integer default 0,p_difficulty text default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if p_difficulty is not null and p_difficulty not in ('relaxed','easy','normal','hard','expert') then raise exception 'Invalid difficulty'; end if;
  if p_mode is not null and p_mode not in ('classic','no-move') then raise exception 'Invalid mode'; end if;
  if p_offset is null or p_offset<0 or p_offset>1000000 or p_verified is null then raise exception 'Invalid page'; end if;
  with ranked as materialized (select * from private.leaderboard_rows(p_mode,p_verified,p_difficulty)),
  page as (select * from ranked order by rank offset p_offset limit 20),
  podium as (select * from ranked order by rank limit 3)
  select jsonb_build_object(
    'rows',coalesce((select jsonb_agg(to_jsonb(p) order by p.rank) from page p),'[]'::jsonb),
    'podium',coalesce((select jsonb_agg(to_jsonb(p) order by p.rank) from podium p),'[]'::jsonb),
    'total',(select count(*) from ranked),
    'personal',(select to_jsonb(r) from ranked r where r.player_id=auth.uid()),
    'best',(select max(total_points) from public.game_scores where user_id=auth.uid() and (scoring_version='distance-v1' or scoring_version is null)),
    'completed_games',(select count(*) from public.game_scores where user_id=auth.uid())
  ) into result;
  return result;
end $$;
revoke all on function public.get_leaderboard(text,boolean,integer,text) from public;
grant execute on function public.get_leaderboard(text,boolean,integer,text) to anon,authenticated;
