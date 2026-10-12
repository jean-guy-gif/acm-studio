-- Mission 101 — Aucun bien retenu perdu.
--
-- Trois ajouts, aucune ligne existante modifiée. Compatible avec le code de `main` : il ne lit ni
-- la nouvelle table ni les deux nouvelles colonnes (qui ont une valeur par défaut), et n'écrit
-- dans `app_errors` que les origines déjà admises.
--
--   1. pending_competitor_imports — un bien RETENU par le conseiller dont l'import n'a pas encore
--      abouti. Écrit AVANT la lecture de l'annonce : il survit à un rechargement ou à une
--      fermeture d'onglet. La ligne part quand le concurrent est créé, ou quand le conseiller y
--      renonce. Elle garde ce que la recherche a déjà donné (`snapshot`), pour créer le concurrent
--      sans relire la page, et sans aucun nouvel appel payant.
--   2. comparables.imported_from_search / listing_withdrawn — d'où vient le concurrent (la page de
--      l'annonce, ou les données de la recherche) et si son annonce a été trouvée retirée.
--   3. app_errors.source — une quatrième origine, « import » : les échecs de lecture d'annonce,
--      comptés à part des pannes (ils ne sont pas dans la pastille « N erreurs depuis hier »).

-- ---------------------------------------------------------------------------------------------
-- 1. pending_competitor_imports
-- ---------------------------------------------------------------------------------------------
create table public.pending_competitor_imports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  listing_url text not null check (char_length(listing_url) between 10 and 2000),
  listing_host text not null check (char_length(listing_host) between 3 and 200),
  -- Ce que la recherche a donné sur ce bien (carte Stream Estate ou carte d'un portail), revalidé
  -- par le serveur à l'écriture. Toujours un objet.
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  -- La cause du dernier échec de lecture, par clé stable (jamais un message, jamais une adresse).
  last_cause text check (
    last_cause is null or last_cause in (
      'robots', 'invalid', 'network', 'timeout', 'too_large', 'withdrawn', 'server', 'no_price'
    )
  ),
  attempts integer not null default 0 check (attempts between 0 and 1000),
  unique (project_id, listing_url)
);

create index pending_competitor_imports_project_idx
  on public.pending_competitor_imports (project_id);

alter table public.pending_competitor_imports enable row level security;

-- Les membres non retirés de l'agence, sur les dossiers de leur agence — comme les concurrents.
create policy pending_competitor_imports_agency_isolation on public.pending_competitor_imports
  for all
  to authenticated
  using (agency_id = public.get_current_agency_id())
  with check (
    agency_id = public.get_current_agency_id()
    and exists (
      select 1 from public.projects p
      where p.id = pending_competitor_imports.project_id
        and p.agency_id = public.get_current_agency_id()
    )
  );

revoke all on public.pending_competitor_imports from anon;

-- ---------------------------------------------------------------------------------------------
-- 2. comparables — la provenance de l'import, et l'annonce trouvée retirée.
-- ---------------------------------------------------------------------------------------------
alter table public.comparables
  add column imported_from_search boolean not null default false,
  add column listing_withdrawn boolean not null default false;

-- ---------------------------------------------------------------------------------------------
-- 3. app_errors — l'origine « import ».
-- ---------------------------------------------------------------------------------------------
alter table public.app_errors drop constraint app_errors_source_check;
alter table public.app_errors add constraint app_errors_source_check
  check (source in ('server', 'browser', 'live', 'import'));
