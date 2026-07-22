-- Privacy-friendly recipe view totals with a rolling 24-hour browser cooldown.

create schema if not exists private;
create extension if not exists pg_cron with schema pg_catalog;

create table private.recipe_view_dedupe (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  viewer_hash text not null check (viewer_hash ~ '^[0-9a-f]{64}$'),
  last_counted_at timestamptz not null default now(),
  primary key (recipe_id, viewer_hash)
);

create index recipe_view_dedupe_last_counted_at_idx
  on private.recipe_view_dedupe (last_counted_at);

revoke all on schema private from public;
revoke all on table private.recipe_view_dedupe from public, anon, authenticated;

create table public.recipe_view_stats (
  recipe_id uuid primary key references public.recipes (id) on delete cascade,
  view_count bigint not null default 0 check (view_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.recipe_view_stats enable row level security;

revoke all on table public.recipe_view_stats from public, anon, authenticated;

create policy "View stats follow recipe visibility"
  on public.recipe_view_stats for select
  using (
    exists (
      select 1
      from public.recipes r
      where r.id = recipe_id
        and (r.is_public = true or r.author_id = (select auth.uid()))
    )
  );

grant select on table public.recipe_view_stats to anon, authenticated;

create or replace function private.record_recipe_view(
  p_recipe_id uuid,
  p_viewer_hash text,
  p_user_id uuid
)
returns table (counted boolean, view_count bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author_id uuid;
  v_is_public boolean;
  v_now timestamptz := now();
  v_counted boolean := false;
  v_view_count bigint := 0;
begin
  if p_viewer_hash is null or p_viewer_hash !~ '^[0-9a-f]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'invalid viewer hash';
  end if;

  select r.author_id, r.is_public
  into v_author_id, v_is_public
  from public.recipes r
  where r.id = p_recipe_id
  for share;

  if not found or not v_is_public then
    return;
  end if;

  if p_user_id is not null and p_user_id = v_author_id then
    select stats.view_count
    into v_view_count
    from public.recipe_view_stats stats
    where stats.recipe_id = p_recipe_id;

    v_view_count := coalesce(v_view_count, 0);
    return query select false, v_view_count;
    return;
  end if;

  insert into private.recipe_view_dedupe as dedupe (
    recipe_id,
    viewer_hash,
    last_counted_at
  )
  values (
    p_recipe_id,
    p_viewer_hash,
    v_now
  )
  on conflict (recipe_id, viewer_hash) do update
    set last_counted_at = excluded.last_counted_at
    where dedupe.last_counted_at <= v_now - interval '24 hours'
  returning true into v_counted;

  v_counted := coalesce(v_counted, false);

  if v_counted then
    insert into public.recipe_view_stats as stats (
      recipe_id,
      view_count,
      updated_at
    )
    values (
      p_recipe_id,
      1,
      v_now
    )
    on conflict (recipe_id) do update
      set
        view_count = stats.view_count + 1,
        updated_at = excluded.updated_at
    returning stats.view_count into v_view_count;
  else
    select stats.view_count
    into v_view_count
    from public.recipe_view_stats stats
    where stats.recipe_id = p_recipe_id;
  end if;

  v_view_count := coalesce(v_view_count, 0);
  return query select v_counted, v_view_count;
end;
$$;

revoke all on function private.record_recipe_view(uuid, text, uuid) from public;
revoke all on function private.record_recipe_view(uuid, text, uuid) from anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.record_recipe_view(uuid, text, uuid) to service_role;

create or replace function public.record_recipe_view(
  p_recipe_id uuid,
  p_viewer_hash text,
  p_user_id uuid
)
returns table (counted boolean, view_count bigint)
language sql
security invoker
set search_path = ''
as $$
  select result.counted, result.view_count
  from private.record_recipe_view(p_recipe_id, p_viewer_hash, p_user_id) result;
$$;

revoke all on function public.record_recipe_view(uuid, text, uuid) from public;
revoke all on function public.record_recipe_view(uuid, text, uuid) from anon, authenticated;
grant execute on function public.record_recipe_view(uuid, text, uuid) to service_role;

select cron.schedule(
  'cleanup-recipe-view-dedupe',
  '17 3 * * *',
  $cron$
    delete from private.recipe_view_dedupe
    where last_counted_at < now() - interval '30 days'
  $cron$
);
