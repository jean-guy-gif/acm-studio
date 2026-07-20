-- Verification of the Mission 22 tables: CHECK constraints, UNIQUE, ON DELETE
-- CASCADE and — crucially — RLS that verifies the real ownership chain
-- (subject_property -> project -> agency), including direct cross-agency bypass
-- attempts run as the `authenticated` role.
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f - < supabase/tests/subject_property_diagnostics_and_condominium.sql
-- Runs in one rolled-back transaction. Each assertion RAISEs on failure.

begin;

insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');
insert into public.agencies (id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Agence A'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Agence B');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000000', 'Alice', 'A', 'a@t.local', 'owner'),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-0000-0000-0000-000000000000', 'Bob', 'B', 'b@t.local', 'owner');
-- Project + subject property for each agency.
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111', 'Vendeur A', 'draft'),
  ('55555555-5555-5555-5555-555555555555', 'bbbbbbbb-0000-0000-0000-000000000000',
   '22222222-2222-2222-2222-222222222222', 'Vendeur B', 'draft');
insert into public.subject_properties (id, agency_id, project_id) values
  ('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-0000-0000-0000-000000000000',
   '33333333-3333-3333-3333-333333333333'),
  ('66666666-6666-6666-6666-666666666666', 'bbbbbbbb-0000-0000-0000-000000000000',
   '55555555-5555-5555-5555-555555555555');
-- Seed one diagnostics + condominium row for agency B's property (as owner).
insert into public.subject_property_diagnostics (id, subject_property_id, agency_id, energy_consumption)
  values ('bbbbbbbb-dddd-dddd-dddd-dddddddddddd', '66666666-6666-6666-6666-666666666666',
          'bbbbbbbb-0000-0000-0000-000000000000', 100);
insert into public.subject_property_condominiums (id, subject_property_id, agency_id, is_condominium)
  values ('bbbbbbbb-cccc-cccc-cccc-cccccccccccc', '66666666-6666-6666-6666-666666666666',
          'bbbbbbbb-0000-0000-0000-000000000000', true);

do $$
declare
  ag_a uuid := 'aaaaaaaa-0000-0000-0000-000000000000';
  sp_a uuid := '44444444-4444-4444-4444-444444444444';
  sp_b uuid := '66666666-6666-6666-6666-666666666666';
  user_a uuid := '11111111-1111-1111-1111-111111111111';
  v_failed boolean;
  v_count integer;
  v_consumption integer;
begin
  ----------------------------------------------------------------------------
  -- CHECK constraints (as owner / postgres, RLS bypassed).
  ----------------------------------------------------------------------------
  v_failed := false;
  begin insert into public.subject_property_diagnostics (subject_property_id, agency_id, energy_consumption)
    values (sp_a, ag_a, 2001);
  exception when check_violation then v_failed := true; end;
  if not v_failed then raise exception 'D1 failed: energy 2001 accepted'; end if;

  v_failed := false;
  begin insert into public.subject_property_diagnostics (subject_property_id, agency_id, asbestos_status)
    values (sp_a, ag_a, 'maybe');
  exception when check_violation then v_failed := true; end;
  if not v_failed then raise exception 'D3 failed: invalid status accepted'; end if;

  v_failed := false;
  begin insert into public.subject_property_diagnostics
    (subject_property_id, agency_id, diagnostics_completed_at, diagnostics_valid_until)
    values (sp_a, ag_a, '2025-06-01', '2025-01-01');
  exception when check_violation then v_failed := true; end;
  if not v_failed then raise exception 'D4 failed: validity before completion accepted'; end if;

  v_failed := false;
  begin insert into public.subject_property_condominiums
    (subject_property_id, agency_id, is_condominium, total_lots, residential_lots)
    values (sp_a, ag_a, true, 5, 10);
  exception when check_violation then v_failed := true; end;
  if not v_failed then raise exception 'C1 failed: residential>total accepted'; end if;

  v_failed := false;
  begin insert into public.subject_property_condominiums
    (subject_property_id, agency_id, is_condominium, total_lots)
    values (sp_a, ag_a, false, 10);
  exception when check_violation then v_failed := true; end;
  if not v_failed then raise exception 'C3 failed: non-condominium with data accepted'; end if;

  v_failed := false;
  begin insert into public.subject_property_condominiums
    (subject_property_id, agency_id, is_condominium, ongoing_procedures, procedures_details)
    values (sp_a, ag_a, true, false, 'Litige');
  exception when check_violation then v_failed := true; end;
  if not v_failed then raise exception 'C4 failed: detail without boolean true accepted'; end if;
  raise notice 'CHK OK — diagnostics/condominium CHECK constraints enforced';

  ----------------------------------------------------------------------------
  -- Cross-agency bypass attempts as the `authenticated` role (agency A).
  ----------------------------------------------------------------------------
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', user_a::text, true);

  -- A1: agency A creates a diagnostic for its OWN property -> allowed.
  insert into public.subject_property_diagnostics (subject_property_id, agency_id, energy_consumption)
    values (sp_a, ag_a, 150);

  -- A2: agency A tries to create a diagnostic for agency B's property, sending
  -- its own agency_id -> denied by RLS (property not owned by A).
  v_failed := false;
  begin
    insert into public.subject_property_diagnostics (subject_property_id, agency_id, energy_consumption)
      values (sp_b, ag_a, 150);
  exception when others then v_failed := true; end;
  if not v_failed then raise exception 'A2 failed: A created a diagnostic on B''s property'; end if;

  -- A3: same attempt for condominium -> denied.
  v_failed := false;
  begin
    insert into public.subject_property_condominiums (subject_property_id, agency_id, is_condominium)
      values (sp_b, ag_a, true);
  exception when others then v_failed := true; end;
  if not v_failed then raise exception 'A3 failed: A created a condominium on B''s property'; end if;

  -- A4: A tries to insert on its OWN property but with B's agency_id -> denied
  -- (WITH CHECK pins agency_id to the caller's agency).
  v_failed := false;
  begin
    insert into public.subject_property_condominiums (subject_property_id, agency_id, is_condominium)
      values (sp_a, 'bbbbbbbb-0000-0000-0000-000000000000', true);
  exception when others then v_failed := true; end;
  if not v_failed then raise exception 'A4 failed: inconsistent agency_id accepted'; end if;

  -- A5: A tries to insert for a non-existent subject_property_id -> denied.
  v_failed := false;
  begin
    insert into public.subject_property_diagnostics (subject_property_id, agency_id)
      values ('99999999-9999-9999-9999-999999999999', ag_a);
  exception when others then v_failed := true; end;
  if not v_failed then raise exception 'A5 failed: unknown subject_property accepted'; end if;

  -- A6: A cannot UPDATE B's row (USING hides it -> 0 rows affected, value intact).
  update public.subject_property_diagnostics set energy_consumption = 999 where subject_property_id = sp_b;
  -- A7: A cannot DELETE B's row.
  delete from public.subject_property_diagnostics where subject_property_id = sp_b;
  -- A8: A cannot READ B's rows.
  select count(*) into v_count from public.subject_property_diagnostics where subject_property_id = sp_b;
  if v_count <> 0 then raise exception 'A8 failed: A can read B''s diagnostics (%).', v_count; end if;
  select count(*) into v_count from public.subject_property_condominiums where subject_property_id = sp_b;
  if v_count <> 0 then raise exception 'A8 failed: A can read B''s condominium (%).', v_count; end if;

  execute 'set local role postgres';

  -- Confirm B's row was neither updated nor deleted by agency A.
  select count(*), max(energy_consumption) into v_count, v_consumption
  from public.subject_property_diagnostics where subject_property_id = sp_b;
  if v_count <> 1 or v_consumption <> 100 then
    raise exception 'A6/A7 failed: B''s row was modified or deleted by A (count % value %)', v_count, v_consumption;
  end if;
  raise notice 'RLS OK — cross-agency create/update/delete/read all blocked; ownership verified via project';

  ----------------------------------------------------------------------------
  -- UNIQUE(subject_property_id) + ON DELETE CASCADE.
  ----------------------------------------------------------------------------
  v_failed := false;
  begin insert into public.subject_property_diagnostics (subject_property_id, agency_id) values (sp_a, ag_a);
  exception when unique_violation then v_failed := true; end;
  if not v_failed then raise exception 'U failed: UNIQUE(subject_property_id) not enforced'; end if;

  delete from public.subject_properties where id = sp_b;
  select count(*) into v_count from public.subject_property_diagnostics where subject_property_id = sp_b;
  if v_count <> 0 then raise exception 'CASCADE failed: diagnostics not deleted'; end if;
  select count(*) into v_count from public.subject_property_condominiums where subject_property_id = sp_b;
  if v_count <> 0 then raise exception 'CASCADE failed: condominium not deleted'; end if;
  raise notice 'INTEGRITY OK — UNIQUE enforced, ON DELETE CASCADE removes child rows';

  raise notice 'ALL SCENARIOS PASSED';
end $$;

rollback;
