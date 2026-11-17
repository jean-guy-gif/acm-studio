-- Mission 159 — le quartier montré au vendeur (décisions de Jean-Guy, 17/11).
--
-- Le conseiller coche, sur « Avant le rendez-vous », les blocs du dossier d'adresse d'Academia que
-- verra le vendeur (urbanisme, risques, population, copropriété, permis, ventes réelles). À chaque
-- enregistrement de son choix, la base garde un instantané : les SEULS blocs cochés, tels que les
-- donne la vue « bien-client » (jamais la valeur indicative, jamais le DPE : la base refuse toute
-- autre clé), relus par le serveur avant l'écriture. Le Live et l'impression lisent le dernier ; un
-- lien déjà envoyé garde celui d'avant sa création. L'instantané ne se modifie jamais, clé de
-- service comprise ; un nouveau est refusé une fois le Live commencé (heure de début ou réponse du
-- vendeur, `live_has_started`, M112) ou sur un dossier conclu ou archivé : ce qui a été montré
-- reste. La réouverture d'un Live par un opérateur (M104) rouvre le choix, comme pour le rythme.
--
-- Une table neuve, rien d'autre ne change.

set local lock_timeout = '5s';

create table public.project_neighbourhood_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects (id) on delete cascade,
  agency_id uuid not null references public.agencies (id) on delete cascade,
  -- Les seuls blocs cochés, par leur nom ; un objet vide quand rien n'est coché.
  blocks jsonb not null
    check (jsonb_typeof(blocks) = 'object')
    check ((blocks - array['urbanisme', 'risques', 'population', 'copropriete', 'permis', 'ventes']) = '{}'::jsonb)
    check (pg_column_size(blocks) <= 200000)
    -- Défense de plus : ni le bloc de la valeur indicative ni l'étiquette énergétique, à aucun niveau.
    check (not jsonb_path_exists(blocks, '$.**.estimation', '{}', true)
           and not jsonb_path_exists(blocks, '$.**.dpe', '{}', true)),
  -- Le bien pour lequel la vue a été calculée : un instantané d'une autre adresse ou d'un autre bien
  -- est écarté avant le Live.
  property_address text not null check (char_length(property_address) between 5 and 300),
  property_type text not null check (property_type in ('maison', 'appartement')),
  property_rooms integer not null check (property_rooms > 0),
  property_surface integer not null check (property_surface > 0),
  -- Le jour où Academia a calculé la vue (« calculeLe »).
  computed_on date,
  taken_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);

comment on table public.project_neighbourhood_snapshots is
  'Mission 159 — les blocs du quartier cochés pour le vendeur, figés à chaque choix du conseiller (vue « bien-client » d''Academia, jamais la valeur indicative ni le DPE) ; écrite par le serveur seul, jamais modifiée, partie avec son dossier.';

create index project_neighbourhood_snapshots_latest
  on public.project_neighbourhood_snapshots (project_id, taken_at desc);
create index project_neighbourhood_snapshots_agency
  on public.project_neighbourhood_snapshots (agency_id);
-- La mise à nul de l'auteur, à la suppression de son compte, ne parcourt pas toute la table.
create index project_neighbourhood_snapshots_created_by
  on public.project_neighbourhood_snapshots (created_by);

create function public.check_project_neighbourhood_snapshot()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_status text;
begin
  select p.status into v_status
    from public.projects p
    where p.id = new.project_id and p.agency_id = new.agency_id;
  if v_status is null then
    raise exception 'project_neighbourhood_snapshots : le dossier n''est pas à cette agence'
      using errcode = 'check_violation';
  end if;
  if new.created_by is not null and not exists (
    select 1 from public.profiles p where p.id = new.created_by and p.agency_id = new.agency_id
  ) then
    raise exception 'project_neighbourhood_snapshots : l''auteur n''est pas de cette agence'
      using errcode = 'check_violation';
  end if;
  -- Ce qui a été montré reste : plus de nouveau choix une fois le Live commencé, ni sur un dossier
  -- conclu ou archivé.
  if v_status in ('meeting_completed', 'archived') or public.live_has_started(new.project_id) then
    raise exception 'project_neighbourhood_snapshots : le Live a commencé, le quartier ne change plus'
      using errcode = '42501';
  end if;
  new.taken_at := now();
  new.created_at := now();
  return new;
end $$;

create function public.refuse_project_neighbourhood_snapshot_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Seule exception : l'auteur devient nul quand son compte est supprimé (`on delete set null`),
  -- rien d'autre ne bouge (le défaut de la M135, corrigé de même sur `buyer_events`).
  if old.created_by is not null and new.created_by is null
     and (to_jsonb(new) - 'created_by') = (to_jsonb(old) - 'created_by') then
    return new;
  end if;
  raise exception 'project_neighbourhood_snapshots : un instantané ne se modifie jamais'
    using errcode = '42501';
end $$;

revoke all on function public.check_project_neighbourhood_snapshot() from public, anon, authenticated;
revoke all on function public.refuse_project_neighbourhood_snapshot_update() from public, anon, authenticated;

create trigger project_neighbourhood_snapshots_check
  before insert on public.project_neighbourhood_snapshots
  for each row execute function public.check_project_neighbourhood_snapshot();
create trigger project_neighbourhood_snapshots_no_update
  before update on public.project_neighbourhood_snapshots
  for each row execute function public.refuse_project_neighbourhood_snapshot_update();

alter table public.project_neighbourhood_snapshots enable row level security;
create policy project_neighbourhood_snapshots_agency_read on public.project_neighbourhood_snapshots
  for select to authenticated
  using (agency_id = public.get_current_agency_id());
revoke all on public.project_neighbourhood_snapshots from anon, authenticated;
grant select on public.project_neighbourhood_snapshots to authenticated;
