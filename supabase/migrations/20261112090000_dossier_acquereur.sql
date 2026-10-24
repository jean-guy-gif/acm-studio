-- Mission 119 (partie B) — le dossier acquéreur : la même sélection (M118), dans la forme de la
-- synthèse vendeur (M113), à imprimer ou à envoyer par un lien.
--
-- `buyer_dossier_links` : un lien public vers le dossier, valable 30 jours, retirable (M110) ; la
-- base ne garde que le condensat du jeton (sha256), la fiche, la sélection, l'agence, l'auteur et
-- l'expiration — jamais le lien lui-même.
-- `buyer_selection_items.dossier_hide_photo` : « Sans photo » par bien, comme la synthèse (M113).
--
-- Lecture : les membres non retirés de l'agence ; écriture : le serveur seul.
-- Compatible avec le code de `main` : une colonne avec défaut, une table neuve, aucune ligne écrite.

alter table public.buyer_selection_items
  add column dossier_hide_photo boolean not null default false;
comment on column public.buyer_selection_items.dossier_hide_photo is
  'Mission 119 — « Sans photo » : la photo de ce bien quitte le dossier acquéreur et son lien.';

create table public.buyer_dossier_links (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  buyer_id uuid not null references public.buyers (id) on delete cascade,
  selection_id uuid not null references public.buyer_selections (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create index buyer_dossier_links_buyer on public.buyer_dossier_links (buyer_id);

comment on table public.buyer_dossier_links is
  'Mission 119 — le lien public du dossier acquéreur : condensat du jeton, fiche, sélection, agence, auteur, expiration ; jamais le lien.';

alter table public.buyer_dossier_links enable row level security;
create policy buyer_dossier_links_agency_read on public.buyer_dossier_links
  for select to authenticated
  using (agency_id = public.get_current_agency_id());
revoke all on public.buyer_dossier_links from anon, authenticated;
grant select on public.buyer_dossier_links to authenticated;
