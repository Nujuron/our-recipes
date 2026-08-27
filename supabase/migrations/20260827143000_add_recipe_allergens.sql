-- EU Regulation 1169/2011 annex II allergens present in a recipe

create type public.allergen as enum (
  'gluten',
  'crustaceans',
  'eggs',
  'fish',
  'peanuts',
  'soy',
  'milk',
  'nuts',
  'celery',
  'mustard',
  'sesame',
  'sulphites',
  'lupin',
  'molluscs'
);

alter table public.recipes
  add column if not exists allergens public.allergen[] not null default '{}'::public.allergen[];

comment on column public.recipes.allergens is
  'EU 14 allergens contained in this recipe';
