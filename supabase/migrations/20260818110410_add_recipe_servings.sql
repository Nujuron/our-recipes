-- Baseline people count for scaling ingredient quantities in cooking mode

alter table public.recipes
  add column if not exists servings integer not null default 1;

alter table public.recipes
  drop constraint if exists recipes_servings_check;

alter table public.recipes
  add constraint recipes_servings_check check (servings >= 1);
