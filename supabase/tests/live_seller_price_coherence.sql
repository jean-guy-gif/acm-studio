-- Mission 41 — verifies the two "Ce prix vous paraît-il cohérent ?" columns added
-- to live_seller_responses: seller_price_coherence is constrained to
-- coherent/too_high/too_low/unsure, seller_price_coherence_comment to 2000 chars.
-- Additive columns; a null reaction stays valid.
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/live_seller_price_coherence.sql
-- One rolled-back transaction. Each assertion RAISEs on failure.

begin;

insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111');
insert into public.agencies (id, name) values ('aaaaaaaa-0000-0000-0000-000000000000', 'A');
insert into public.profiles (id, agency_id, first_name, last_name, email, role)
  values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000000',
          'Al', 'A', 'a@t.l', 'owner');
insert into public.projects (id, agency_id, advisor_id, seller_name, status)
  values ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-0000-0000-0000-000000000000',
          '11111111-1111-1111-1111-111111111111', 'Test', 'preparation');
insert into public.comparables
  (id, project_id, agency_id, price, surface_area, display_order, is_selected, photo_urls, listing_features)
  values ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333',
          'aaaaaaaa-0000-0000-0000-000000000000', 400000, 80, 1, true, '[]'::jsonb, '[]'::jsonb);

-- A valid reaction with a comment is accepted.
insert into public.live_seller_responses
  (id, project_id, comparable_id, agency_id, seller_price_coherence, seller_price_coherence_comment)
  values ('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333',
          '44444444-4444-4444-4444-444444444444', 'aaaaaaaa-0000-0000-0000-000000000000',
          'too_high', 'Le vendeur trouve le prix affiché trop élevé.');

-- An out-of-domain reaction is rejected by the CHECK.
do $$ begin
  begin
    update public.live_seller_responses set seller_price_coherence = 'maybe'
      where id = '55555555-5555-5555-5555-555555555555';
    raise exception 'FAIL: invalid seller_price_coherence accepted';
  exception when check_violation then null;
  end;
end $$;

-- A comment above 2000 characters is rejected by the CHECK.
do $$ begin
  begin
    update public.live_seller_responses set seller_price_coherence_comment = repeat('x', 2001)
      where id = '55555555-5555-5555-5555-555555555555';
    raise exception 'FAIL: overlong seller_price_coherence_comment accepted';
  exception when check_violation then null;
  end;
end $$;

-- Every in-domain value is accepted; a null reaction is also valid.
update public.live_seller_responses set seller_price_coherence = 'coherent'
  where id = '55555555-5555-5555-5555-555555555555';
update public.live_seller_responses set seller_price_coherence = 'too_low'
  where id = '55555555-5555-5555-5555-555555555555';
update public.live_seller_responses set seller_price_coherence = 'unsure'
  where id = '55555555-5555-5555-5555-555555555555';
update public.live_seller_responses
  set seller_price_coherence = null, seller_price_coherence_comment = null
  where id = '55555555-5555-5555-5555-555555555555';

do $$ begin raise notice 'ALL SCENARIOS PASSED'; end $$;

rollback;
