-- Allow German for UI preference and recipe language metadata
alter table public.profiles drop constraint if exists profiles_preferred_locale_check;
alter table public.profiles
  add constraint profiles_preferred_locale_check
  check (preferred_locale in ('en', 'es', 'de'));

alter table public.recipes drop constraint if exists recipes_locale_check;
alter table public.recipes
  add constraint recipes_locale_check
  check (locale in ('en', 'es', 'de', 'other'));
