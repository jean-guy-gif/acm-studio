-- Mission 141 — Le dossier d'adresse : ce que les données publiques et gratuites disent de
-- l'adresse du bien vendeur (ventes réelles DVF, DPE de l'ADEME, risques de Géorisques, urbanisme
-- et parcelle de l'IGN, copropriété du registre de l'ANAH), construit à la demande du conseiller,
-- gardé et daté. Écran du conseiller seulement : rien ne va devant le vendeur.
--
-- Une ligne par dossier vendeur (`subject_properties.project_id` est unique : par dossier = par
-- bien). `blocks` porte, par source, son état (ok, rien trouvé, en panne), sa date et ses données,
-- relu par le serveur à la lecture (liste d'autorisation, M101) ; `address_fingerprint` dit
-- l'adresse et le type de bien du moment, pour que l'écran sache que l'adresse a changé depuis.
--
-- Compatible avec le code de `main` : une table que `main` ne connaît pas, aucune ligne existante
-- modifiée. Comptage sur la vraie base avant (07/11, lecture seule) : la table n'existe pas ;
-- 48 tables publiques, 53 politiques, 57 fonctions, 31 déclencheurs, 157 index, 22 dossiers
-- (dont 2 archivés), 21 biens vendeurs.
-- Prédiction : 49 tables (la nouvelle, vide, 9 colonnes), 54 politiques, 58 fonctions, 32
-- déclencheurs, 159 index ; RLS active, le navigateur en lecture seule, aucun droit pour anon ;
-- 22 dossiers et 21 biens inchangés, aucune ligne écrite.

create table public.address_dossiers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  project_id uuid not null unique references public.projects (id) on delete cascade,
  built_by uuid references public.profiles (id) on delete set null,
  -- Posé par la base à chaque construction ou actualisation, jamais par le code.
  built_at timestamptz not null default now(),
  address_fingerprint text not null check (char_length(address_fingerprint) between 1 and 600),
  blocks jsonb not null default '{}'::jsonb
    check (jsonb_typeof(blocks) = 'object' and pg_column_size(blocks) <= 262144)
);

comment on table public.address_dossiers is
  'Mission 141 — le dossier d''adresse du bien vendeur (données publiques), par dossier, daté ; lu par l''agence, écrit par le serveur seul ; jamais côté vendeur.';

alter table public.address_dossiers enable row level security;

-- Le manager et le conseiller de l'agence (non retirés, M88) lisent ; le serveur seul écrit, après
-- le garde de l'action (dossier non archivé de l'agence).
create policy address_dossiers_agency_read on public.address_dossiers
  for select
  to authenticated
  using (agency_id = public.get_current_agency_id());

revoke all on public.address_dossiers from anon, authenticated;
grant select on public.address_dossiers to authenticated;

-- Le dossier appartient à son agence : la base le vérifie, quel que soit le chemin ; et la date de
-- construction est celle de la base, à l'insertion comme à chaque actualisation.
create function public.check_address_dossier() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.projects p where p.id = new.project_id and p.agency_id = new.agency_id
  ) then
    raise exception 'address_dossiers: le dossier n''est pas à cette agence';
  end if;
  new.built_at := now();
  new.updated_at := now();
  return new;
end;
$$;

create trigger address_dossiers_check
  before insert or update on public.address_dossiers
  for each row execute function public.check_address_dossier();
