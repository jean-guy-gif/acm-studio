-- Mission 47 — L'historique des prix et l'ancienneté des annonces.
--
-- Une OBSERVATION est un constat daté sur une annonce PUBLIQUE : ni un fait de
-- dossier, ni lié à un rôle (concurrent / bien vendeur). La même annonce peut être
-- l'un chez un conseiller et l'autre chez un autre — le rôle appartient au dossier,
-- jamais à l'observation. Le garde-fou est à l'affichage, pas au stockage.
--
-- Une observation ne s'écrase pas et ne se corrige pas. Déduplication : une seule
-- par annonce et par jour (un conseiller qui recharge sa page ne fabrique pas trois
-- constats). Portée cloisonnée par agence, comme le reste du dépôt (§2).

create table public.listing_observations (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,

  -- Identité de l'annonce : le couple (portail, identifiant dans le chemin de
  -- l'adresse canonique) — `26ZEJMLWB13Y` chez SeLoger, `apimo-85508663` chez
  -- Bien'ici, `Al6sdpuxlkaknl9r` chez Green Acres (§3).
  portal text not null,
  listing_key text not null,
  canonical_url text not null,
  -- Identifiant secondaire du portail (ex. legacyId SeLoger), jamais la clé.
  secondary_id text,

  -- Le constat de prix — la colonne vertébrale (§1). Une observation sans prix ne
  -- vaut rien : l'application n'écrit que si un prix a été lu.
  price numeric not null check (price >= 0),
  price_per_square_meter numeric check (price_per_square_meter is null or price_per_square_meter >= 0),

  -- Ancienneté, dans les formes réellement publiées par les portails (§2, §4) :
  published_at timestamptz, -- date exacte si le portail la publie (SeLoger)
  published_lower_bound_at timestamptz, -- borne basse si le portail n'est qu'approximatif
  published_bound_label text, -- le texte tel quel, ex. « plus de 2 mois » (Bien'ici)
  modified_at timestamptz, -- date de modification si publiée et qu'elle a du sens

  -- Nombre de vues quand le portail le publie (Green Acres : « Vu 269 fois depuis
  -- le 23/07/2026 »). Relevé, jamais interprété par l'outil.
  view_count integer check (view_count is null or view_count >= 0),
  view_count_since date,

  -- Date du constat (UTC). La déduplication porte sur le jour.
  observed_on date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now(),

  unique (agency_id, portal, listing_key, observed_on)
);

-- Lecture de l'historique d'une annonce (le plus récent d'abord).
create index listing_observations_history_idx
  on public.listing_observations (agency_id, portal, listing_key, observed_on desc);

alter table public.listing_observations enable row level security;

-- Cloisonnement par agence : un conseiller ne voit et n'écrit que les observations
-- de son agence. La mise en commun entre agences est une décision produit (§7),
-- pas encore prise.
create policy listing_observations_agency_isolation on public.listing_observations
  for all
  to authenticated
  using (agency_id = public.get_current_agency_id())
  with check (agency_id = public.get_current_agency_id());
