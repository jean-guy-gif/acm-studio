-- Mission 84 — le dossier de prospection : un PDF par concurrent à prospecter.
--
-- Tout est ADDITIF et NULLABLE, sans aucune écriture sur une ligne existante : rien ne dépend
-- de l'ordre des opérations, et le code de main, qui ignore ces colonnes et cette table,
-- continue de fonctionner. Les contraintes CHECK ne portent que sur des colonnes neuves :
-- aucune ligne existante ne peut les violer (null est admis).

-- 1. Le conseiller : son téléphone et sa photo, saisis sur « Mon profil ». La photo est un
--    fichier du bucket privé `project-photos`, sous {agency_id}/advisors/ : les politiques de
--    stockage existantes (1er segment = agence) la couvrent déjà.
alter table public.profiles
  add column phone text,
  add column photo_path text,
  add constraint profiles_phone_check
    check (phone is null or phone ~ '^\+?[0-9][0-9 .]{5,24}$'),
  add constraint profiles_photo_path_check
    check (photo_path is null or char_length(photo_path) <= 300);

comment on column public.profiles.phone is
  'Téléphone du conseiller, imprimé sur les dossiers de prospection. Null = non renseigné.';
comment on column public.profiles.photo_path is
  'Chemin de la photo du conseiller dans le bucket privé project-photos ({agency_id}/advisors/…).';

-- 2. L'agence : son adresse postale et sa carte professionnelle, saisies dans
--    Administration → Identité. Absentes, ces mentions sont omises du dossier.
alter table public.agency_branding
  add column postal_address text,
  add column professional_card text,
  add constraint agency_branding_postal_address_check
    check (postal_address is null or char_length(postal_address) <= 200),
  add constraint agency_branding_professional_card_check
    check (professional_card is null or char_length(professional_card) <= 80);

comment on column public.agency_branding.postal_address is
  'Adresse postale de l''agence, en pied des dossiers de prospection. Null = mention omise.';
comment on column public.agency_branding.professional_card is
  'Numéro de carte professionnelle (CPI) de l''agence. Null = mention omise.';

-- 3. Le bien vendeur : le lien de son annonce PUBLIÉE. Sans lien, aucun dossier de
--    prospection (seules les informations publiques de notre annonce sortent de l'agence).
alter table public.subject_properties
  add column public_listing_url text,
  add constraint subject_properties_public_listing_url_check
    check (
      public_listing_url is null
      or (public_listing_url ~ '^https?://' and char_length(public_listing_url) <= 500)
    );

comment on column public.subject_properties.public_listing_url is
  'Lien de l''annonce publiée du bien vendeur, saisi par le conseiller après le mandat. Null = pas d''annonce publiée.';

-- 4. Les textes du dossier, par concurrent et par version (propriétaire ou confrère). Une
--    colonne de texte à null veut dire « texte proposé par ACM, non modifié » : seul ce que le
--    conseiller a réellement réécrit est gardé.
create table public.competitor_prospecting_files (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  comparable_id uuid not null references public.comparables (id) on delete cascade,
  version text not null check (version in ('owner', 'colleague')),

  title text check (title is null or char_length(title) <= 300),
  letter text check (letter is null or char_length(letter) <= 2000),
  key_message text check (key_message is null or char_length(key_message) <= 400),
  proposal_1 text check (proposal_1 is null or char_length(proposal_1) <= 300),
  proposal_2 text check (proposal_2 is null or char_length(proposal_2) <= 300),
  proposal_3 text check (proposal_3 is null or char_length(proposal_3) <= 300),
  contact_hook text check (contact_hook is null or char_length(contact_hook) <= 120),

  -- Null = le choix par défaut d'ACM (prix affichés tant que le nôtre ne dépasse pas le
  -- leur de plus de 5 %) ; la photo par défaut est la première du bien vendeur.
  show_prices boolean,
  photo_path text check (photo_path is null or char_length(photo_path) <= 300),

  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (comparable_id, version)
);

create index idx_competitor_prospecting_files_project
  on public.competitor_prospecting_files (project_id);
create index idx_competitor_prospecting_files_agency
  on public.competitor_prospecting_files (agency_id);

alter table public.competitor_prospecting_files enable row level security;
create policy competitor_prospecting_files_agency_isolation
  on public.competitor_prospecting_files
  for all
  to authenticated
  using (agency_id = public.get_current_agency_id())
  with check (agency_id = public.get_current_agency_id());
revoke all on public.competitor_prospecting_files from anon;
