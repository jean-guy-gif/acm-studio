-- Mission 100 — Le socle pro : savoir quand ça casse, ne jamais dépenser sans limite.
--
-- Trois tables NOUVELLES, aucune ligne écrite, rien de modifié dans l'existant : le code de
-- `main` ne les connaît pas et continue de tourner tel quel.
--
--   1. app_errors            — le journal des erreurs inattendues (serveur, navigateur, Live) ;
--   2. stream_estate_usage   — chaque recherche Stream Estate, avec le nombre d'annonces facturées ;
--   3. agency_search_budgets — le plafond mensuel d'une agence, quand il n'est pas celui par défaut.
--
-- Aucune des trois ne s'écrit depuis le navigateur : le serveur écrit avec la clé service, après
-- avoir vérifié qui appelle. La lecture suit le cloisonnement par agence — sauf `app_errors`, que
-- personne ne lit depuis le navigateur (la page « Erreurs » passe par le serveur).

-- ---------------------------------------------------------------------------------------------
-- 1. app_errors — identifiants seulement (agence, utilisateur), une page sans identifiant de
--    dossier, un message tronqué et nettoyé par le serveur. Les bornes de longueur sont répétées
--    ici : la base refuse ce que le nettoyage aurait laissé passer.
-- ---------------------------------------------------------------------------------------------
create table public.app_errors (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_id uuid references public.agencies (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  source text not null check (source in ('server', 'browser', 'live')),
  page text not null check (char_length(page) between 1 and 200),
  message text not null check (char_length(message) between 1 and 300),
  version text check (version is null or char_length(version) <= 40)
);

create index app_errors_created_at_idx on public.app_errors (created_at desc);

alter table public.app_errors enable row level security;

-- Une politique qui dit non, écrite : la table n'est pas « sans politique », elle est fermée.
create policy app_errors_closed_to_browser on public.app_errors
  for all
  to authenticated
  using (false)
  with check (false);

revoke all on public.app_errors from anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 2. stream_estate_usage — une ligne par recherche qui a facturé au moins une annonce. Le dossier
--    et l'auteur sont gardés tant qu'ils existent ; la consommation, elle, reste à l'agence.
-- ---------------------------------------------------------------------------------------------
create table public.stream_estate_usage (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  adverts integer not null check (adverts > 0)
);

create index stream_estate_usage_agency_month_idx
  on public.stream_estate_usage (agency_id, created_at);

alter table public.stream_estate_usage enable row level security;

create policy stream_estate_usage_agency_read on public.stream_estate_usage
  for select
  to authenticated
  using (agency_id = public.get_current_agency_id());

revoke all on public.stream_estate_usage from anon, authenticated;
grant select on public.stream_estate_usage to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3. agency_search_budgets — une ligne par agence dont le plafond a été réglé ; sans ligne, le
--    plafond par défaut du code s'applique. En centimes : une annonce coûte un centime.
--    Table à part, et non colonne de `agencies` : un manager modifie la ligne de son agence
--    (mission 88), il ne doit pas pouvoir relever son propre plafond.
-- ---------------------------------------------------------------------------------------------
create table public.agency_search_budgets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  agency_id uuid not null unique references public.agencies (id) on delete cascade,
  monthly_cap_cents integer not null check (monthly_cap_cents between 0 and 100000),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.agency_search_budgets enable row level security;

create policy agency_search_budgets_agency_read on public.agency_search_budgets
  for select
  to authenticated
  using (agency_id = public.get_current_agency_id());

revoke all on public.agency_search_budgets from anon, authenticated;
grant select on public.agency_search_budgets to authenticated;

-- ---------------------------------------------------------------------------------------------
-- La consommation depuis une date, par agence. SECURITY INVOKER : un membre n'obtient que la
-- ligne de son agence (la politique de lecture s'applique) ; le serveur, avec la clé service,
-- les obtient toutes pour la page des comptes autorisés. La somme se fait en base : une agence
-- peut dépasser en un mois le nombre de lignes qu'une lecture rend d'un coup.
-- ---------------------------------------------------------------------------------------------
create function public.stream_estate_usage_since(p_since timestamptz)
returns table (agency_id uuid, adverts bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select u.agency_id, sum(u.adverts)::bigint
  from public.stream_estate_usage u
  where u.created_at >= p_since
  group by u.agency_id
$$;

revoke all on function public.stream_estate_usage_since(timestamptz) from public, anon;
grant execute on function public.stream_estate_usage_since(timestamptz)
  to authenticated, service_role;
