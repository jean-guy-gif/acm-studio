-- MISSION 36 — Recherche automatique de concurrents, apprise des décisions du
-- conseiller.
--
-- Deux ajouts :
--
-- 1. La FOURCHETTE DE PRIX du conseiller sur le bien vendeur. Ce n'est pas une
--    estimation de l'outil (le protocole ACM l'interdit) : c'est l'avis d'un
--    professionnel, saisi par lui, et il ne sert qu'à chercher des concurrents
--    comparables. Il n'est jamais montré au vendeur.
--
-- 2. Les DÉCISIONS du conseiller sur les annonces proposées : « concurrent » ou
--    « pas concurrent », avec un motif. C'est la matière de l'apprentissage :
--    la recherche suivante s'appuie dessus. Portée agence — les conseillers
--    d'une même agence s'entraident ; rien ne traverse les agences.

-- 1. Fourchette de prix du conseiller ------------------------------------------

alter table public.subject_properties
  add column advisor_price_min numeric,
  add column advisor_price_max numeric;

alter table public.subject_properties
  add constraint sp_advisor_price_min_positive
    check (advisor_price_min is null or advisor_price_min >= 0),
  add constraint sp_advisor_price_max_positive
    check (advisor_price_max is null or advisor_price_max >= 0),
  add constraint sp_advisor_price_range_ordered
    check (
      advisor_price_min is null
      or advisor_price_max is null
      or advisor_price_min <= advisor_price_max
    );

comment on column public.subject_properties.advisor_price_min is
  'Bas de la fourchette de prix estimée par le CONSEILLER (jamais par l''outil). Sert uniquement à cibler la recherche de concurrents ; jamais montré au vendeur.';

-- 2. Décisions sur les annonces candidates -------------------------------------

create table public.competitor_decisions (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id),
  project_id uuid not null references public.projects (id) on delete cascade,
  listing_url text not null,
  -- Hôte du portail, isolé pour l'apprentissage (un portail systématiquement
  -- écarté finit en bas du classement).
  listing_host text not null,
  decision text not null check (decision in ('accepted', 'rejected')),
  -- Motifs fermés : ce sont EUX que l'apprentissage sait exploiter. Le
  -- commentaire libre est là pour tout le reste, et reste lisible par l'humain.
  reason text check (
    reason is null or reason in (
      'price_too_high', 'price_too_low', 'surface_too_different',
      'wrong_district', 'wrong_property_type', 'condition_not_comparable',
      'duplicate', 'other'
    )
  ),
  comment text check (comment is null or char_length(comment) <= 500),
  -- Instantané de l'annonce au moment de la décision. Sans lui, l'apprentissage
  -- perdrait son sens dès que l'annonce disparaît du portail.
  price numeric,
  surface_area numeric,
  rooms_count integer,
  city text,
  district text,
  property_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Une seule décision par annonce et par dossier : revenir dessus la remplace.
  unique (project_id, listing_url)
);

create index competitor_decisions_agency_idx
  on public.competitor_decisions (agency_id, decision);
create index competitor_decisions_project_idx
  on public.competitor_decisions (project_id);

alter table public.competitor_decisions enable row level security;

create policy cd_select_agency_isolation on public.competitor_decisions
  for select
  to authenticated
  using (agency_id = public.get_current_agency_id());

-- Pas de politique d'écriture : les écritures passent uniquement par une action
-- serveur, après contrôle d'appartenance du dossier à l'agence. On révoque les
-- privilèges par défaut en seconde barrière (TRUNCATE contourne RLS).
revoke insert, update, delete, truncate on public.competitor_decisions from authenticated;
revoke all on public.competitor_decisions from anon;
