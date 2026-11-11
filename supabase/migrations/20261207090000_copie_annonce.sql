-- Mission 152 (partie A) — Prouver : la copie de l'annonce, et la date de la dernière vérification.
--
-- Au Live, « Voir l'annonce » ouvre l'annonce sur son portail ; quand elle n'y est plus, le
-- conseiller montre la copie qu'ACM en a gardée. Aujourd'hui, le prix relevé est daté et immuable
-- (`listing_observations`, M47), mais les photos et les caractéristiques d'un concurrent se
-- modifient à la main (« Modifier la fiche »), sans historique : il n'y a pas de copie (mesure du
-- 11/11).
--
--   `competitor_listing_copies` : l'annonce telle qu'ACM l'a lue, UNE fois, à la création du
--   concurrent, pour PROUVER LE PRIX et rien d'autre (Jean-Guy, 11/11) — sa source (`page` : la page
--   lue par l'extension ; `search` : la carte de la recherche, M101), sa date, le portail et
--   l'identité de l'annonce (M47), le prix, les adresses des photos (jamais copiées, M58) et les
--   caractéristiques (une liste d'autorisation, relue au serveur à l'écriture et à la lecture : ni
--   titre, ni adresse, ni lien, ni « Vendu par », ni exclusivité, M83, M107). JAMAIS le texte de
--   l'annonce, qui cite parfois l'adresse du propriétaire : aucune adresse n'est stockée ici, et
--   `/confidentialite` ne change pas. Une par concurrent ; jamais modifiée, clé de service
--   comprise ; partie avec son concurrent (cascade). Lue par les membres non retirés de l'agence ;
--   écrite par le serveur seul ; le concurrent, de ce dossier et de cette agence, vérifié par la
--   base.
--
--   Conservation (M102) : la copie suit la purge à 3 ans du reste du dossier — chaque nuit, la base
--   efface la copie d'un concurrent quand rien ne s'est passé depuis 3 ans (la copie elle-même,
--   l'adresse connue ou corrigée, le dossier remis, le rendez-vous, le mandat, le refus, la
--   collaboration obtenue ou refusée).
--
--   `projects.listings_checked_at` : la dernière fois que le conseiller a vérifié les annonces de
--   ses concurrents avant le rendez-vous (« Depuis la préparation ») ; un rappel, rien de plus.
--   Comme `language` (M140 A), le navigateur peut l'écrire dans son agence (`projects` est accordé
--   à la table entière, M147 A) ; l'heure est celle de la base.
--
-- Compatible avec le code de `main` : une table neuve qu'il ne connaît pas et une colonne nulle ;
-- aucune ligne écrite, aucune copie reconstituée pour les concurrents déjà importés (M56). Seul
-- `scripts/nettoyer-test.mjs` de `main` s'arrête devant une table à `agency_id` qu'il ne classe pas :
-- entre l'application et le `/valide`, l'e2e ne se joue que depuis la branche.
--
-- Prédiction du catalogue (base partagée, 11/11) : tables publiques 48 → 49, politiques 53 → 54,
-- fonctions 57 → 60, déclencheurs 31 → 33, index 157 → 160, `projects` 21 → 22 colonnes, tâches
-- de nuit + 1 ; 25 dossiers, 127 concurrents et 321 observations inchangés ; la table vide.

-- `alter table projects` et les clés étrangères prennent des verrous forts : si une requête les
-- tient, la migration s'annule au bout de 5 s plutôt que de mettre l'application en file derrière
-- elle (gardien-sql, 11/11, comme la partie 0).
set local lock_timeout = '5s';

create table public.competitor_listing_copies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  comparable_id uuid not null unique references public.comparables (id) on delete cascade,
  source text not null check (source in ('page', 'search')),
  captured_at timestamptz not null default now(),
  portal text check (portal is null or char_length(portal) between 1 and 60),
  listing_key text check (listing_key is null or char_length(listing_key) between 1 and 500),
  price numeric not null check (price > 0),
  photo_urls jsonb not null default '[]'::jsonb
    check (jsonb_typeof(photo_urls) = 'array' and jsonb_array_length(photo_urls) <= 40),
  facts jsonb not null default '{}'::jsonb
    check (jsonb_typeof(facts) = 'object' and pg_column_size(facts) <= 20000)
);

-- La copie se lit par son concurrent (l'unicité l'indexe) ; la recherche par annonce viendra avec
-- la partie B si elle en a besoin.
create index competitor_listing_copies_project on public.competitor_listing_copies (project_id);

comment on table public.competitor_listing_copies is
  'Mission 152 — la copie de l''annonce d''un concurrent (prix, dates, photos, caractéristiques ; jamais le texte), écrite une fois à sa création par le serveur seul, jamais modifiée, purgée à 3 ans sans contact.';

-- Le concurrent est de ce dossier et de cette agence ; la copie ne date pas de l'avenir ; elle ne se
-- modifie jamais (une suppression, par cascade ou par l'effacement réel, reste possible).
create function public.check_competitor_listing_copy()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'competitor_listing_copies : une copie ne se modifie pas' using errcode = 'check_violation';
  end if;
  if not exists (
    select 1 from public.comparables c
    where c.id = new.comparable_id and c.project_id = new.project_id and c.agency_id = new.agency_id
  ) then
    raise exception 'competitor_listing_copies : le concurrent n''est pas de ce dossier ni de cette agence'
      using errcode = 'check_violation';
  end if;
  if new.captured_at > now() + interval '5 minutes' then
    raise exception 'competitor_listing_copies : une copie ne date pas de l''avenir' using errcode = 'check_violation';
  end if;
  return new;
end $$;

revoke all on function public.check_competitor_listing_copy() from public, anon, authenticated;

create trigger competitor_listing_copies_check
  before insert or update on public.competitor_listing_copies
  for each row execute function public.check_competitor_listing_copy();

alter table public.competitor_listing_copies enable row level security;
create policy competitor_listing_copies_agency_read on public.competitor_listing_copies
  for select to authenticated
  using (agency_id = public.get_current_agency_id());
revoke all on public.competitor_listing_copies from anon, authenticated;
grant select on public.competitor_listing_copies to authenticated;

alter table public.projects add column listings_checked_at timestamptz;
comment on column public.projects.listings_checked_at is
  'Mission 152 — la dernière vérification des annonces des concurrents avant le rendez-vous (« Depuis la préparation ») ; l''heure est posée par la base.';

-- La date de la vérification est l'heure de la base, jamais celle qu'envoie le navigateur : une date
-- dans l'avenir cacherait le rappel « plus de 24 h » pour toujours (gardien-sql, 11/11 ; comme M102
-- et M145 B). La vider reste permis.
create function public.date_listings_check()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.listings_checked_at is not null
     and new.listings_checked_at is distinct from old.listings_checked_at then
    new.listings_checked_at := now();
  end if;
  return new;
end $$;

revoke all on function public.date_listings_check() from public, anon, authenticated;

create trigger projects_date_listings_check
  before update of listings_checked_at on public.projects
  for each row execute function public.date_listings_check();

-- Conservation : la copie suit la purge à 3 ans du reste du dossier (M102). Le dernier fait connu
-- est le plus récent de : la copie, l'adresse connue ou corrigée, le dossier remis, le rendez-vous,
-- le mandat, le refus, la collaboration obtenue ou refusée (M115). Passé 3 ans, la copie part ; le
-- concurrent et son annonce restent.
create function public.purge_stale_listing_copies()
returns integer
language sql
security invoker
set search_path = public
as $$
  with gone as (
    delete from public.competitor_listing_copies k
    using public.comparables c
    where c.id = k.comparable_id
      and greatest(
            k.captured_at,
            c.locator_address_at,
            c.prospecting_handed_at,
            c.prospecting_meeting_at,
            c.prospecting_mandate_at,
            c.prospecting_declined_at,
            c.prospecting_collaboration_at,
            c.prospecting_collaboration_declined_at
          ) < now() - interval '3 years'
    returning 1
  )
  select count(*)::integer from gone
$$;

revoke all on function public.purge_stale_listing_copies() from public, anon, authenticated;
grant execute on function public.purge_stale_listing_copies() to service_role;

-- Tous les jours à 3 h 28 (UTC), entre la purge des adresses des concurrents (3 h 27) et celle des
-- biens démarchés (3 h 29).
select cron.schedule(
  'purge-stale-listing-copies',
  '28 3 * * *',
  $$select public.purge_stale_listing_copies()$$
);
