-- Mission 39 — verifies the two "Votre bien" columns added to live_seller_summary:
-- seller_property_confirmed is constrained to yes/no, seller_property_comment to
-- 2000 characters. Additive columns; a null answer stays valid.
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/live_seller_property_confirmation.sql
-- One rolled-back transaction. Each assertion RAISEs on failure.

begin;

insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111');
insert into public.agencies (id, name) values ('aaaaaaaa-0000-0000-0000-000000000000', 'A');
insert into public.profiles (id, agency_id, first_name, last_name, email, role)
  values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000000',
          'Al', 'A', 'a@t.l', 'owner');
insert into public.projects (id, agency_id, advisor_id, seller_name, status)
  values ('bbbbbbbb-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000',
          '11111111-1111-1111-1111-111111111111', 'Test', 'preparation');

-- A valid answer with a comment is accepted.
insert into public.live_seller_summary
  (project_id, agency_id, seller_property_confirmed, seller_property_comment)
  values ('bbbbbbbb-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000',
          'yes', 'Le vendeur reconnaît son bien.');

-- An out-of-domain confirmation is rejected by the CHECK.
do $$ begin
  begin
    update public.live_seller_summary set seller_property_confirmed = 'maybe'
      where project_id = 'bbbbbbbb-0000-0000-0000-000000000000';
    raise exception 'FAIL: invalid seller_property_confirmed accepted';
  exception when check_violation then null;
  end;
end $$;

-- A comment above 2000 characters is rejected by the CHECK.
do $$ begin
  begin
    update public.live_seller_summary set seller_property_comment = repeat('x', 2001)
      where project_id = 'bbbbbbbb-0000-0000-0000-000000000000';
    raise exception 'FAIL: overlong seller_property_comment accepted';
  exception when check_violation then null;
  end;
end $$;

-- 'no' is accepted; a null answer is also valid.
update public.live_seller_summary set seller_property_confirmed = 'no'
  where project_id = 'bbbbbbbb-0000-0000-0000-000000000000';
update public.live_seller_summary set seller_property_confirmed = null, seller_property_comment = null
  where project_id = 'bbbbbbbb-0000-0000-0000-000000000000';

do $$ begin raise notice 'ALL SCENARIOS PASSED'; end $$;

rollback;
