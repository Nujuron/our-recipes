-- Families: membership, invite links, and per-recipe visibility grants.

create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to postgres, service_role, authenticated;

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.family_members (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('creator', 'member')),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create index family_members_user_id_idx on public.family_members (user_id);

create table public.family_invites (
  family_id uuid primary key references public.families (id) on delete cascade,
  token text not null unique,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.recipe_family_shares (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  primary key (recipe_id, family_id)
);

create index recipe_family_shares_family_id_idx on public.recipe_family_shares (family_id);

alter table public.profiles
  add column primary_family_id uuid references public.families (id) on delete set null;

create or replace function private.user_family_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select family_id
  from public.family_members
  where user_id = (select auth.uid());
$$;

revoke all on function private.user_family_ids() from public;
grant execute on function private.user_family_ids() to authenticated;

create or replace function private.is_family_creator(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.family_members
    where family_id = p_family_id
      and user_id = (select auth.uid())
      and role = 'creator'
  );
$$;

revoke all on function private.is_family_creator(uuid) from public;
grant execute on function private.is_family_creator(uuid) to authenticated;

create or replace function private.is_recipe_author(p_recipe_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.recipes r
    where r.id = p_recipe_id
      and r.author_id = (select auth.uid())
  );
$$;

revoke all on function private.is_recipe_author(uuid) from public;
grant execute on function private.is_recipe_author(uuid) to authenticated;

create or replace function private.recipe_shared_with_caller(p_recipe_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.recipe_family_shares s
    where s.recipe_id = p_recipe_id
      and s.family_id in (
        select m.family_id
        from public.family_members m
        where m.user_id = (select auth.uid())
      )
  );
$$;

revoke all on function private.recipe_shared_with_caller(uuid) from public;
grant execute on function private.recipe_shared_with_caller(uuid) to authenticated;

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invites enable row level security;
alter table public.recipe_family_shares enable row level security;

create policy "Members can view their families"
  on public.families for select
  using (
    id in (select private.user_family_ids())
    or created_by = (select auth.uid())
  );

create policy "Signed-in users can create families"
  on public.families for insert
  to authenticated
  with check ((select auth.uid()) = created_by);

create policy "Creators can update their families"
  on public.families for update
  using (private.is_family_creator(id))
  with check (private.is_family_creator(id));

create policy "Creators can delete their families"
  on public.families for delete
  using (
    private.is_family_creator(id)
    or (
      created_by = (select auth.uid())
      and not exists (
        select 1 from public.family_members m where m.family_id = families.id
      )
    )
  );

create policy "Members can view family membership"
  on public.family_members for select
  using (family_id in (select private.user_family_ids()));

create policy "Creators can add themselves as the first member"
  on public.family_members for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and role = 'creator'
    and exists (
      select 1
      from public.families f
      where f.id = family_id
        and f.created_by = (select auth.uid())
    )
  );

create policy "Users can leave a family"
  on public.family_members for delete
  using (
    user_id = (select auth.uid())
    or private.is_family_creator(family_id)
  );

create policy "Creators can view invites"
  on public.family_invites for select
  using (private.is_family_creator(family_id));

create policy "Creators can create invites"
  on public.family_invites for insert
  to authenticated
  with check (private.is_family_creator(family_id) and created_by = (select auth.uid()));

create policy "Creators can replace invites"
  on public.family_invites for update
  using (private.is_family_creator(family_id))
  with check (private.is_family_creator(family_id) and created_by = (select auth.uid()));

create policy "Creators can delete invites"
  on public.family_invites for delete
  using (private.is_family_creator(family_id));

create policy "Authors and members can view recipe family shares"
  on public.recipe_family_shares for select
  using (
    family_id in (select private.user_family_ids())
    or private.is_recipe_author(recipe_id)
  );

create policy "Authors can share recipes with families they belong to"
  on public.recipe_family_shares for insert
  to authenticated
  with check (
    family_id in (select private.user_family_ids())
    and private.is_recipe_author(recipe_id)
  );

create policy "Authors can unshare recipes"
  on public.recipe_family_shares for delete
  using (private.is_recipe_author(recipe_id));

drop policy "Public or own recipes are viewable" on public.recipes;

create policy "Public recipes are viewable"
  on public.recipes for select
  using (is_public = true);

create policy "Own or family-shared recipes are viewable"
  on public.recipes for select
  to authenticated
  using (
    author_id = (select auth.uid())
    or private.recipe_shared_with_caller(id)
  );

create or replace function public.accept_family_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_family_id uuid;
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select family_id into v_family_id
  from public.family_invites
  where token = p_token;

  if v_family_id is null then
    raise exception 'invalid_invite';
  end if;

  insert into public.family_members (family_id, user_id, role)
  values (v_family_id, v_uid, 'member')
  on conflict (family_id, user_id) do nothing;

  update public.profiles
  set primary_family_id = v_family_id
  where id = v_uid
    and primary_family_id is null;

  return v_family_id;
end;
$$;

revoke all on function public.accept_family_invite(text) from public;
grant execute on function public.accept_family_invite(text) to authenticated;

create or replace function public.peek_family_invite(p_token text)
returns table (family_id uuid, family_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select f.id, f.name
  from public.family_invites i
  join public.families f on f.id = i.family_id
  where i.token = p_token;
$$;

revoke all on function public.peek_family_invite(text) from public;
grant execute on function public.peek_family_invite(text) to authenticated;

create or replace function public.prune_empty_family()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.family_members where family_id = old.family_id
  ) then
    delete from public.families where id = old.family_id;
  end if;
  return old;
end;
$$;

revoke all on function public.prune_empty_family() from public;

create trigger family_members_prune_empty
  after delete on public.family_members
  for each row execute function public.prune_empty_family();
