-- Mission 37 — verifies the private bucket and the agency-scoped RLS policies on
-- storage.objects: a conseiller can read/write ONLY files under his own agency's
-- first path segment, never another agency's, run as the real `authenticated`
-- role. Deletion goes through the Storage API in the app (direct SQL deletes on
-- storage.objects are blocked by Supabase), so the DELETE policy is asserted
-- structurally rather than exercised here.
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/project_photos_storage.sql
-- One rolled-back transaction. Each assertion RAISEs on failure.

begin;

insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');
insert into public.agencies (id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Agency A'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Agency B');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000000', 'A', 'A', 'a@t.l', 'owner'),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-0000-0000-0000-000000000000', 'B', 'B', 'b@t.l', 'owner');

-- The bucket exists and is private.
do $$ begin
  if not exists (select 1 from storage.buckets where id = 'project-photos' and public = false) then
    raise exception 'FAIL: bucket project-photos missing or not private';
  end if;
end $$;

-- All four agency-scoped policies exist on storage.objects.
do $$
declare n int;
begin
  select count(*) into n from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname in (
        'project_photos_select_own_agency',
        'project_photos_insert_own_agency',
        'project_photos_update_own_agency',
        'project_photos_delete_own_agency'
      );
  if n <> 4 then raise exception 'FAIL: expected 4 project_photos policies, found %', n; end if;
end $$;

-- Seed one B object as the superuser (bypasses RLS) for the isolation test.
insert into storage.objects (bucket_id, name) values
  ('project-photos', 'bbbbbbbb-0000-0000-0000-000000000000/p/property/b1.jpg');

-- ===========================================================================
-- Act as the Agency A conseiller.
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- INSERT under own agency folder is allowed by RLS.
insert into storage.objects (bucket_id, name) values
  ('project-photos', 'aaaaaaaa-0000-0000-0000-000000000000/p/property/a1.jpg');

-- INSERT under ANOTHER agency's folder is denied by RLS.
do $$ begin
  begin
    insert into storage.objects (bucket_id, name) values
      ('project-photos', 'bbbbbbbb-0000-0000-0000-000000000000/p/property/x.jpg');
    raise exception 'FAIL: A inserted into B agency folder';
  exception when insufficient_privilege then
    null; -- expected: new row violates row-level security policy
  end;
end $$;

-- SELECT sees own agency objects, never another agency's.
do $$
declare own_count int; other_count int;
begin
  select count(*) into own_count from storage.objects
    where bucket_id = 'project-photos'
      and name like 'aaaaaaaa-0000-0000-0000-000000000000/%';
  select count(*) into other_count from storage.objects
    where bucket_id = 'project-photos'
      and name like 'bbbbbbbb-0000-0000-0000-000000000000/%';
  if own_count <> 1 then raise exception 'FAIL: A cannot see its own object (got %)', own_count; end if;
  if other_count <> 0 then raise exception 'FAIL: A can see B objects (got %)', other_count; end if;
end $$;

reset role;

do $$ begin raise notice 'ALL SCENARIOS PASSED'; end $$;

rollback;
