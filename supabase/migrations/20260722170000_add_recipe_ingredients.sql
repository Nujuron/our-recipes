-- Optional plain-text ingredients list (one item per line)
alter table public.recipes
  add column if not exists ingredients text;
