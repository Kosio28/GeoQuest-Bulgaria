-- Additive only: old scores retain NULL difficulty/time limit and their original values.
alter table public.game_scores
  add column if not exists difficulty text check (difficulty in ('relaxed','easy','normal','hard','expert')),
  add column if not exists time_limit_seconds integer check (time_limit_seconds in (15,30,60,120)),
  add column if not exists scoring_version text;

-- Derive time limits for NEW submissions, including the existing submit RPC.
-- No backfill: an old unknown difficulty must remain unknown.
create function public.set_game_time_limit() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.time_limit_seconds := case new.difficulty
    when 'easy' then 120 when 'normal' then 60
    when 'hard' then 30 when 'expert' then 15 else null end;
  return new;
end $$;
revoke all on function public.set_game_time_limit() from public, anon, authenticated;
create trigger game_scores_time_limit before insert on public.game_scores
for each row execute function public.set_game_time_limit();
