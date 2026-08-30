-- Break recipes <-> recipe_family_shares RLS recursion.
-- Policies must not SELECT the other table under invoker rights.

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

drop policy if exists "Authors and members can view recipe family shares" on public.recipe_family_shares;
drop policy if exists "Authors can share recipes with families they belong to" on public.recipe_family_shares;
drop policy if exists "Authors can unshare recipes" on public.recipe_family_shares;
drop policy if exists "Public, own, or family-shared recipes are viewable" on public.recipes;
drop policy if exists "Public recipes are viewable" on public.recipes;
drop policy if exists "Own or family-shared recipes are viewable" on public.recipes;

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
