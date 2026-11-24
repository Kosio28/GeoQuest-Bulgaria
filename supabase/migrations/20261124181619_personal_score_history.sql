create table public.game_scores (
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid not null,
  mode text not null check (mode in ('classic', 'no-move')),
  total_points integer not null check (total_points between 0 and 25000),
  duration_ms bigint not null check (duration_ms between 0 and 9007199254740991),
  completed_at timestamptz not null check (isfinite(completed_at)),
  primary key (user_id, id)
);

create index game_scores_history_idx
  on public.game_scores (user_id, completed_at desc, id desc);

alter table public.game_scores enable row level security;
revoke all on public.game_scores from public, anon, authenticated;
grant select, insert on public.game_scores to authenticated;

create policy game_scores_select_own on public.game_scores
  for select to authenticated using ((select auth.uid()) = user_id);

create policy game_scores_insert_own on public.game_scores
  for insert to authenticated with check ((select auth.uid()) = user_id);
