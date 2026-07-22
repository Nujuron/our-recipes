-- Allow recipe authors to rate their own public recipes.

drop policy if exists "Users can insert ratings on public recipes they do not own"
  on public.recipe_ratings;

drop policy if exists "Users can update own ratings on public recipes they do not own"
  on public.recipe_ratings;

create policy "Users can insert ratings on public recipes"
  on public.recipe_ratings for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.recipes r
      where r.id = recipe_id
        and r.is_public = true
    )
  );

create policy "Users can update own ratings on public recipes"
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
    )
  );
