-- Optional dinner-browse facets: course and total-time effort

create type public.recipe_course as enum (
  'breakfast',
  'starter',
  'main',
  'side',
  'dessert',
  'snack',
  'drink'
);

create type public.recipe_effort as enum (
  'under_30',
  '30_60',
  'over_60'
);

alter table public.recipes
  add column if not exists course public.recipe_course,
  add column if not exists effort public.recipe_effort;

comment on column public.recipes.course is
  'Optional meal course for dinner-style browsing';

comment on column public.recipes.effort is
  'Optional total-time band: under 30, 30-60, or over 60 minutes';
