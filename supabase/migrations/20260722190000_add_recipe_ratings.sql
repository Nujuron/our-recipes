-- Signed-in ratings (1–5) with private notes; public aggregates via recipe_rating_stats.

create schema if not exists private;

create table public.recipe_ratings (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  note text check (note is null or char_length(note) <= 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_ratings_recipe_user_unique unique (recipe_id, user_id)
);

create index recipe_ratings_recipe_id_idx on public.recipe_ratings (recipe_id);
create index recipe_ratings_user_id_idx on public.recipe_ratings (user_id);

create table public.recipe_rating_stats (
  recipe_id uuid primary key references public.recipes (id) on delete cascade,
  rating_sum integer not null default 0 check (rating_sum >= 0),
  rating_count integer not null default 0 check (rating_count >= 0),
  updated_at timestamptz not null default now(),
  constraint recipe_rating_stats_sum_matches_count check (
    (rating_count = 0 and rating_sum = 0) or (rating_count > 0 and rating_sum >= rating_count)
  )
);

create or replace function private.sync_recipe_rating_stats()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.recipe_rating_stats as stats (recipe_id, rating_sum, rating_count, updated_at)
    values (new.recipe_id, new.score, 1, now())
    on conflict (recipe_id) do update
      set
        rating_sum = stats.rating_sum + excluded.rating_sum,
        rating_count = stats.rating_count + 1,
        updated_at = now();
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.recipe_id is distinct from old.recipe_id then
      raise exception 'recipe_id cannot change on recipe_ratings';
    end if;

    update public.recipe_rating_stats
    set
      rating_sum = rating_sum + (new.score - old.score),
      updated_at = now()
    where recipe_id = new.recipe_id;

    return new;
  end if;

  -- DELETE
  update public.recipe_rating_stats
  set
    rating_sum = rating_sum - old.score,
    rating_count = rating_count - 1,
    updated_at = now()
  where recipe_id = old.recipe_id;

  delete from public.recipe_rating_stats
  where recipe_id = old.recipe_id
    and rating_count <= 0;

  return old;
end;
$$;

revoke all on function private.sync_recipe_rating_stats() from public;
revoke all on function private.sync_recipe_rating_stats() from anon, authenticated;

create trigger recipe_ratings_set_updated_at
  before update on public.recipe_ratings
  for each row execute function public.set_updated_at();

create trigger recipe_ratings_sync_stats
  after insert or update or delete on public.recipe_ratings
  for each row execute function private.sync_recipe_rating_stats();

alter table public.recipe_ratings enable row level security;
alter table public.recipe_rating_stats enable row level security;

create policy "Users can view own ratings"
  on public.recipe_ratings for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert ratings on public recipes they do not own"
  on public.recipe_ratings for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.recipes r
      where r.id = recipe_id
        and r.is_public = true
        and r.author_id is distinct from (select auth.uid())
    )
  );

create policy "Users can update own ratings on public recipes they do not own"
  on public.recipe_ratings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.recipes r
      where r.id = recipe_id
        and r.is_public = true
        and r.author_id is distinct from (select auth.uid())
    )
  );

create policy "Users can delete own ratings"
  on public.recipe_ratings for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Rating stats follow recipe visibility"
  on public.recipe_rating_stats for select
  using (
    exists (
      select 1
      from public.recipes r
      where r.id = recipe_id
        and (r.is_public = true or r.author_id = (select auth.uid()))
    )
  );

grant select on table public.recipe_rating_stats to anon, authenticated;
grant select, insert, update, delete on table public.recipe_ratings to authenticated;
grant select on table public.recipe_ratings to anon;
