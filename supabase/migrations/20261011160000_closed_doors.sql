-- Mission 88 — Les portes fermées avant la bêta.
--
-- L'isolation ENTRE agences est saine et n'est pas touchée. On restreint ce qui se fait À
-- L'INTÉRIEUR d'une agence, depuis le navigateur (clé publique + jeton d'un membre) :
--   1. profiles : `profiles_agency_isolation` était FOR ALL et ne regardait que l'agence — un
--      conseiller pouvait écrire `role`, `removed_at`, `email`… de son profil ou de celui d'un
--      collègue, et `requireManagerProfile` faisait ensuite confiance à ce rôle ;
--   2. agencies : tout membre pouvait modifier la ligne de son agence (nom, seuils) ;
--   3. bootstrap_agency_owner : un invité pouvait créer sa propre agence au lieu de rejoindre
--      celle qui l'invite, et son invitation devenait inutilisable.
--
-- Les actions serveur de gestion d'équipe passent par la clé service, après le garde de rôle :
-- elles ne sont pas concernées. bootstrap_agency_owner et accept_invitation sont SECURITY
-- DEFINER : elles créent toujours les profils.
--
-- Compatible avec le code de `main` : il ne modifie un profil depuis le navigateur que par
-- « Mon profil » (téléphone, photo, updated_at) et l'agence que par un manager (seuils).
-- Aucune ligne n'est écrite.

-- ---------------------------------------------------------------------------------------------
-- Le rôle de l'appelant, lu en base à chaque fois. SECURITY DEFINER : pas de récursion sur les
-- politiques de profiles. Un profil retiré n'est manager de rien.
-- ---------------------------------------------------------------------------------------------
create function public.is_current_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and removed_at is null and role = 'manager'
  )
$$;

revoke all on function public.is_current_manager() from public, anon;
grant execute on function public.is_current_manager() to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 1. profiles — la lecture reste la même (chacun lit les profils de son agence, et un membre
--    retiré lit encore le sien par `profiles_self_read`). L'écriture se réduit à SA ligne, et
--    aux seules colonnes de « Mon profil ».
-- ---------------------------------------------------------------------------------------------
drop policy profiles_agency_isolation on public.profiles;

create policy profiles_agency_read on public.profiles
  for select
  to authenticated
  using (agency_id = public.get_current_agency_id());

-- Sa propre ligne, tant qu'on n'est pas retiré (get_current_agency_id ignore un profil retiré).
create policy profiles_self_update on public.profiles
  for update
  to authenticated
  using (id = auth.uid() and agency_id = public.get_current_agency_id())
  with check (id = auth.uid() and agency_id = public.get_current_agency_id());

-- Une politique ne choisit pas les colonnes : ce sont les privilèges qui le font. On retire la
-- modification de la table entière, puis on la rend colonne par colonne. `role`, `agency_id`,
-- `removed_at`, `email` et `id` ne sont plus modifiables depuis le navigateur, manager compris.
-- Une colonne ajoutée plus tard n'est pas modifiable tant qu'on ne l'a pas décidé ici.
revoke insert, update, delete, truncate, references, trigger on public.profiles from authenticated;
revoke all on public.profiles from anon;
grant update (first_name, last_name, phone, photo_path, updated_at)
  on public.profiles to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 2. agencies — lecture inchangée ; modification par un manager non retiré de CETTE agence.
--    Ni création ni suppression depuis le navigateur (la création passe par le bootstrap).
-- ---------------------------------------------------------------------------------------------
drop policy agencies_agency_isolation on public.agencies;

create policy agencies_agency_read on public.agencies
  for select
  to authenticated
  using (id = public.get_current_agency_id());

create policy agencies_manager_update on public.agencies
  for update
  to authenticated
  using (id = public.get_current_agency_id() and public.is_current_manager())
  with check (id = public.get_current_agency_id() and public.is_current_manager());

revoke insert, delete, truncate, references, trigger on public.agencies from authenticated;
revoke all on public.agencies from anon;

-- ---------------------------------------------------------------------------------------------
-- 3. Invitations — une personne invitée rejoint l'agence qui l'invite, elle n'en crée pas une.
--    Une invitation « attend » tant qu'elle n'est pas acceptée ; annulée, elle est supprimée ;
--    il n'existe pas de date d'expiration.
-- ---------------------------------------------------------------------------------------------

-- L'appelant a-t-il une invitation en attente à son adresse ? L'invité n'a pas encore de profil,
-- donc aucun accès aux invitations par les politiques : SECURITY DEFINER, et la réponse ne dit
-- rien d'autre que oui ou non, pour SON adresse (lue dans auth.users, jamais reçue).
create function public.has_pending_invitation()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.agency_invitations i
    join auth.users u on lower(u.email) = lower(i.email)
    where u.id = auth.uid() and i.accepted_at is null
  )
$$;

revoke all on function public.has_pending_invitation() from public, anon;
grant execute on function public.has_pending_invitation() to authenticated;

-- Signature inchangée (CREATE OR REPLACE, privilèges préservés) : seul le corps gagne le refus.
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

  -- Mission 88 — une invitation attend cette adresse : pas d'agence fantôme. Code d'erreur
  -- propre (ACM01), que l'écran reconnaît pour renvoyer vers l'acceptation.
  if exists (
    select 1 from public.agency_invitations i
    where lower(i.email) = lower(v_email) and i.accepted_at is null
  ) then
    raise exception 'A pending invitation exists for this address' using errcode = 'ACM01';
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
