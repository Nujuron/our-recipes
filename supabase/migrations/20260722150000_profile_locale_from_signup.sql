-- Prefer UI locale from auth signup metadata when creating profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  preferred text;
begin
  preferred := new.raw_user_meta_data ->> 'preferred_locale';
  if preferred is null or preferred not in ('en', 'es', 'de') then
    preferred := 'en';
  end if;

  insert into public.profiles (id, display_name, avatar_url, preferred_locale)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url',
    preferred
  );
  return new;
end;
$$;
