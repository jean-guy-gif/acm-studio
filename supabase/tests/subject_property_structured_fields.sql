-- Verification of the Mission 21 subject_properties enrichment: CHECK constraints,
-- UNIQUE(project_id) upsert, and RLS read isolation.
-- Run against the local stack:
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f - < supabase/tests/subject_property_structured_fields.sql
--
-- Runs in one transaction, ROLLED BACK at the end. Each assertion RAISEs on
-- failure; the final NOTICE is only reached if every scenario passed.

begin;

-- ===========================================================================
-- S-schema: the migration helper must NOT survive, and strengths must be a
-- NOT NULL text[] with a '{}' default.
-- ===========================================================================
do $$
declare
  v_data_type text;
  v_default text;
  v_nullable text;
begin
  if exists (
    select 1 from pg_proc
    where proname = 'jsonb_to_text_array' and pronamespace = 'public'::regnamespace
  ) then
    raise exception 'S-schema failed: temporary function jsonb_to_text_array still exists';
  end if;

  select data_type, column_default, is_nullable
    into v_data_type, v_default, v_nullable
  from information_schema.columns
  where table_schema = 'public' and table_name = 'subject_properties' and column_name = 'strengths';

  if v_data_type <> 'ARRAY' then
    raise exception 'S-schema failed: strengths is not an array (%).', v_data_type;
  end if;
  if v_default is null or v_default not like '%{}%' then
    raise exception 'S-schema failed: strengths default is not {} (%).', v_default;
  end if;
  if v_nullable <> 'NO' then
    raise exception 'S-schema failed: strengths is nullable';
  end if;
  raise notice 'S-schema OK — no leftover helper; strengths is a NOT NULL text[] default {}';
end $$;

-- Recreate the conversion helper EXCLUSIVELY inside this rolled-back test
-- transaction to verify the migration's conversion rules on every jsonb shape
-- (the function does not exist in the real schema).
create or replace function public.jsonb_to_text_array(input jsonb)
returns text[]
language sql
immutable
as $$
  select case
    when jsonb_typeof(input) = 'array' then coalesce(
      (
        select array_agg(trimmed order by ord)
        from (
          select trim(element #>> '{}') as trimmed, ord
          from jsonb_array_elements(input) with ordinality as a(element, ord)
          where jsonb_typeof(element) = 'string'
        ) parsed
        where parsed.trimmed <> ''
      ),
      '{}'::text[]
    )
    when jsonb_typeof(input) = 'string' and trim(input #>> '{}') <> ''
      then array[trim(input #>> '{}')]
    else '{}'::text[]
  end
$$;

-- ===========================================================================
-- S0: non-destructive strengths conversion. Covers every legacy jsonb shape.
-- ===========================================================================
do $$
begin
  if public.jsonb_to_text_array('["Terrasse", "Vue mer"]'::jsonb) <> array['Terrasse', 'Vue mer'] then
    raise exception 'S0a failed: JSON string array not preserved';
  end if;
  if public.jsonb_to_text_array('"Terrasse"'::jsonb) <> array['Terrasse'] then
    raise exception 'S0b failed: single JSON string not wrapped';
  end if;
  if public.jsonb_to_text_array('[]'::jsonb) <> '{}'::text[] then
    raise exception 'S0c failed: empty array not empty text[]';
  end if;
  if public.jsonb_to_text_array(null::jsonb) <> '{}'::text[] then
    raise exception 'S0d failed: null not empty text[]';
  end if;
  if public.jsonb_to_text_array('[1, true, {"a": 1}, "OK"]'::jsonb) <> array['OK'] then
    raise exception 'S0e failed: non-textual elements not dropped';
  end if;
  if public.jsonb_to_text_array('["  ", "", "Bon"]'::jsonb) <> array['Bon'] then
    raise exception 'S0f failed: blank strings not dropped';
  end if;
  if public.jsonb_to_text_array('{"x": 1}'::jsonb) <> '{}'::text[] then
    raise exception 'S0g failed: unexpected object structure not empty text[]';
  end if;
  -- Order preservation with mixed content.
  if public.jsonb_to_text_array('["B", 3, "A", "  ", "C"]'::jsonb) <> array['B', 'A', 'C'] then
    raise exception 'S0h failed: order not preserved';
  end if;
  raise notice 'S0 OK — strengths jsonb -> text[] conversion preserves data for every shape';
end $$;

insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');

insert into public.agencies (id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Agence A'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Agence B');

insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000000', 'Alice', 'A', 'a@t.local', 'owner'),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-0000-0000-0000-000000000000', 'Bob', 'B', 'b@t.local', 'owner');

insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111', 'Vendeur', 'draft');

do $$
declare
  ag uuid := 'aaaaaaaa-0000-0000-0000-000000000000';
  proj uuid := '33333333-3333-3333-3333-333333333333';
  v_failed boolean;
  v_count integer;
  v_charges numeric;
begin
  ----------------------------------------------------------------------------
  -- Helper macro via inline blocks: each bad insert must raise check_violation.
  ----------------------------------------------------------------------------

  -- S1: outdoor_spaces "none" cannot coexist with another value.
  v_failed := false;
  begin
    insert into public.subject_properties (agency_id, project_id, outdoor_spaces)
    values (ag, proj, array['none', 'balcony']);
  exception when check_violation then v_failed := true; end;
  if not v_failed then raise exception 'S1 failed: none+balcony accepted'; end if;
  raise notice 'S1 OK — outdoor_spaces none-exclusivity enforced';

  -- S2: parking_types "none" cannot coexist with another value.
  v_failed := false;
  begin
    insert into public.subject_properties (agency_id, project_id, parking_types)
    values (ag, proj, array['garage', 'none']);
  exception when check_violation then v_failed := true; end;
  if not v_failed then raise exception 'S2 failed: garage+none accepted'; end if;
  raise notice 'S2 OK — parking_types none-exclusivity enforced';

  -- S3: unknown array value rejected.
  v_failed := false;
  begin
    insert into public.subject_properties (agency_id, project_id, outdoor_spaces)
    values (ag, proj, array['pool']);
  exception when check_violation then v_failed := true; end;
  if not v_failed then raise exception 'S3 failed: unknown outdoor value accepted'; end if;
  raise notice 'S3 OK — unknown array value rejected';

  -- S4: invalid controlled scalar (GES) rejected.
  v_failed := false;
  begin
    insert into public.subject_properties (agency_id, project_id, ges_rating)
    values (ag, proj, 'H');
  exception when check_violation then v_failed := true; end;
  if not v_failed then raise exception 'S4 failed: GES H accepted'; end if;
  raise notice 'S4 OK — invalid GES rejected';

  -- S5: floor greater than building_floors rejected.
  v_failed := false;
  begin
    insert into public.subject_properties (agency_id, project_id, floor, building_floors)
    values (ag, proj, 6, 5);
  exception when check_violation then v_failed := true; end;
  if not v_failed then raise exception 'S5 failed: floor>building accepted'; end if;
  raise notice 'S5 OK — floor <= building_floors enforced';

  -- S6: negative monthly_charges rejected.
  v_failed := false;
  begin
    insert into public.subject_properties (agency_id, project_id, monthly_charges)
    values (ag, proj, -1);
  exception when check_violation then v_failed := true; end;
  if not v_failed then raise exception 'S6 failed: negative charges accepted'; end if;
  raise notice 'S6 OK — negative charges rejected';

  -- S7: construction_year out of the static bound rejected.
  v_failed := false;
  begin
    insert into public.subject_properties (agency_id, project_id, construction_year)
    values (ag, proj, 2200);
  exception when check_violation then v_failed := true; end;
  if not v_failed then raise exception 'S7 failed: year 2200 accepted'; end if;
  raise notice 'S7 OK — construction_year bound enforced';

  ----------------------------------------------------------------------------
  -- S8: a valid full row inserts; a second insert for the same project is
  -- rejected (UNIQUE(project_id)); the upsert keeps a single row.
  ----------------------------------------------------------------------------
  insert into public.subject_properties (
    agency_id, project_id, district, floor, building_floors, ges_rating, heating_type,
    exposure, construction_year, general_condition, outdoor_spaces, parking_types,
    monthly_charges, property_tax, strengths, watch_points
  ) values (
    ag, proj, 'Estagnol', 1, 3, 'C', 'individual_gas', 'south', 1985, 'good',
    array['balcony', 'garden'], array['garage'], 120, 1400, array['Calme'], array['Sans ascenseur']
  );

  v_failed := false;
  begin
    insert into public.subject_properties (agency_id, project_id)
    values (ag, proj);
  exception when unique_violation then v_failed := true; end;
  if not v_failed then raise exception 'S8 failed: UNIQUE(project_id) not enforced'; end if;

  insert into public.subject_properties (agency_id, project_id, monthly_charges)
  values (ag, proj, 200)
  on conflict (project_id) do update set monthly_charges = excluded.monthly_charges;
  select count(*), max(monthly_charges) into v_count, v_charges
  from public.subject_properties where project_id = proj;
  if v_count <> 1 or v_charges <> 200 then
    raise exception 'S8 failed: upsert created a duplicate or did not update (% rows, charges %)', v_count, v_charges;
  end if;
  raise notice 'S8 OK — valid insert, UNIQUE(project_id), upsert keeps a single row';

  ----------------------------------------------------------------------------
  -- S9: RLS read isolation — agency A reads its row, agency B reads nothing.
  ----------------------------------------------------------------------------
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  select count(*) into v_count from public.subject_properties;
  execute 'set local role postgres';
  if v_count <> 1 then raise exception 'S9a failed: agency A cannot read its property (%).', v_count; end if;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  select count(*) into v_count from public.subject_properties;
  execute 'set local role postgres';
  if v_count <> 0 then raise exception 'S9b failed: another agency can read the property (%).', v_count; end if;
  raise notice 'S9 OK — RLS read limited to the project agency';

  raise notice 'ALL SCENARIOS PASSED';
end $$;

rollback;
