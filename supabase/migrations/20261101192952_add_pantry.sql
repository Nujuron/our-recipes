-- Personal and explicitly shared family pantries. All RPCs run as the caller.
create table public.pantries (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid unique references public.profiles(id) on delete cascade,
  family_id uuid unique references public.families(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  timezone text not null,
  warning_days integer not null default 3 check (warning_days between 0 and 30),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((owner_user_id is null) <> (family_id is null))
);

create table public.pantry_lots (
  id uuid primary key default gen_random_uuid(),
  pantry_id uuid not null references public.pantries(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  quantity numeric check (quantity is null or (quantity >= 0 and quantity <= 1000000000000)),
  unit text check (char_length(unit) <= 40),
  location text not null check (location in ('pantry', 'fridge', 'freezer')),
  food_date date check (food_date between date '0001-01-01' and date '9999-12-31'),
  date_type text check (date_type in ('use_by', 'best_before')),
  note text check (char_length(note) <= 1000),
  status text not null default 'active' check (status in ('active', 'finished', 'discarded')),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((food_date is null) = (date_type is null)),
  check (status <> 'active' or quantity is null or quantity > 0)
);
create index pantry_lots_pantry_date_idx on public.pantry_lots(pantry_id, food_date);

create table public.pantry_import_lines (
  user_id uuid not null references public.profiles(id) on delete cascade,
  operation_id uuid not null,
  line_id text not null check (char_length(line_id) between 1 and 100),
  pantry_id uuid not null references public.pantries(id) on delete cascade,
  payload jsonb not null,
  lot_ids uuid[] not null,
  created_at timestamptz not null default now(),
  primary key (user_id, operation_id, line_id)
);
create index pantry_import_lines_pantry_idx on public.pantry_import_lines(pantry_id);

alter table public.pantries enable row level security;
alter table public.pantry_lots enable row level security;
alter table public.pantry_import_lines enable row level security;
revoke all on public.pantries, public.pantry_lots, public.pantry_import_lines from public, anon, authenticated;
grant select, insert, update on public.pantries, public.pantry_lots to authenticated;
grant select, insert on public.pantry_import_lines to authenticated;

create policy "Current members can read pantries" on public.pantries for select to authenticated
  using (owner_user_id = (select auth.uid()) or family_id in (select private.user_family_ids()));
create policy "Create personal or current family pantry" on public.pantries for insert to authenticated
  with check (owner_user_id = (select auth.uid()) or family_id in (select private.user_family_ids()));
create policy "Current members can edit pantries" on public.pantries for update to authenticated
  using (owner_user_id = (select auth.uid()) or family_id in (select private.user_family_ids()))
  with check (owner_user_id = (select auth.uid()) or family_id in (select private.user_family_ids()));

create policy "Current members can read lots" on public.pantry_lots for select to authenticated
  using (exists (select 1 from public.pantries p where p.id = pantry_id));
create policy "Current members can add lots" on public.pantry_lots for insert to authenticated
  with check (exists (select 1 from public.pantries p where p.id = pantry_id));
create policy "Current members can edit lots" on public.pantry_lots for update to authenticated
  using (exists (select 1 from public.pantries p where p.id = pantry_id))
  with check (exists (select 1 from public.pantries p where p.id = pantry_id));

create policy "Read own import receipts in accessible pantry" on public.pantry_import_lines for select to authenticated
  using (user_id = (select auth.uid()) and exists (select 1 from public.pantries p where p.id = pantry_id));
create policy "Write own import receipts in accessible pantry" on public.pantry_import_lines for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.pantries p where p.id = pantry_id));

create function private.validate_pantry_update() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'invalid_timezone';
  end if;
  if tg_op = 'UPDATE' then
    if new.id <> old.id or new.owner_user_id is distinct from old.owner_user_id or new.family_id is distinct from old.family_id then
      raise exception 'immutable_pantry_owner';
    end if;
    new.version := old.version + 1;
    new.created_at := old.created_at;
  else
    new.version := 1;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.validate_pantry_update() from public, anon, authenticated;
create trigger validate_pantry before insert or update on public.pantries
  for each row execute function private.validate_pantry_update();

create function private.validate_pantry_lot_update() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.id <> old.id or new.pantry_id <> old.pantry_id then raise exception 'immutable_lot_pantry'; end if;
    new.version := old.version + 1;
    new.created_at := old.created_at;
  else
    new.version := 1;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.validate_pantry_lot_update() from public, anon, authenticated;
create trigger validate_pantry_lot before insert or update on public.pantry_lots
  for each row execute function private.validate_pantry_lot_update();

create function public.consume_pantry_lot(p_lot_id uuid, p_version integer, p_amount numeric)
returns public.pantry_lots language plpgsql security invoker set search_path = '' as $$
declare lot public.pantry_lots;
begin
  select * into lot from public.pantry_lots where id = p_lot_id for update;
  if not found then raise exception 'pantry_not_found'; end if;
  if p_version is null or lot.version <> p_version then raise exception 'pantry_conflict'; end if;
  if lot.status <> 'active' or lot.quantity is null or p_amount is null or not (p_amount > 0 and p_amount <= lot.quantity) then
    raise exception 'invalid_quantity';
  end if;
  update public.pantry_lots set quantity = quantity - p_amount,
    status = case when quantity = p_amount then 'finished' else 'active' end
    where id = p_lot_id returning * into lot;
  return lot;
end;
$$;
revoke all on function public.consume_pantry_lot(uuid, integer, numeric) from public, anon;
grant execute on function public.consume_pantry_lot(uuid, integer, numeric) to authenticated;

-- One transaction per source line: every split lot and its immutable receipt commit together.
create function public.import_pantry_line(p_operation_id uuid, p_line_id text, p_pantry_id uuid, p_lots jsonb)
returns uuid[] language plpgsql security invoker set search_path = '' as $$
declare receipt public.pantry_import_lines; item jsonb; ids uuid[] := '{}'; lot_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'pantry_not_found'; end if;
  if p_operation_id is null or p_line_id is null or char_length(p_line_id) not between 1 and 100 then raise exception 'invalid_import'; end if;
  -- RLS is checked even when replaying an old receipt after membership changes.
  perform 1 from public.pantries where id = p_pantry_id;
  if not found then raise exception 'pantry_not_found'; end if;
  if jsonb_typeof(p_lots) is distinct from 'array' then raise exception 'invalid_import'; end if;
  if jsonb_array_length(p_lots) not between 1 and 20 then raise exception 'invalid_import'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended((select auth.uid())::text || p_operation_id::text || p_line_id, 0));
  select * into receipt from public.pantry_import_lines
    where user_id = (select auth.uid()) and operation_id = p_operation_id and line_id = p_line_id;
  if found then
    if receipt.pantry_id <> p_pantry_id or receipt.payload <> p_lots then raise exception 'pantry_conflict'; end if;
    return receipt.lot_ids;
  end if;
  for item in select * from jsonb_array_elements(p_lots) loop
    insert into public.pantry_lots(id, pantry_id, name, quantity, unit, location, food_date, date_type, note)
    values ((item->>'id')::uuid, p_pantry_id, trim(item->>'name'), (item->>'quantity')::numeric,
      nullif(trim(item->>'unit'), ''), item->>'location', (item->>'food_date')::date, item->>'date_type', nullif(trim(item->>'note'), ''))
    returning id into lot_id;
    ids := array_append(ids, lot_id);
  end loop;
  insert into public.pantry_import_lines(user_id, operation_id, line_id, pantry_id, payload, lot_ids)
    values ((select auth.uid()), p_operation_id, p_line_id, p_pantry_id, p_lots, ids);
  return ids;
end;
$$;
revoke all on function public.import_pantry_line(uuid, text, uuid, jsonb) from public, anon;
grant execute on function public.import_pantry_line(uuid, text, uuid, jsonb) to authenticated;
