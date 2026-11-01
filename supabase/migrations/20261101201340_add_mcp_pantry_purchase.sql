-- One atomic receipt/purchase, including every split product and its immutable retry manifest.
create function public.record_pantry_purchase(p_operation_id uuid, p_pantry_id uuid, p_items jsonb)
returns uuid[] language plpgsql security invoker set search_path = '' as $$
declare
  v_receipt public.pantry_import_lines;
  v_item jsonb;
  v_ids uuid[] := '{}';
  v_item_ids uuid[];
  v_index integer := 0;
begin
  if (select auth.uid()) is null or p_operation_id is null then raise exception 'invalid_import'; end if;
  perform 1 from public.pantries where id = p_pantry_id;
  if not found then raise exception 'pantry_not_found'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'invalid_import'; end if;
  if jsonb_array_length(p_items) not between 1 and 100 then raise exception 'invalid_import'; end if;
  -- Same namespace and lock as import_pantry_line for this manifest key.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended((select auth.uid())::text || p_operation_id::text || 'mcp-purchase', 0));
  select * into v_receipt from public.pantry_import_lines
    where user_id = (select auth.uid()) and operation_id = p_operation_id and line_id = 'mcp-purchase';
  if found then
    if v_receipt.pantry_id <> p_pantry_id or v_receipt.payload <> p_items then raise exception 'pantry_conflict'; end if;
    return v_receipt.lot_ids;
  end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    -- Receipt and purchase dates must never become food use-by / best-before dates.
    if v_item->>'food_date' is not null or v_item->>'date_type' is not null then raise exception 'invalid_import'; end if;
    v_index := v_index + 1;
    v_item_ids := public.import_pantry_line(p_operation_id, 'mcp-purchase:' || v_index::text, p_pantry_id, jsonb_build_array(v_item));
    v_ids := v_ids || v_item_ids;
  end loop;
  insert into public.pantry_import_lines(user_id, operation_id, line_id, pantry_id, payload, lot_ids)
    values ((select auth.uid()), p_operation_id, 'mcp-purchase', p_pantry_id, p_items, v_ids);
  return v_ids;
end;
$$;
revoke all on function public.record_pantry_purchase(uuid, uuid, jsonb) from public, anon;
grant execute on function public.record_pantry_purchase(uuid, uuid, jsonb) to authenticated;
