-- Mission 47 — verifies listing_observations: the per-day dedup UNIQUE, the price
-- CHECK, and the agency-scoped RLS (a conseiller sees and writes ONLY his agency's
-- observations), run as the real `authenticated` role.
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/listing_observations.sql
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

do $$
declare
  ag_a uuid := 'aaaaaaaa-0000-0000-0000-000000000000';
  ag_b uuid := 'bbbbbbbb-0000-0000-0000-000000000000';
  failed boolean;
begin
  -- A valid observation is accepted (as postgres, RLS bypassed).
  insert into public.listing_observations
    (agency_id, portal, listing_key, canonical_url, price, observed_on)
    values (ag_a, 'seloger', '26ZEJMLWB13Y', 'https://www.seloger.com/annonces/.../26ZEJMLWB13Y', 335000, '2026-09-10');

  -- DEDUP : same (agency, portal, listing_key, day) is rejected by the UNIQUE.
  failed := false;
  begin
    insert into public.listing_observations
      (agency_id, portal, listing_key, canonical_url, price, observed_on)
      values (ag_a, 'seloger', '26ZEJMLWB13Y', 'https://x', 349000, '2026-09-10');
  exception when unique_violation then failed := true; end;
  if not failed then raise exception 'DEDUP: a second same-day observation was accepted'; end if;

  -- A different DAY is a new observation (this is how a price drop becomes visible).
  insert into public.listing_observations
    (agency_id, portal, listing_key, canonical_url, price, observed_on)
    values (ag_a, 'seloger', '26ZEJMLWB13Y', 'https://x', 349000, '2026-08-12');

  -- CHECK : a negative price is rejected.
  failed := false;
  begin
    insert into public.listing_observations
      (agency_id, portal, listing_key, canonical_url, price)
      values (ag_a, 'bienici', 'apimo-1', 'https://x', -1);
  exception when check_violation then failed := true; end;
  if not failed then raise exception 'CHECK: a negative price was accepted'; end if;

  -- Seed a B observation (as postgres) for the RLS isolation test below.
  insert into public.listing_observations
    (agency_id, portal, listing_key, canonical_url, price, observed_on)
    values (ag_b, 'greenacres', 'Al6sdpuxlkaknl9r', 'https://x', 275000, '2026-09-10');
end $$;

-- ===========================================================================
-- RLS as the Agency A conseiller.
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

do $$
declare
  n int;
  failed boolean := false;
begin
  -- A sees its own observations…
  select count(*) into n from public.listing_observations where portal = 'seloger';
  if n < 1 then raise exception 'RLS: agency A cannot see its own observations'; end if;
  -- …but NOT agency B's.
  select count(*) into n from public.listing_observations where agency_id = 'bbbbbbbb-0000-0000-0000-000000000000';
  if n <> 0 then raise exception 'RLS: agency A can see agency B observations'; end if;

  -- A cannot write an observation for agency B (WITH CHECK).
  begin
    insert into public.listing_observations (agency_id, portal, listing_key, canonical_url, price)
      values ('bbbbbbbb-0000-0000-0000-000000000000', 'seloger', 'X', 'https://x', 100000);
  exception when insufficient_privilege then failed := true; end;
  if not failed then raise exception 'RLS: agency A wrote an observation for agency B'; end if;
end $$;

do $$ begin raise notice 'ALL SCENARIOS PASSED'; end $$;

rollback;
