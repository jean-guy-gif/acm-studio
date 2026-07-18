-- Verification of public.move_selected_comparable().
-- Run against the local stack:
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -f - < supabase/tests/move_selected_comparable.sql
--
-- Everything runs in one transaction and is ROLLED BACK at the end, so it leaves
-- no data behind. Each assertion RAISEs EXCEPTION on failure; the final NOTICE is
-- only reached if every scenario passed.

begin;

-- Simulate the authenticated advisor so auth.uid() resolves inside the RPC.
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);

-- profiles.id references auth.users(id); seed the auth user first.
insert into auth.users (id) values ('22222222-2222-2222-2222-222222222222');

insert into public.agencies (id, name)
values ('11111111-1111-1111-1111-111111111111', 'Agence Test');

insert into public.profiles (id, agency_id, first_name, last_name, email, role)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Test', 'Advisor', 'advisor@test.local', 'owner'
);

insert into public.projects (id, agency_id, advisor_id, seller_name, status)
values (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Vendeur Test', 'draft'
);

do $$
declare
  a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'; -- retained
  b uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'; -- rejected
  c uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc'; -- retained
  e uuid := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'; -- rejected
  proj uuid := '33333333-3333-3333-3333-333333333333';
  ag uuid := '11111111-1111-1111-1111-111111111111';
  o_a integer;
  o_b integer;
  o_c integer;
  o_e integer;
  dup integer;
begin
  ----------------------------------------------------------------------------
  -- Scenario 1: two adjacent retained (A=1, C=2). Move A down, then back up.
  ----------------------------------------------------------------------------
  delete from public.comparables where project_id = proj;
  insert into public.comparables (id, project_id, agency_id, price, display_order, is_selected) values
    (a, proj, ag, 100000, 1, true),
    (c, proj, ag, 200000, 2, true);

  perform public.move_selected_comparable(a, 'down');
  select display_order into o_a from public.comparables where id = a;
  select display_order into o_c from public.comparables where id = c;
  if not (o_a = 2 and o_c = 1) then
    raise exception 'S1 down failed: A=% C=% (expected A=2 C=1)', o_a, o_c;
  end if;

  perform public.move_selected_comparable(a, 'up');
  select display_order into o_a from public.comparables where id = a;
  select display_order into o_c from public.comparables where id = c;
  if not (o_a = 1 and o_c = 2) then
    raise exception 'S1 up failed: A=% C=% (expected A=1 C=2)', o_a, o_c;
  end if;
  raise notice 'S1 OK — two adjacent retained swap up/down';

  ----------------------------------------------------------------------------
  -- Scenario 2: one rejected between retained (A=1, B=2 rejected, C=3).
  -- Moving A down must swap A with C (the next RETAINED), skipping B.
  ----------------------------------------------------------------------------
  delete from public.comparables where project_id = proj;
  insert into public.comparables (id, project_id, agency_id, price, display_order, is_selected) values
    (a, proj, ag, 100000, 1, true),
    (b, proj, ag, 150000, 2, false),
    (c, proj, ag, 200000, 3, true);

  perform public.move_selected_comparable(a, 'down');
  select display_order into o_a from public.comparables where id = a;
  select display_order into o_b from public.comparables where id = b;
  select display_order into o_c from public.comparables where id = c;
  if not (o_a = 3 and o_c = 1 and o_b = 2) then
    raise exception 'S2 failed: A=% B=% C=% (expected A=3 B=2 C=1)', o_a, o_b, o_c;
  end if;
  raise notice 'S2 OK — rejected B ignored, A<->C swapped (A=%,C=%, B stays %)', o_a, o_c, o_b;

  ----------------------------------------------------------------------------
  -- Scenario 3: several rejected between retained (A=1, B=2 rej, E=3 rej, C=4).
  -- Move A down must swap A with C only.
  ----------------------------------------------------------------------------
  delete from public.comparables where project_id = proj;
  insert into public.comparables (id, project_id, agency_id, price, display_order, is_selected) values
    (a, proj, ag, 100000, 1, true),
    (b, proj, ag, 150000, 2, false),
    (e, proj, ag, 160000, 3, false),
    (c, proj, ag, 200000, 4, true);

  perform public.move_selected_comparable(a, 'down');
  select display_order into o_a from public.comparables where id = a;
  select display_order into o_b from public.comparables where id = b;
  select display_order into o_e from public.comparables where id = e;
  select display_order into o_c from public.comparables where id = c;
  if not (o_a = 4 and o_c = 1 and o_b = 2 and o_e = 3) then
    raise exception 'S3 failed: A=% B=% E=% C=%', o_a, o_b, o_e, o_c;
  end if;
  raise notice 'S3 OK — multiple rejected ignored, A<->C swapped';

  ----------------------------------------------------------------------------
  -- Scenario 4: first retained moved up is a no-op.
  ----------------------------------------------------------------------------
  delete from public.comparables where project_id = proj;
  insert into public.comparables (id, project_id, agency_id, price, display_order, is_selected) values
    (a, proj, ag, 100000, 1, true),
    (c, proj, ag, 200000, 2, true);

  perform public.move_selected_comparable(a, 'up');
  select display_order into o_a from public.comparables where id = a;
  select display_order into o_c from public.comparables where id = c;
  if not (o_a = 1 and o_c = 2) then
    raise exception 'S4 failed: first retained up changed order (A=% C=%)', o_a, o_c;
  end if;
  raise notice 'S4 OK — first retained up: no change';

  ----------------------------------------------------------------------------
  -- Scenario 5: last retained moved down is a no-op.
  ----------------------------------------------------------------------------
  perform public.move_selected_comparable(c, 'down');
  select display_order into o_a from public.comparables where id = a;
  select display_order into o_c from public.comparables where id = c;
  if not (o_a = 1 and o_c = 2) then
    raise exception 'S5 failed: last retained down changed order (A=% C=%)', o_a, o_c;
  end if;
  raise notice 'S5 OK — last retained down: no change';

  ----------------------------------------------------------------------------
  -- Scenario 6: passing a REJECTED comparable is a controlled no-op (no error).
  ----------------------------------------------------------------------------
  delete from public.comparables where project_id = proj;
  insert into public.comparables (id, project_id, agency_id, price, display_order, is_selected) values
    (a, proj, ag, 100000, 1, true),
    (b, proj, ag, 150000, 2, false),
    (c, proj, ag, 200000, 3, true);

  perform public.move_selected_comparable(b, 'up');
  perform public.move_selected_comparable(b, 'down');
  select display_order into o_a from public.comparables where id = a;
  select display_order into o_b from public.comparables where id = b;
  select display_order into o_c from public.comparables where id = c;
  if not (o_a = 1 and o_b = 2 and o_c = 3) then
    raise exception 'S6 failed: rejected target moved something (A=% B=% C=%)', o_a, o_b, o_c;
  end if;
  raise notice 'S6 OK — rejected target: controlled no-op';

  ----------------------------------------------------------------------------
  -- Scenario 7 + 8: persistence + two moves never create a duplicate order.
  ----------------------------------------------------------------------------
  delete from public.comparables where project_id = proj;
  insert into public.comparables (id, project_id, agency_id, price, display_order, is_selected) values
    (a, proj, ag, 100000, 1, true),
    (b, proj, ag, 150000, 2, false),
    (c, proj, ag, 200000, 3, true),
    (e, proj, ag, 210000, 4, true);

  -- Retained order: A(1), C(3), E(4). Move E up twice -> E should climb past C then A.
  perform public.move_selected_comparable(e, 'up'); -- E<->C
  perform public.move_selected_comparable(e, 'up'); -- E<->A
  select display_order into o_a from public.comparables where id = a;
  select display_order into o_c from public.comparables where id = c;
  select display_order into o_e from public.comparables where id = e;
  -- Expected retained order after two moves: E, A, C  (E=1, A=3, C=4), B stays 2.
  if not (o_e = 1 and o_a = 3 and o_c = 4) then
    raise exception 'S7 failed: persisted order wrong after two moves (A=% C=% E=%)', o_a, o_c, o_e;
  end if;

  select count(*) into dup from (
    select display_order from public.comparables
    where project_id = proj
    group by display_order having count(*) > 1
  ) d;
  if dup <> 0 then
    raise exception 'S8 failed: % duplicate display_order group(s) after two moves', dup;
  end if;
  raise notice 'S7/S8 OK — order persists, zero duplicate display_order after two moves';

  raise notice 'ALL SCENARIOS PASSED';
end $$;

rollback;
