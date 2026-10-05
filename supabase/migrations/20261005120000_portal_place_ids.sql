-- Mission 69 — « Ouvrir mes recherches » : les identifiants de lieu des portails, APPRIS.
--
-- SeLoger (locations=AD08FR2038), Maisons & Appartements (villes=2123) et Green Acres
-- (city_id-gr_3668) encodent la commune par un identifiant interne qu'on ne peut pas déduire du
-- nom de la ville. On ne le devine jamais : il est relevé dans l'adresse d'une recherche que le
-- conseiller a lue, et seulement si les cartes lues confirment la commune (la commune du bien est
-- la plus fréquente sur la page). Bien'ici n'y figure pas : son adresse se déduit du bien.
--
-- COMMUNE À TOUTES LES AGENCES : un identifiant de lieu est un fait du portail, pas une donnée
-- d'agence — Nice est AD08FR2038 pour tout le monde. Lecture pour tout utilisateur connecté ;
-- AUCUNE écriture directe : tout passe par le Server Action (service role), après la vérification
-- par les cartes. Pas de soft delete : un identifiant qui change est remplacé (upsert).
--
-- `city_key` = « <commune en slug>|<département> » (deux communes homonymes dans deux
-- départements ne se mélangent pas). Sans code postal, rien n'est appris ni utilisé.
create table public.portal_place_ids (
  id uuid primary key default gen_random_uuid(),
  portal text not null check (portal in ('seloger', 'green_acres', 'maisons_appartements')),
  city_key text not null check (city_key ~ '^[a-z0-9-]+\|[0-9]{2}$'),
  city_label text not null,
  place_id text not null check (place_id ~ '^[A-Za-z0-9_]{1,40}$'),
  -- Traçabilité : la recherche lue d'où vient l'identifiant, et qui l'a lue.
  source_url text not null,
  learned_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (portal, city_key)
);

alter table public.portal_place_ids enable row level security;
create policy portal_place_ids_read_authenticated on public.portal_place_ids
  for select to authenticated using (true);
revoke insert, update, delete, truncate on public.portal_place_ids from authenticated;
revoke all on public.portal_place_ids from anon;
