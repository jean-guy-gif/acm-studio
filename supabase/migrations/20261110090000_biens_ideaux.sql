-- Mission 118 (partie B) — « Trouver les biens idéaux » : la sélection retenue pour un acquéreur.
--
-- Une sélection (`buyer_selections`) : jusqu'à trois biens (`buyer_selection_items`), chacun avec sa
-- source (dossier vendeur, concurrent à prospecter, annonce du marché), sa référence, son libellé,
-- son prix affiché et la date où il l'a été (« affiché le », jamais « disponible »), sa catégorie
-- (Correspondance forte, Bon compromis, À explorer), ses écarts nommés, ce que la recherche en a
-- dit (`snapshot`) et, pour une annonce, ce que l'import en a lu (`imported`, M-import).
-- Une sélection précédente reste lisible ; la plus récente est celle qui vaut.
--
-- Lecture : les membres non retirés de l'agence ; écriture : le serveur seul (comme `buyers`).
-- Compatible avec le code de `main` : deux tables neuves, aucune ligne écrite.

create table public.buyer_selections (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  buyer_id uuid not null references public.buyers (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index buyer_selections_buyer_latest on public.buyer_selections (buyer_id, created_at desc);

create table public.buyer_selection_items (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  selection_id uuid not null references public.buyer_selections (id) on delete cascade,
  position integer not null check (position between 1 and 3),
  source text not null check (source in ('project', 'competitor', 'listing')),
  reference text not null check (char_length(reference) between 1 and 2000),
  label text not null check (char_length(label) between 1 and 300),
  listed_price integer check (listed_price is null or listed_price >= 0),
  price_seen_on date,
  category text check (category is null or category in ('strong', 'compromise', 'explore', 'agency')),
  gaps text[] not null default '{}',
  snapshot jsonb check (snapshot is null or (jsonb_typeof(snapshot) = 'object' and pg_column_size(snapshot) <= 200000)),
  imported jsonb check (imported is null or (jsonb_typeof(imported) = 'object' and pg_column_size(imported) <= 400000)),
  created_at timestamptz not null default now(),
  unique (selection_id, position)
);

comment on table public.buyer_selections is
  'Mission 118 — la sélection de biens idéaux retenue pour un acquéreur ; la plus récente vaut.';
comment on table public.buyer_selection_items is
  'Mission 118 — un bien retenu : source, référence, prix affiché et sa date, catégorie, écarts nommés, données de la recherche et de l''import.';

alter table public.buyer_selections enable row level security;
alter table public.buyer_selection_items enable row level security;

create policy buyer_selections_agency_read on public.buyer_selections
  for select to authenticated
  using (agency_id = public.get_current_agency_id());
create policy buyer_selection_items_agency_read on public.buyer_selection_items
  for select to authenticated
  using (agency_id = public.get_current_agency_id());

revoke all on public.buyer_selections from anon, authenticated;
revoke all on public.buyer_selection_items from anon, authenticated;
grant select on public.buyer_selections to authenticated;
grant select on public.buyer_selection_items to authenticated;
