-- Structured ingredients (jsonb) and optional cooking steps override

alter table public.recipes
  add column if not exists steps text;

alter table public.recipes
  add column if not exists ingredients_json jsonb not null default '[]'::jsonb;

create or replace function public.parse_ingredient_line(line text)
returns jsonb
language plpgsql
immutable
as $$
declare
  cleaned text;
  match_arr text[];
begin
  cleaned := trim(regexp_replace(line, '^[-*•]\s+', ''));
  if cleaned = '' then
    return null;
  end if;

  match_arr := regexp_match(
    cleaned,
    '^(\d+(?:[.,]\d+)?(?:\s*/\s*\d+)?)\s+([a-zA-ZáéíóúüñÁÉÍÓÚÜÑ.]+)\s+(.+)$'
  );
  if match_arr is not null then
    return jsonb_build_object(
      'name',
      trim(match_arr[3]),
      'quantity',
      match_arr[1],
      'unit',
      lower(match_arr[2])
    );
  end if;

  return jsonb_build_object('name', cleaned, 'quantity', null, 'unit', null);
end;
$$;

update public.recipes
set ingredients_json = coalesce(
  (
    select jsonb_agg(parsed.ingredient order by parsed.ord)
    from (
      select
        ordinality as ord,
        public.parse_ingredient_line(line) as ingredient
      from unnest(string_to_array(coalesce(ingredients, ''), E'\n')) with ordinality as line(line, ordinality)
    ) as parsed
    where parsed.ingredient is not null
  ),
  '[]'::jsonb
)
where ingredients is not null
  and trim(ingredients) <> '';

alter table public.recipes
  drop column if exists ingredients;

alter table public.recipes
  rename column ingredients_json to ingredients;

drop function if exists public.parse_ingredient_line(text);
