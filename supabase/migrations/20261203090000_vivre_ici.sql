-- Mission 142 — Vivre ici : ce qui entoure un bien qu'un acquéreur va visiter, lu dans des données
-- publiques et gratuites (OpenStreetMap, annuaire de l'Éducation nationale, itinéraires de l'IGN,
-- Géorisques), jamais par une IA (décisions de Jean-Guy, 07/11).
--
-- 1. `living_here_sheets` : la fiche d'un bien, une par bien et par agence (la clé de bien de la
--    boucle, M134 : `project:<id>`, `listing:<portail>:<numéro>`, `competitor:<id>`), partagée par
--    les acquéreurs de l'agence ; elle ne porte aucune donnée d'acquéreur. `origin` dit d'où partent
--    les distances : l'adresse d'un mandat signé de l'agence, sinon le quartier (la position de
--    l'annonce arrondie), sinon le centre de la commune — jamais l'adresse exacte d'un bien qui
--    n'est pas de l'agence (M119). `blocks` : par source, son état et ses données, relu par le
--    serveur (liste d'autorisation, M101). Lue par l'agence, écrite par le serveur seul, datée par
--    la base.
-- 2. `buyers.sector_priorities` : les ★ du secteur (calme, écoles, commerces à pied), à part des
--    critères d'un bien (`must_have`, M117) que les biens idéaux et la grille jugent ; et
--    `buyers.living_place`, « Un lieu qui compte pour vous » (son travail, l'école de ses enfants),
--    facultatif, 200 caractères.
-- 3. `buyer_visit_requests.scheduled_at` : le jour et l'heure de « Confirmer la visite » ; et
--    `living_place_trip`, le temps jusqu'au lieu de l'acquéreur, calculé une fois pour cette visite.
--
-- Compatible avec le code de `main` : une table qu'il ne connaît pas ; quatre colonnes nulles ou
-- vides par défaut, qu'il ne lit ni n'écrit ; aucune ligne existante modifiée.
-- Comptage sur la vraie base avant (07/11, lecture seule) : la table n'existe pas ; 49 tables
-- publiques, 54 politiques, 58 fonctions, 32 déclencheurs, 159 index ; 11 acquéreurs (36 colonnes),
-- 2 demandes de visite (16 colonnes).
-- Prédiction : 50 tables (la nouvelle, vide, 8 colonnes, 1 politique), 55 politiques, 59 fonctions,
-- 33 déclencheurs, 161 index (clé primaire et unicité agence + bien) ; 11 acquéreurs (38 colonnes,
-- 23 → 25 CHECK, ★ du secteur vides, aucun lieu), 2 visites (18 colonnes, 11 → 12 CHECK, sans jour
-- ni trajet) ; 4 agences et 22 dossiers inchangés ; aucune ligne modifiée.
--
-- Une fiche n'a pas de lien en base vers son dossier ou son concurrent (sa clé est un texte) : elle
-- ne porte que des données publiques et aucune donnée d'acquéreur ; un effacement réel l'efface par
-- sa clé (`docs/PROCEDURE_EFFACEMENT.md`), la suppression d'un concurrent et la remise à zéro de la
-- démo aussi.

create table public.living_here_sheets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  -- La clé de bien de la boucle (M134), de forme fermée.
  property_key text not null
    check (length(property_key) between 3 and 2100
           and property_key ~ '^(project:[0-9a-f-]{36}|competitor:[0-9a-f-]{36}|listing:[^:]+:.+)$'),
  origin text not null check (origin in ('address', 'district', 'commune')),
  built_by uuid references public.profiles (id) on delete set null,
  -- Posé par la base à chaque construction ou actualisation, jamais par le code.
  built_at timestamptz not null default now(),
  blocks jsonb not null default '{}'::jsonb
    check (jsonb_typeof(blocks) = 'object' and pg_column_size(blocks) <= 131072),
  unique (agency_id, property_key)
);

comment on table public.living_here_sheets is
  'Mission 142 — « Vivre ici » d''un bien visité : données publiques autour du point de départ (adresse d''un mandat signé, sinon quartier arrondi, sinon centre de la commune) ; lue par l''agence, écrite par le serveur seul.';

alter table public.living_here_sheets enable row level security;

create policy living_here_sheets_agency_read on public.living_here_sheets
  for select
  to authenticated
  using (agency_id = public.get_current_agency_id());

revoke all on public.living_here_sheets from anon, authenticated;
grant select on public.living_here_sheets to authenticated;

-- Une clé `project:` ou `competitor:` désigne un dossier ou un concurrent de cette agence : la base
-- le vérifie, quel que soit le chemin (M108, M111) ; et la date est celle de la base.
create function public.date_living_here_sheet() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.property_key is distinct from old.property_key
     or new.agency_id is distinct from old.agency_id then
    if new.property_key like 'project:%' and not exists (
      select 1 from public.projects p
       where p.id = substr(new.property_key, 9)::uuid and p.agency_id = new.agency_id
    ) then
      raise exception 'living_here_sheets: le dossier n''est pas à cette agence';
    end if;
    if new.property_key like 'competitor:%' and not exists (
      select 1 from public.comparables c
       where c.id = substr(new.property_key, 12)::uuid and c.agency_id = new.agency_id
    ) then
      raise exception 'living_here_sheets: le concurrent n''est pas à cette agence';
    end if;
  end if;
  new.built_at := now();
  new.updated_at := now();
  return new;
end;
$$;

create trigger living_here_sheets_dated
  before insert or update on public.living_here_sheets
  for each row execute function public.date_living_here_sheet();

revoke all on function public.date_living_here_sheet() from public, anon, authenticated;

alter table public.buyers
  add column sector_priorities text[] not null default '{}'
    check (sector_priorities <@ array['quiet', 'schools', 'shops_on_foot']::text[]),
  add column living_place text
    check (living_place is null or char_length(btrim(living_place)) between 1 and 200);

comment on column public.buyers.sector_priorities is
  'Mission 142 — les ★ du secteur (calme, écoles, commerces à pied), jugées par « Vivre ici » seulement.';
comment on column public.buyers.living_place is
  'Mission 142 — « Un lieu qui compte pour vous » (travail, école des enfants), facultatif ; donnée personnelle.';

alter table public.buyer_visit_requests
  add column scheduled_at timestamptz,
  add column living_place_trip jsonb
    check (living_place_trip is null
           or (jsonb_typeof(living_place_trip) = 'object' and pg_column_size(living_place_trip) <= 2048));

comment on column public.buyer_visit_requests.scheduled_at is
  'Mission 142 — le jour et l''heure de la visite, posés par « Confirmer la visite ».';
comment on column public.buyer_visit_requests.living_place_trip is
  'Mission 142 — le temps jusqu''au lieu de l''acquéreur, calculé une fois pour cette visite (relu par le serveur).';
