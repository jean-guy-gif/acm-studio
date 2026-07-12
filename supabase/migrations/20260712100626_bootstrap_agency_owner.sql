-- ACM Studio — Bootstrap agency + owner profile
-- Adds ONLY a SECURITY DEFINER RPC. Does not alter the initial schema, tables,
-- policies, indexes or RLS. No new table. RLS stays enabled everywhere.

create or replace function public.bootstrap_agency_owner(
  agency_name text,
  first_name text,
  last_name text
)
returns table (profile_id uuid, agency_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_email text;
  v_agency_name text;
  v_first_name text;
  v_last_name text;
  v_agency_id uuid;
begin
  -- Identity comes exclusively from the JWT; never from a client argument.
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- Clean and validate the user-provided fields.
  v_agency_name := btrim(agency_name);
  v_first_name := btrim(first_name);
  v_last_name := btrim(last_name);

  if v_agency_name is null or v_agency_name = '' then
    raise exception 'Agency name is required' using errcode = '22023';
  end if;
  if v_first_name is null or v_first_name = '' then
    raise exception 'First name is required' using errcode = '22023';
  end if;
  if v_last_name is null or v_last_name = '' then
    raise exception 'Last name is required' using errcode = '22023';
  end if;

  -- Refuse an already-bootstrapped user (explicit, never a silent no-op).
  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'Profile already exists for this user' using errcode = '23505';
  end if;

  -- Email always comes from Supabase Auth, never from the arguments.
  select email into v_email from auth.users where id = v_uid;
  if v_email is null or btrim(v_email) = '' then
    raise exception 'No email available for the authenticated user' using errcode = '22023';
  end if;

  -- Agency then profile, in the single transaction of this function call.
  insert into public.agencies (name)
  values (v_agency_name)
  returning id into v_agency_id;

  insert into public.profiles (id, agency_id, first_name, last_name, email, role)
  values (v_uid, v_agency_id, v_first_name, v_last_name, v_email, 'owner');

  profile_id := v_uid;
  agency_id := v_agency_id;
  return next;
end;
$$;

-- Only authenticated users may execute the bootstrap. Not anon, not public.
revoke all on function public.bootstrap_agency_owner(text, text, text) from public;
revoke all on function public.bootstrap_agency_owner(text, text, text) from anon;
grant execute on function public.bootstrap_agency_owner(text, text, text) to authenticated;
