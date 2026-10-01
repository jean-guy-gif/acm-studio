-- Mission 60 §4 — nettoyage de l'enum des rôles : {owner, admin, advisor} → {manager, advisor}.
--
-- La mission 59 a LU la correspondance ({owner, admin} → manager) sans y toucher, en notant que
-- le jalon 2 devrait trancher au moment d'ÉCRIRE un rôle. C'est maintenant : on invite et on donne
-- le rôle, donc la base doit stocker exactement les deux concepts du produit. Une seule source,
-- comme la M55 avec les colonnes dormantes.
--
-- Migration sur des données réelles. Compte staging AVANT (dans le message de merge) : 1 owner,
-- 0 admin, 0 advisor → prédiction : 1 ligne owner → manager, le CHECK passe à {manager, advisor}.
--
-- Ordre obligatoire : on enlève D'ABORD l'ancienne contrainte (sinon écrire 'manager' violerait
-- le CHECK encore actif {owner, admin, advisor}), PUIS on réécrit les données, PUIS on pose la
-- nouvelle contrainte resserrée.
alter table public.profiles drop constraint profiles_role_check;

update public.profiles set role = 'manager', updated_at = now() where role in ('owner', 'admin');

alter table public.profiles
  add constraint profiles_role_check check (role in ('manager', 'advisor'));

-- Le bootstrap posait le PREMIER utilisateur en 'owner' — désormais 'manager' (créateur de
-- l'agence, manager d'office). Seul le corps change ; signature identique.
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
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

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

  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'Profile already exists for this user' using errcode = '23505';
  end if;

  select email into v_email from auth.users where id = v_uid;
  if v_email is null or btrim(v_email) = '' then
    raise exception 'No email available for the authenticated user' using errcode = '22023';
  end if;

  insert into public.agencies (name)
  values (v_agency_name)
  returning id into v_agency_id;

  insert into public.profiles (id, agency_id, first_name, last_name, email, role)
  values (v_uid, v_agency_id, v_first_name, v_last_name, v_email, 'manager');

  profile_id := v_uid;
  agency_id := v_agency_id;
  return next;
end;
$$;
