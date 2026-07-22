begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

select has_table('private', 'recipe_view_dedupe', 'dedupe table is private');
select has_table('public', 'recipe_view_stats', 'aggregate table is public');
select has_function(
  'public',
  'record_recipe_view',
  array['uuid', 'text', 'uuid'],
  'server-only view function exists'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.record_recipe_view(uuid,text,uuid)',
    'EXECUTE'
  ),
  'anonymous role cannot call the view function directly'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.record_recipe_view(uuid,text,uuid)',
    'EXECUTE'
  ),
  'authenticated role cannot call the view function directly'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.record_recipe_view(uuid,text,uuid)',
    'EXECUTE'
  ),
  'service role can call the view function'
);
select ok(
  not has_function_privilege(
    'anon',
    'private.record_recipe_view(uuid,text,uuid)',
    'EXECUTE'
  ),
  'anonymous role cannot call the private view function'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'private.record_recipe_view(uuid,text,uuid)',
    'EXECUTE'
  ),
  'authenticated role cannot call the private view function'
);
select ok(
  not has_table_privilege('anon', 'public.recipe_view_stats', 'INSERT'),
  'anonymous role cannot insert aggregate rows'
);
select ok(
  not has_table_privilege('authenticated', 'public.recipe_view_stats', 'UPDATE'),
  'authenticated role cannot update aggregate rows'
);
select ok(
  not has_table_privilege('authenticated', 'public.recipe_view_stats', 'DELETE'),
  'authenticated role cannot delete aggregate rows'
);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'view-owner@example.com',
  '',
  now(),
  '{}',
  '{"display_name":"View owner"}',
  now(),
  now()
);

insert into public.recipes (
  id,
  author_id,
  title,
  summary,
  body_md,
  is_public,
  locale
)
values (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'View test recipe',
  null,
  '',
  true,
  'en'
);

create temporary table first_view_result on commit drop as
select *
from public.record_recipe_view(
  '20000000-0000-0000-0000-000000000001',
  repeat('a', 64),
  null
);

select is(
  (select counted from first_view_result),
  true,
  'first anonymous view is counted'
);
select is(
  (select view_count from first_view_result),
  1::bigint,
  'first anonymous view returns total one'
);

select results_eq(
  $$
    select counted, view_count
    from public.record_recipe_view(
      '20000000-0000-0000-0000-000000000001',
      repeat('a', 64),
      null
    )
  $$,
  $$ values (false, 1::bigint) $$,
  'repeat view inside 24 hours is not counted'
);

select results_eq(
  $$
    select counted, view_count
    from public.record_recipe_view(
      '20000000-0000-0000-0000-000000000001',
      repeat('b', 64),
      '10000000-0000-0000-0000-000000000001'
    )
  $$,
  $$ values (false, 1::bigint) $$,
  'owner view is not counted'
);

update private.recipe_view_dedupe
set last_counted_at = now() - interval '24 hours'
where recipe_id = '20000000-0000-0000-0000-000000000001'
  and viewer_hash = repeat('a', 64);

select results_eq(
  $$
    select counted, view_count
    from public.record_recipe_view(
      '20000000-0000-0000-0000-000000000001',
      repeat('a', 64),
      null
    )
  $$,
  $$ values (true, 2::bigint) $$,
  'view exactly at the 24-hour boundary is counted'
);

select throws_ok(
  $$
    select *
    from public.record_recipe_view(
      '20000000-0000-0000-0000-000000000001',
      'short',
      null
    )
  $$,
  '22023',
  'invalid viewer hash',
  'malformed hashes are rejected'
);

update public.recipes
set is_public = false
where id = '20000000-0000-0000-0000-000000000001';

select is_empty(
  $$
    select *
    from public.record_recipe_view(
      '20000000-0000-0000-0000-000000000001',
      repeat('c', 64),
      null
    )
  $$,
  'private recipes return no result'
);

select is(
  (
    select count(*)
    from cron.job
    where jobname = 'cleanup-recipe-view-dedupe'
  ),
  1::bigint,
  'one retention job is scheduled'
);

delete from public.recipes
where id = '20000000-0000-0000-0000-000000000001';

select is_empty(
  $$
    select *
    from private.recipe_view_dedupe
    where recipe_id = '20000000-0000-0000-0000-000000000001'
  $$,
  'recipe deletion cascades to dedupe rows'
);
select is_empty(
  $$
    select *
    from public.recipe_view_stats
    where recipe_id = '20000000-0000-0000-0000-000000000001'
  $$,
  'recipe deletion cascades to aggregate rows'
);

select * from finish();

rollback;
