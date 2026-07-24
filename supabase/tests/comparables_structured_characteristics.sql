-- Mission 24 — verifies the comparables enrichment: the four structured columns
-- exist with the exact types + defaults, the CHECK constraints hold, existing rows
-- keep sane values, and the comparables RLS policy is unchanged (still exactly one).
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/comparables_structured_characteristics.sql

begin;

insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111');
insert into public.agencies (id, name) values ('aaaaaaaa-0000-0000-0000-000000000000', 'A');
insert into public.profiles (id, agency_id, first_name, last_name, email, role)
  values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000000', 'Al', 'A', 'a@t.l', 'owner');
insert into public.projects (id, agency_id, advisor_id, seller_name, status)
  values ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-0000-0000-0000-000000000000',
          '11111111-1111-1111-1111-111111111111', 'V', 'draft');

do $$
declare
  ag uuid := 'aaaaaaaa-0000-0000-0000-000000000000';
  pr uuid := '33333333-3333-3333-3333-333333333333';
  t text;
  d text;
  arr text[];
  cond text;
  n int;
  failed boolean;
begin
  -- Columns exist with the exact types.
  select data_type into t from information_schema.columns
    where table_name = 'comparables' and column_name = 'general_condition';
  if t is distinct from 'text' then raise exception 'general_condition type = %', t; end if;
  select data_type into t from information_schema.columns
    where table_name = 'comparables' and column_name = 'exposure';
  if t is distinct from 'text' then raise exception 'exposure type = %', t; end if;
  select data_type into t from information_schema.columns
    where table_name = 'comparables' and column_name = 'outdoor_spaces';
  if t is distinct from 'ARRAY' then raise exception 'outdoor_spaces type = %', t; end if;
  select data_type into t from information_schema.columns
    where table_name = 'comparables' and column_name = 'parking_types';
  if t is distinct from 'ARRAY' then raise exception 'parking_types type = %', t; end if;

  -- Defaults: existing/new rows without the fields get '{}' arrays and null scalars.
  insert into public.comparables (id, project_id, agency_id, price, display_order, is_selected, photo_urls, listing_features)
    values ('44444444-4444-4444-4444-444444444444', pr, ag, 400000, 1, true, '[]'::jsonb, '[]'::jsonb);
  select general_condition, exposure, outdoor_spaces, parking_types
    into cond, d, arr, arr from public.comparables where id = '44444444-4444-4444-4444-444444444444';
  select outdoor_spaces into arr from public.comparables where id = '44444444-4444-4444-4444-444444444444';
  if cond is not null or d is not null then raise exception 'scalars not null by default'; end if;
  if arr is distinct from '{}'::text[] then raise exception 'outdoor default not {} (%).', arr; end if;
  select parking_types into arr from public.comparables where id = '44444444-4444-4444-4444-444444444444';
  if arr is distinct from '{}'::text[] then raise exception 'parking default not {} (%).', arr; end if;

  -- CHECK constraints.
  failed := false;
  begin update public.comparables set general_condition = 'ruined' where id = '44444444-4444-4444-4444-444444444444';
  exception when check_violation then failed := true; end;
  if not failed then raise exception 'invalid general_condition accepted'; end if;

  failed := false;
  begin update public.comparables set exposure = 'up' where id = '44444444-4444-4444-4444-444444444444';
  exception when check_violation then failed := true; end;
  if not failed then raise exception 'invalid exposure accepted'; end if;

  failed := false;
  begin update public.comparables set outdoor_spaces = ARRAY['balcony', 'unknown_value']::text[]
    where id = '44444444-4444-4444-4444-444444444444';
  exception when check_violation then failed := true; end;
  if not failed then raise exception 'invalid outdoor value accepted'; end if;

  failed := false;
  begin update public.comparables set parking_types = ARRAY['none', 'garage']::text[]
    where id = '44444444-4444-4444-4444-444444444444';
  exception when check_violation then failed := true; end;
  if not failed then raise exception 'none + other parking accepted'; end if;

  -- Valid values are accepted.
  update public.comparables
    set general_condition = 'good', exposure = 'south',
        outdoor_spaces = ARRAY['balcony', 'terrace']::text[], parking_types = ARRAY['garage']::text[]
    where id = '44444444-4444-4444-4444-444444444444';

  -- RLS unchanged: comparables still carries exactly one (its original) policy.
  select count(*) into n from pg_policies where schemaname = 'public' and tablename = 'comparables';
  if n <> 1 then raise exception 'comparables RLS policy count changed (%).', n; end if;

  raise notice 'ALL SCENARIOS PASSED';
end $$;

rollback;
