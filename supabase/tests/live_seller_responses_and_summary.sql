-- Mission 24 verification: CHECK constraints, UNIQUE, ON DELETE CASCADE, and — the
-- core — RLS that verifies the real ownership chain (response/summary -> project ->
-- agency) AND that a referenced comparable belongs to the project, including direct
-- cross-agency / forged-id bypass attempts run as the `authenticated` role.
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/live_seller_responses_and_summary.sql
-- One rolled-back transaction. Each assertion RAISEs on failure.

begin;

insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');
insert into public.agencies (id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Agence A'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Agence B');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000000', 'Al', 'A', 'a@t.l', 'owner'),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-0000-0000-0000-000000000000', 'Bo', 'B', 'b@t.l', 'owner');
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111', 'Vendeur A', 'draft'),
  ('55555555-5555-5555-5555-555555555555', 'bbbbbbbb-0000-0000-0000-000000000000',
   '22222222-2222-2222-2222-222222222222', 'Vendeur B', 'draft');
insert into public.comparables
  (id, project_id, agency_id, title, price, surface_area, display_order, is_selected, photo_urls, listing_features)
values
  ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333',
   'aaaaaaaa-0000-0000-0000-000000000000', 'Comp A', 400000, 80, 1, true, '[]'::jsonb, '[]'::jsonb),
  ('66666666-6666-6666-6666-666666666666', '55555555-5555-5555-5555-555555555555',
   'bbbbbbbb-0000-0000-0000-000000000000', 'Comp B', 400000, 80, 1, true, '[]'::jsonb, '[]'::jsonb);
-- Seed a B response + B summary (as postgres) so A's read/update/delete denial is testable.
insert into public.live_seller_responses (id, project_id, comparable_id, agency_id, seller_serious_competitor)
  values ('bbbbbbbb-eeee-eeee-eeee-eeeeeeeeeeee', '55555555-5555-5555-5555-555555555555',
          '66666666-6666-6666-6666-666666666666', 'bbbbbbbb-0000-0000-0000-000000000000', 'yes');
insert into public.live_seller_summary (id, project_id, agency_id, seller_perceived_property_price)
  values ('bbbbbbbb-ffff-ffff-ffff-ffffffffffff', '55555555-5555-5555-5555-555555555555',
          'bbbbbbbb-0000-0000-0000-000000000000', 500000);

do $$
declare
  ag_a uuid := 'aaaaaaaa-0000-0000-0000-000000000000';
  ag_b uuid := 'bbbbbbbb-0000-0000-0000-000000000000';
  proj_a uuid := '33333333-3333-3333-3333-333333333333';
  proj_b uuid := '55555555-5555-5555-5555-555555555555';
  comp_a uuid := '44444444-4444-4444-4444-444444444444';
  comp_b uuid := '66666666-6666-6666-6666-666666666666';
  user_a uuid := '11111111-1111-1111-1111-111111111111';
  failed boolean;
  n int;
  v text;
begin
  ----------------------------------------------------------------------------
  -- CHECK constraints + UNIQUE (as postgres).
  ----------------------------------------------------------------------------
  failed := false;
  begin insert into public.live_seller_responses (project_id, comparable_id, agency_id, seller_serious_competitor)
    values (proj_a, comp_a, ag_a, 'maybe');
  exception when check_violation then failed := true; end;
  if not failed then raise exception 'CHK1: invalid serious_competitor accepted'; end if;

  failed := false;
  begin insert into public.live_seller_responses (project_id, comparable_id, agency_id, seller_estimated_listing_price)
    values (proj_a, comp_a, ag_a, -1);
  exception when check_violation then failed := true; end;
  if not failed then raise exception 'CHK2: negative estimate accepted'; end if;

  failed := false;
  begin insert into public.live_seller_responses (project_id, comparable_id, agency_id, seller_estimated_days_on_market)
    values (proj_a, comp_a, ag_a, -1);
  exception when check_violation then failed := true; end;
  if not failed then raise exception 'CHK2B: negative estimated duration accepted'; end if;

  failed := false;
  begin insert into public.live_seller_summary (project_id, agency_id, seller_most_dangerous_reason)
    values (proj_a, ag_a, 'because');
  exception when check_violation then failed := true; end;
  if not failed then raise exception 'CHK3: invalid dangerous reason accepted'; end if;

  insert into public.live_seller_responses (project_id, comparable_id, agency_id) values (proj_a, comp_a, ag_a);
  failed := false;
  begin insert into public.live_seller_responses (project_id, comparable_id, agency_id) values (proj_a, comp_a, ag_a);
  exception when unique_violation then failed := true; end;
  if not failed then raise exception 'UNIQ1: duplicate (project,comparable) accepted'; end if;

  insert into public.live_seller_summary (project_id, agency_id) values (proj_a, ag_a);
  failed := false;
  begin insert into public.live_seller_summary (project_id, agency_id) values (proj_a, ag_a);
  exception when unique_violation then failed := true; end;
  if not failed then raise exception 'UNIQ2: duplicate summary per project accepted'; end if;
  delete from public.live_seller_responses where project_id = proj_a;
  delete from public.live_seller_summary where project_id = proj_a;
  raise notice 'CHK/UNIQ OK';

  ----------------------------------------------------------------------------
  -- RLS as authenticated agency A.
  ----------------------------------------------------------------------------
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', user_a::text, true);

  -- A1: response for own project + own comparable -> allowed.
  insert into public.live_seller_responses (project_id, comparable_id, agency_id, seller_serious_competitor)
    values (proj_a, comp_a, ag_a, 'yes');

  -- A2: response on B's project (A's agency_id) -> denied.
  failed := false;
  begin insert into public.live_seller_responses (project_id, comparable_id, agency_id)
    values (proj_b, comp_b, ag_a);
  exception when others then failed := true; end;
  if not failed then raise exception 'A2: A wrote a response on B''s project'; end if;

  -- A3: comparable NOT in the project (comp_b under proj_a) -> denied.
  failed := false;
  begin insert into public.live_seller_responses (project_id, comparable_id, agency_id)
    values (proj_a, comp_b, ag_a);
  exception when others then failed := true; end;
  if not failed then raise exception 'A3: A attached a foreign comparable to its project'; end if;

  -- A4: own project + comparable but B's agency_id -> denied (WITH CHECK).
  failed := false;
  begin insert into public.live_seller_responses (project_id, comparable_id, agency_id)
    values (proj_a, comp_a, ag_b);
  exception when others then failed := true; end;
  if not failed then raise exception 'A4: inconsistent agency_id accepted'; end if;

  -- A5: non-existent project -> denied.
  failed := false;
  begin insert into public.live_seller_responses (project_id, comparable_id, agency_id)
    values ('99999999-9999-9999-9999-999999999999', comp_a, ag_a);
  exception when others then failed := true; end;
  if not failed then raise exception 'A5: unknown project accepted'; end if;

  -- A6: cannot read B's response / summary.
  select count(*) into n from public.live_seller_responses where project_id = proj_b;
  if n <> 0 then raise exception 'A6: A reads B''s responses (%).', n; end if;
  select count(*) into n from public.live_seller_summary where project_id = proj_b;
  if n <> 0 then raise exception 'A6: A reads B''s summary (%).', n; end if;

  -- A7: cannot update / delete B's response (USING hides it -> 0 rows).
  update public.live_seller_responses set seller_serious_competitor = 'no' where project_id = proj_b;
  delete from public.live_seller_responses where project_id = proj_b;

  -- A8: summary for own project OK; forged dangerous comparable (B's) -> denied.
  insert into public.live_seller_summary (project_id, agency_id, seller_perceived_property_price)
    values (proj_a, ag_a, 300000);
  failed := false;
  begin update public.live_seller_summary set seller_most_dangerous_comparable_id = comp_b where project_id = proj_a;
  exception when others then failed := true; end;
  if not failed then raise exception 'A8: forged dangerous comparable accepted'; end if;

  execute 'set local role postgres';

  -- Confirm B's seeded response + summary are intact.
  select seller_serious_competitor into v from public.live_seller_responses where project_id = proj_b;
  if v is distinct from 'yes' then raise exception 'A7: B response altered (%).', v; end if;
  select count(*) into n from public.live_seller_summary where project_id = proj_b;
  if n <> 1 then raise exception 'A7: B summary altered (%).', n; end if;
  raise notice 'RLS OK — cross-agency + comparable-in-project + forged-id all enforced';

  ----------------------------------------------------------------------------
  -- ON DELETE CASCADE (comparable -> response, then project -> summary).
  ----------------------------------------------------------------------------
  delete from public.comparables where id = comp_b; -- cascades B's response
  select count(*) into n from public.live_seller_responses where project_id = proj_b;
  if n <> 0 then raise exception 'CASCADE: responses not removed by comparable delete'; end if;

  delete from public.projects where id = proj_b; -- cascades B's summary
  select count(*) into n from public.live_seller_summary where project_id = proj_b;
  if n <> 0 then raise exception 'CASCADE: summary not removed by project delete'; end if;
  raise notice 'CASCADE OK';

  raise notice 'ALL SCENARIOS PASSED';
end $$;

rollback;
