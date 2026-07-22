-- Applied remotely via Supabase MCP as init_profiles_recipes_rls_storage
-- plus tighten_recipe_covers_storage_policy (dropped public listing SELECT on covers)

create extension if not exists pg_trgm with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  preferred_locale text not null default 'en' check (preferred_locale in ('en', 'es')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  slug text not null,
  summary text,
  body_md text not null default '',
  cover_path text,
  is_public boolean not null default false,
  locale text not null default 'en' check (locale in ('en', 'es', 'other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipes_slug_unique unique (slug)
);

create index recipes_author_id_idx on public.recipes (author_id);
create index recipes_public_created_idx on public.recipes (created_at desc) where is_public = true;
create index recipes_title_trgm_idx on public.recipes using gin (title extensions.gin_trgm_ops);

alter table public.profiles enable row level security;
alter table public.recipes enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Public or own recipes are viewable"
  on public.recipes for select
  using (is_public = true or author_id = (select auth.uid()));

create policy "Users can insert own recipes"
  on public.recipes for insert
  with check ((select auth.uid()) = author_id);

create policy "Users can update own recipes"
  on public.recipes for update
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

create policy "Users can delete own recipes"
  on public.recipes for delete
  using ((select auth.uid()) = author_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public;
revoke all on function public.set_updated_at() from anon, authenticated;

create trigger recipes_set_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public)
values ('recipe-covers', 'recipe-covers', true)
on conflict (id) do nothing;

-- No broad SELECT on storage.objects: public bucket URLs work without listing.

create policy "Authenticated users upload own covers"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'recipe-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users update own covers"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'recipe-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'recipe-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users delete own covers"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'recipe-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
