-- Verification of the Mission 18 security posture (CTO-hardened: no public RPC).
-- Run against the local stack:
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f - < supabase/tests/project_price_positioning.sql
--
-- Everything runs in one transaction and is ROLLED BACK at the end. Each assertion
-- RAISEs on failure; the final NOTICE is only reached if every scenario passed.

begin;

-- Two agencies, two users, one project + one positioning owned by agency A.
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

-- Seed one positioning for agency A (as the service role / owner would).
insert into public.project_price_positionings (
  project_id, agency_id, advisor_price, seller_price,
  range_low, range_central, range_high, confidence_score, confidence_level,
  calculation_snapshot, validated_by
) values (
  '33333333-3333-3333-3333-333333333333', 'aaaaaaaa-0000-0000-0000-000000000000',
  300000, null, 270000, 300000, 330000, 70, 'high', '{"engineVersion":1}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
);

do $$
declare
  user_a uuid := '11111111-1111-1111-1111-111111111111';
  proj uuid := '33333333-3333-3333-3333-333333333333';
  v_failed boolean;
  v_count integer;
begin
  ----------------------------------------------------------------------------
  -- S1: the save/delete RPCs no longer exist (no public write RPC at all).
  ----------------------------------------------------------------------------
  if exists (
    select 1 from pg_proc
    where proname in ('save_project_price_positioning', 'delete_project_price_positioning')
      and pronamespace = 'public'::regnamespace
  ) then
    raise exception 'S1 failed: a public save/delete RPC still exists';
  end if;
  raise notice 'S1 OK — no public save/delete RPC exists';

  ----------------------------------------------------------------------------
  -- S2: `authenticated` has no write privilege (insert/update/delete/truncate).
  ----------------------------------------------------------------------------
  if exists (
    select 1 from information_schema.role_table_grants
    where table_name = 'project_price_positionings'
      and grantee = 'authenticated'
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
  ) then
    raise exception 'S2 failed: authenticated still holds a write privilege';
  end if;
  raise notice 'S2 OK — authenticated has no insert/update/delete/truncate privilege';

  ----------------------------------------------------------------------------
  -- S3: a direct INSERT as `authenticated` is denied.
  ----------------------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', user_a::text, true);
  v_failed := false;
  begin
    execute 'set local role authenticated';
    begin
      execute format(
        'insert into public.project_price_positionings
           (project_id, agency_id, advisor_price, range_low, range_central, range_high,
            confidence_score, confidence_level, calculation_snapshot, validated_by)
         values (%L, %L, 1, 1, 1, 1, 10, ''low'', ''{}''::jsonb, %L)',
        proj, 'aaaaaaaa-0000-0000-0000-000000000000', user_a
      );
    exception when others then v_failed := true;
    end;
    execute 'set local role postgres';
  end;
  if not v_failed then raise exception 'S3 failed: a direct INSERT was allowed'; end if;
  raise notice 'S3 OK — direct INSERT denied';

  ----------------------------------------------------------------------------
  -- S4: a direct UPDATE as `authenticated` is denied.
  ----------------------------------------------------------------------------
  v_failed := false;
  begin
    execute 'set local role authenticated';
    begin
      execute format(
        'update public.project_price_positionings set advisor_price = 1 where project_id = %L',
        proj
      );
    exception when others then v_failed := true;
    end;
    execute 'set local role postgres';
  end;
  if not v_failed then raise exception 'S4 failed: a direct UPDATE was allowed'; end if;
  raise notice 'S4 OK — direct UPDATE denied';

  ----------------------------------------------------------------------------
  -- S5: a direct DELETE as `authenticated` is denied.
  ----------------------------------------------------------------------------
  v_failed := false;
  begin
    execute 'set local role authenticated';
    begin
      execute format(
        'delete from public.project_price_positionings where project_id = %L', proj
      );
    exception when others then v_failed := true;
    end;
    execute 'set local role postgres';
  end;
  if not v_failed then raise exception 'S5 failed: a direct DELETE was allowed'; end if;
  raise notice 'S5 OK — direct DELETE denied';

  ----------------------------------------------------------------------------
  -- S6: RLS SELECT is limited to the project's agency.
  ----------------------------------------------------------------------------
  -- Agency A sees its row.
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', user_a::text, true);
  select count(*) into v_count from public.project_price_positionings;
  execute 'set local role postgres';
  if v_count <> 1 then raise exception 'S6a failed: agency A cannot read its own row (%).', v_count; end if;

  -- Agency B (Bob) sees nothing.
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  select count(*) into v_count from public.project_price_positionings;
  execute 'set local role postgres';
  if v_count <> 0 then raise exception 'S6b failed: another agency can read the row (%).', v_count; end if;
  raise notice 'S6 OK — RLS read limited to the project agency';

  ----------------------------------------------------------------------------
  -- S7: UNIQUE(project_id) — a second insert for the same project is rejected,
  -- and the server-style UPSERT keeps a single row.
  ----------------------------------------------------------------------------
  v_failed := false;
  begin
    insert into public.project_price_positionings (
      project_id, agency_id, advisor_price, range_low, range_central, range_high,
      confidence_score, confidence_level, calculation_snapshot, validated_by
    ) values (
      proj, 'aaaaaaaa-0000-0000-0000-000000000000', 999999, 1, 1, 1, 10, 'low',
      '{}'::jsonb, user_a
    );
  exception when unique_violation then v_failed := true;
  end;
  if not v_failed then raise exception 'S7 failed: UNIQUE(project_id) not enforced'; end if;

  insert into public.project_price_positionings (
    project_id, agency_id, advisor_price, range_low, range_central, range_high,
    confidence_score, confidence_level, calculation_snapshot, validated_by
  ) values (
    proj, 'aaaaaaaa-0000-0000-0000-000000000000', 310000, 280000, 310000, 340000, 85, 'very_high',
    '{"engineVersion":1}'::jsonb, user_a
  )
  on conflict (project_id) do update set advisor_price = excluded.advisor_price;
  select count(*) into v_count from public.project_price_positionings where project_id = proj;
  if v_count <> 1 then raise exception 'S7 failed: UPSERT created a duplicate (% rows)', v_count; end if;
  raise notice 'S7 OK — UNIQUE(project_id) enforced, UPSERT keeps a single row';

  raise notice 'ALL SCENARIOS PASSED';
end $$;

rollback;
