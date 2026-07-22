-- Public URLs use recipe id (uuid); title-based slugs are unstable
alter table public.recipes drop constraint if exists recipes_slug_unique;
alter table public.recipes drop column if exists slug;
