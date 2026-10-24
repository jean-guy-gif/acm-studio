-- Mission 117 — la fiche acquéreur.
--
-- Un acquéreur n'appartient à aucun dossier vendeur : il vit par lui-même, dans son agence,
-- que toute l'agence partage (décision de Jean-Guy, 24/10). La fiche note ce que le conseiller
-- entend en découverte, pas plus : qui il est, ce qu'il cherche, ses lignes rouges
-- (`must_have` : les critères indispensables, les autres étant des préférences ;
-- `deal_breakers` : sa liste libre de critères éliminatoires).
--
-- Statut : en recherche (défaut), en visite, a acheté, abandonné ; `status_changed_at` date le
-- dernier changement. « Archiver » = suppression douce (`archived_at`, M93) : invisible partout.
--
-- Lecture : les membres non retirés de l'agence (`get_current_agency_id`, M88, M105).
-- Écriture : le serveur seul, après son garde (comme `saved_searches`, M110) ; le navigateur n'a
-- que SELECT.
--
-- Compatible avec le code de `main`, qui ne connaît pas la table : une table neuve, aucune ligne
-- écrite, rien d'existant modifié.

create table public.buyers (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  advisor_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,

  -- Qui.
  name text not null check (char_length(btrim(name)) between 1 and 80),
  phone text check (phone is null or char_length(phone) <= 40),
  email text check (email is null or char_length(email) <= 120),
  purpose text check (purpose is null or purpose in ('primary', 'secondary', 'investment', 'other')),
  timeline text check (timeline is null or timeline in ('now', 'three_months', 'six_months', 'later')),
  notes text check (notes is null or char_length(notes) <= 2000),

  -- Ce qu'il cherche.
  property_types text[] not null default '{}'
    check (property_types <@ array['apartment', 'house']::text[]),
  -- Les communes telles que le conseiller les a tapées, dédoublonnées par leur clé (M71, M86) ;
  -- la clé se recalcule à chaque lecture, comme pour les adresses (M102). Au moins une.
  cities text[] not null check (cardinality(cities) >= 1),
  budget_ideal integer check (budget_ideal is null or budget_ideal >= 0),
  budget_max integer check (budget_max is null or budget_max >= 0),
  rooms_min integer check (rooms_min is null or rooms_min between 0 and 50),
  bedrooms_min integer check (bedrooms_min is null or bedrooms_min between 0 and 50),
  surface_min numeric(8, 2) check (surface_min is null or surface_min >= 0),
  outdoor boolean,
  parking boolean,
  pool boolean,
  floor_min integer check (floor_min is null or floor_min between 0 and 60),
  elevator boolean,
  -- « DPE minimum » : la plus mauvaise lettre acceptée.
  energy_rating_max text check (energy_rating_max is null or energy_rating_max in ('A', 'B', 'C', 'D', 'E', 'F', 'G')),
  works_accepted boolean,

  -- Ses lignes rouges.
  must_have text[] not null default '{}'
    check (must_have <@ array['property_types', 'cities', 'budget', 'rooms', 'bedrooms', 'surface',
                              'outdoor', 'parking', 'pool', 'floor', 'elevator', 'energy_rating',
                              'works']::text[]),
  deal_breakers text check (deal_breakers is null or char_length(deal_breakers) <= 2000),

  -- Statut.
  status text not null default 'searching'
    check (status in ('searching', 'visiting', 'bought', 'abandoned')),
  status_changed_at timestamptz not null default now(),

  -- Mission 114 — les deux acquéreurs semés par « Préparer ma démo » portent leur marque : la
  -- remise à zéro ne retire que ceux-là.
  demo boolean not null default false,

  constraint buyers_budget_coherent check (budget_ideal is null or budget_max is null or budget_ideal <= budget_max),
  constraint buyers_rooms_cover_bedrooms check (rooms_min is null or bedrooms_min is null or rooms_min >= bedrooms_min)
);

comment on table public.buyers is
  'Mission 117 — la fiche acquéreur : qui, ce qu''il cherche, ses lignes rouges ; partagée par l''agence ; archivée en douceur.';
comment on column public.buyers.must_have is
  'Les critères indispensables (noms de critères) ; les autres sont des préférences.';
comment on column public.buyers.cities is
  'Communes telles que tapées ; la clé de commune (M71, alias M86, arrondissements M99) se recalcule à la lecture.';

create index buyers_agency_active on public.buyers (agency_id, updated_at desc) where archived_at is null;

alter table public.buyers enable row level security;

-- Toute l'agence lit ses acquéreurs, tant qu'on n'est pas retiré ; seul le serveur écrit.
create policy buyers_agency_read on public.buyers
  for select
  to authenticated
  using (agency_id = public.get_current_agency_id());

revoke all on public.buyers from anon, authenticated;
grant select on public.buyers to authenticated;
