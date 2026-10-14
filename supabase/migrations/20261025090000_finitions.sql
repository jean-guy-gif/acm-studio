-- Mission 105 — les finitions. Une seule migration, en sept parties :
--   1. le dernier résultat payé d'une recherche Stream Estate, gardé sur le dossier ;
--   2. une annonce n'existe qu'une fois par dossier ;
--   3. la cause « extension absente » d'un import en attente ;
--   4. la date de prochaine relance ;
--   5. l'annonce d'un concurrent retirée depuis le rendez-vous ;
--   6. la réservation du budget de recherche avant l'appel payant ;
--   7. un membre retiré n'a plus accès à rien (stockage, fonctions de déplacement) ;
--   8. la revérification des oppositions « commune non vérifiée ».
-- L'historique des prix existe déjà : les observations datées (M47, `listing_observations`).
--
-- Compatible avec le code de `main` : des tables, colonnes et fonctions qu'il ne lit ni n'écrit ;
-- une contrainte d'unicité qui ne refuse rien d'existant (0 doublon compté le 14/10) ; une liste
-- de causes élargie ; trois fonctions dont seul change le refus d'un membre retiré.

-- ---------------------------------------------------------------------------------------------
-- 1. Le dernier résultat payé, sur le dossier. Il se rouvre sur un autre appareil ou le lendemain
--    sans nouvel appel. L'empreinte (bien vendeur, fourchette, réglages) est calculée par le
--    serveur : un résultat dont l'empreinte ne correspond plus n'est jamais rendu.
-- ---------------------------------------------------------------------------------------------
create table public.stream_estate_results (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  project_id uuid not null unique references public.projects (id) on delete cascade,
  saved_by uuid references public.profiles (id) on delete set null,
  fingerprint text not null check (char_length(fingerprint) between 1 and 4000),
  result jsonb not null check (jsonb_typeof(result) = 'object' and pg_column_size(result) <= 2000000)
);

alter table public.stream_estate_results enable row level security;

create policy stream_estate_results_agency on public.stream_estate_results
  for all
  to authenticated
  using (agency_id = public.get_current_agency_id())
  with check (agency_id = public.get_current_agency_id());

-- ---------------------------------------------------------------------------------------------
-- 2. Une annonce, une fiche, par dossier : garanti en base. Un import répété rend la fiche
--    existante (le code relit la ligne sur un refus d'unicité).
-- ---------------------------------------------------------------------------------------------
do $$
declare v_duplicates integer;
begin
  select count(*) into v_duplicates
  from (
    select 1 from public.comparables
    where listing_url is not null and btrim(listing_url) <> ''
    group by project_id, listing_url
    having count(*) > 1
  ) d;
  if v_duplicates > 0 then
    raise exception 'comparables : % annonce(s) en double dans un dossier — à fusionner d''abord', v_duplicates;
  end if;
end $$;

create unique index comparables_one_listing_per_project
  on public.comparables (project_id, listing_url)
  where listing_url is not null and btrim(listing_url) <> '';

-- ---------------------------------------------------------------------------------------------
-- 3. L'extension absente ou désactivée est une cause à part (jamais « le site refuse »).
-- ---------------------------------------------------------------------------------------------
alter table public.pending_competitor_imports
  drop constraint pending_competitor_imports_last_cause_check;

alter table public.pending_competitor_imports
  add constraint pending_competitor_imports_last_cause_check check (
    last_cause is null or last_cause in (
      'robots', 'invalid', 'network', 'timeout', 'too_large', 'withdrawn', 'empty', 'server',
      'no_price', 'no_extension'
    )
  );

-- ---------------------------------------------------------------------------------------------
-- 4. La date de prochaine relance, posée avec chaque relance (modifiable à ce moment-là). Vide :
--    la règle des 7 jours (M96) vaut.
-- ---------------------------------------------------------------------------------------------
alter table public.follow_up_contacts
  add column next_follow_up_on date;

grant insert (next_follow_up_on) on public.follow_up_contacts to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 5. L'annonce d'un concurrent retirée depuis le rendez-vous, constatée sur preuve (M103) à la
--    relecture des prix. Le concurrent reste retenu : c'est un fait du Suivi.
-- ---------------------------------------------------------------------------------------------
alter table public.comparables
  add column listing_gone_at timestamptz;

-- ---------------------------------------------------------------------------------------------
-- 6. Le budget de recherche réservé AVANT l'appel payant. Une réservation est une ligne de
--    consommation marquée `reserved` : elle compte dans le mois comme une dépense. Le compteur
--    de l'agence est verrouillé le temps de la réservation (verrou de transaction par agence) :
--    deux recherches simultanées ne peuvent pas franchir le plafond. Après l'appel, la ligne
--    prend le nombre réellement facturé ; une recherche qui n'a rien facturé la rend.
--    Remplace M100 (« deux recherches au même instant peuvent dépasser de 0,60 € »).
-- ---------------------------------------------------------------------------------------------
alter table public.stream_estate_usage
  add column reserved boolean not null default false;

create function public.reserve_stream_estate_budget(
  p_agency_id uuid,
  p_project_id uuid,
  p_user_id uuid,
  p_wanted integer,
  p_since timestamptz,
  p_default_cap_cents integer
) returns table (reservation_id uuid, adverts integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cap integer;
  v_spent bigint;
  v_allowed integer;
  v_id uuid;
begin
  if p_wanted is null or p_wanted <= 0 then
    return;
  end if;
  -- Une réservation à la fois par agence.
  perform pg_advisory_xact_lock(hashtextextended('stream_estate_budget:' || p_agency_id::text, 0));

  select coalesce(
           (select b.monthly_cap_cents from public.agency_search_budgets b
             where b.agency_id = p_agency_id),
           p_default_cap_cents)
    into v_cap;
  select coalesce(sum(u.adverts), 0) into v_spent
    from public.stream_estate_usage u
    where u.agency_id = p_agency_id and u.created_at >= p_since;

  -- Une annonce = un centime.
  v_allowed := least(p_wanted, greatest(0, v_cap - v_spent))::integer;
  if v_allowed <= 0 then
    return;
  end if;
  insert into public.stream_estate_usage (agency_id, project_id, user_id, adverts, reserved)
  values (p_agency_id, p_project_id, p_user_id, v_allowed, true)
  returning id into v_id;
  reservation_id := v_id;
  adverts := v_allowed;
  return next;
end;
$$;

create function public.settle_stream_estate_budget(p_reservation_id uuid, p_billed integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_billed is null or p_billed <= 0 then
    delete from public.stream_estate_usage where id = p_reservation_id and reserved;
  else
    update public.stream_estate_usage
      set adverts = p_billed, reserved = false
      where id = p_reservation_id and reserved;
  end if;
end;
$$;

revoke all on function public.reserve_stream_estate_budget(uuid, uuid, uuid, integer, timestamptz, integer)
  from public, anon, authenticated;
revoke all on function public.settle_stream_estate_budget(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.reserve_stream_estate_budget(uuid, uuid, uuid, integer, timestamptz, integer)
  to service_role;
grant execute on function public.settle_stream_estate_budget(uuid, integer) to service_role;

-- ---------------------------------------------------------------------------------------------
-- 7. Un membre retiré n'a plus accès à rien. Les règles des tables passent déjà par
--    `get_current_agency_id()`, qui l'exclut (M88) ; trois fonctions ne le faisaient pas :
--    celle des photos du stockage, et les deux fonctions de déplacement des concurrents.
-- ---------------------------------------------------------------------------------------------
create or replace function public.current_agency_id_text()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select agency_id::text from public.profiles where id = auth.uid() and removed_at is null
$$;

CREATE OR REPLACE FUNCTION public.move_comparable(target_project_id uuid, target_comparable_id uuid, move_direction text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid;
  v_agency_id uuid;
  v_current_order integer;
  v_neighbor_id uuid;
  v_neighbor_order integer;
begin
  -- Identity from the JWT only.
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if move_direction not in ('up', 'down') then
    raise exception 'Invalid direction' using errcode = '22023';
  end if;

  -- Agency from the caller's profile; never trusted from the client.
  select agency_id into v_agency_id from public.profiles where id = v_uid and removed_at is null;
  if v_agency_id is null then
    return;
  end if;

  -- The project must belong to the caller's agency.
  perform 1 from public.projects
  where id = target_project_id and agency_id = v_agency_id;
  if not found then
    return;
  end if;

  -- Lock the current comparable (scoped by project + agency).
  select display_order into v_current_order
  from public.comparables
  where id = target_comparable_id
    and project_id = target_project_id
    and agency_id = v_agency_id
  for update;
  if not found then
    return;
  end if;

  -- Find and lock the neighbour in the requested direction.
  if move_direction = 'up' then
    select id, display_order into v_neighbor_id, v_neighbor_order
    from public.comparables
    where project_id = target_project_id
      and agency_id = v_agency_id
      and display_order < v_current_order
    order by display_order desc
    limit 1
    for update;
  else
    select id, display_order into v_neighbor_id, v_neighbor_order
    from public.comparables
    where project_id = target_project_id
      and agency_id = v_agency_id
      and display_order > v_current_order
    order by display_order asc
    limit 1
    for update;
  end if;

  -- Boundary: no neighbour -> nothing to do.
  if not found then
    return;
  end if;

  -- Swap the two display_order values in this single transaction.
  -- The deferred unique constraint is checked at commit, after the swap.
  update public.comparables
  set display_order = v_neighbor_order
  where id = target_comparable_id
    and project_id = target_project_id
    and agency_id = v_agency_id;

  update public.comparables
  set display_order = v_current_order
  where id = v_neighbor_id
    and project_id = target_project_id
    and agency_id = v_agency_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.move_selected_comparable(p_comparable_id uuid, p_direction text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid;
  v_agency_id uuid;
  v_project_id uuid;
  v_current_order integer;
  v_neighbor_id uuid;
  v_neighbor_order integer;
begin
  -- Identity from the JWT only.
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if p_direction not in ('up', 'down') then
    raise exception 'Invalid direction' using errcode = '22023';
  end if;

  -- Agency from the caller's profile; never trusted from the client.
  select agency_id into v_agency_id from public.profiles where id = v_uid and removed_at is null;
  if v_agency_id is null then
    return;
  end if;

  -- Lock the target. It must exist, belong to the caller's agency, AND be
  -- retained. A rejected or foreign/absent comparable is a controlled no-op.
  select project_id, display_order
    into v_project_id, v_current_order
  from public.comparables
  where id = p_comparable_id
    and agency_id = v_agency_id
    and is_selected = true
  for update;
  if not found then
    return;
  end if;

  -- Neighbour = nearest RETAINED comparable in the same project in that
  -- direction. Rejected comparables (is_selected = false) are ignored entirely,
  -- so they never intercalate between two retained ones.
  if p_direction = 'up' then
    select id, display_order into v_neighbor_id, v_neighbor_order
    from public.comparables
    where project_id = v_project_id
      and agency_id = v_agency_id
      and is_selected = true
      and display_order < v_current_order
    order by display_order desc
    limit 1
    for update;
  else
    select id, display_order into v_neighbor_id, v_neighbor_order
    from public.comparables
    where project_id = v_project_id
      and agency_id = v_agency_id
      and is_selected = true
      and display_order > v_current_order
    order by display_order asc
    limit 1
    for update;
  end if;

  -- Boundary: no retained neighbour -> nothing to do.
  if not found then
    return;
  end if;

  -- Swap the two display_order values in this single transaction. The DEFERRABLE
  -- INITIALLY DEFERRED unique constraint (project_id, display_order) tolerates
  -- the transient collision and is checked at commit. The two FOR UPDATE locks
  -- serialise concurrent moves on the same rows, so no duplicate can persist.
  update public.comparables
  set display_order = v_neighbor_order
  where id = p_comparable_id
    and agency_id = v_agency_id;

  update public.comparables
  set display_order = v_current_order
  where id = v_neighbor_id
    and agency_id = v_agency_id;
end;
$function$
;

-- ---------------------------------------------------------------------------------------------
-- 8. Les oppositions « commune non vérifiée » (M104), revérifiées chaque nuit par le serveur dès
--    que le service des communes répond. Pour cela, la commune TAPÉE est gardée — un nom de
--    commune, pas une adresse. Commune reconnue : le repère est retiré, la clé ne change pas.
--    Commune inconnue : le repère « commune inconnue » est posé, et le manager le voit. Une
--    opposition n'est jamais retirée ni affaiblie par cette vérification.
-- ---------------------------------------------------------------------------------------------
alter table public.prospecting_oppositions
  add column commune_typed text check (commune_typed is null or char_length(commune_typed) <= 120),
  add column commune_unknown boolean not null default false,
  add column commune_checked_at timestamptz;

grant insert (commune_typed) on public.prospecting_oppositions to authenticated;
