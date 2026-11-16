-- Mission 157 — « Vivre ici » en un clic, sur le bien vendeur (plan Academia du 16/11, maquette
-- M157-1, validés par Jean-Guy).
--
-- Sur Bien vendeur, « Créer le lien « Vivre ici » » demande à Mon secteur (l'API de Laurent) le
-- dossier de l'adresse du bien, puis son lien client, et le range sur le mandat
-- (`projects.academia_living_here_url`, M147 A). Seul le bien vendeur part vers Academia : aucun
-- bien hors mandat (décision de Jean-Guy, 16/11).
--
--   `project_academia_requests` : le dossier Academia d'un dossier vendeur, un au plus — son
--   identifiant chez Academia, son état (`en_cours`, `pret`, `erreur`), l'adresse du bien au moment
--   de la demande (`property_address` : le dossier et son lien sont oubliés quand l'adresse du bien
--   change, contrat §3.3), l'adresse envoyée (`address_sent` : la même, une adresse proposée par
--   Academia et choisie par le conseiller, ou, dans la démo, celle de son dossier fixe), le lien
--   client créé par l'API et sa
--   date d'expiration donnée par Academia (`expire_le`), qui l'auteur de la demande, et quand.
--   Écrite par le serveur seul (le navigateur peut écrire `projects`, M88 : un identifiant de dossier
--   Academia n'y est donc jamais rangé). Lue par les membres non retirés de l'agence, colonne par
--   colonne : l'état, l'adresse du bien (déjà la sienne), le lien et son expiration ; jamais l'adresse
--   envoyée ni l'identifiant Academia. Elle part avec
--   son dossier (cascade) ; le dossier et l'auteur sont de cette agence, vérifiés par la base.
--
-- Le lien « Vivre ici » d'un bien hors mandat (mission 156) est abandonné : aucun bien hors mandat ne
-- part vers Academia (Jean-Guy, 16/11). Sa table, `property_living_here_links`, vide, part ici avec
-- ses deux fonctions et sa tâche de nuit ; un comptage-garde arrête tout si elle ne l'est plus. La
-- date du lien d'un mandat (`projects.academia_living_here_pasted_at`, M156) reste.
--
-- Compatible avec le code de `main` : une table neuve qu'il ne lit pas, et une table qu'il ne lit pas
-- non plus. Aucune ligne modifiée.

set local lock_timeout = '5s';

create table public.project_academia_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  project_id uuid not null unique references public.projects (id) on delete cascade,
  academia_id text not null
    check (academia_id ~ '^[A-Za-z0-9_-]{1,100}$'),
  state text not null check (state in ('en_cours', 'pret', 'erreur')),
  property_address text not null check (char_length(property_address) between 5 and 300),
  address_sent text not null check (char_length(address_sent) between 5 and 300),
  link_url text
    check (link_url is null
           or (link_url ~ '^https://app\.myacademia\.ai/l/[A-Za-z0-9._~-]+$'
               and char_length(link_url) <= 500)),
  link_expires_at timestamptz,
  requested_by uuid references public.profiles (id) on delete set null,
  requested_at timestamptz not null default now(),
  check ((link_url is null) = (link_expires_at is null))
);

comment on table public.project_academia_requests is
  'Mission 157 — le dossier Academia (Mon secteur) du bien vendeur et son lien client « Vivre ici » créé par l''API, avec son expiration ; écrite par le serveur seul, partie avec son dossier.';

create function public.check_project_academia_request()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and (new.agency_id is distinct from old.agency_id
          or new.project_id is distinct from old.project_id) then
    raise exception 'project_academia_requests : le dossier et l''agence ne changent pas'
      using errcode = 'check_violation';
  end if;
  if not exists (
    select 1 from public.projects p where p.id = new.project_id and p.agency_id = new.agency_id
  ) then
    raise exception 'project_academia_requests : le dossier n''est pas à cette agence'
      using errcode = 'check_violation';
  end if;
  if new.requested_by is not null
     and (tg_op = 'INSERT' or new.requested_by is distinct from old.requested_by)
     and not exists (
       select 1 from public.profiles p where p.id = new.requested_by and p.agency_id = new.agency_id
     ) then
    raise exception 'project_academia_requests : l''auteur n''est pas de cette agence'
      using errcode = 'check_violation';
  end if;
  -- L'heure de la demande est celle de la base : à la première demande, et à chaque nouveau dossier.
  if tg_op = 'INSERT' or new.academia_id is distinct from old.academia_id then
    new.requested_at := now();
  else
    new.requested_at := old.requested_at;
  end if;
  new.updated_at := now();
  return new;
end $$;

revoke all on function public.check_project_academia_request() from public, anon, authenticated;

create trigger project_academia_requests_check
  before insert or update on public.project_academia_requests
  for each row execute function public.check_project_academia_request();

alter table public.project_academia_requests enable row level security;
create policy project_academia_requests_agency_read on public.project_academia_requests
  for select to authenticated
  using (agency_id = public.get_current_agency_id());
-- Le navigateur ne lit que ce que la carte et les liens montrent : l'état de la demande, le lien et
-- son expiration ; jamais l'adresse envoyée ni l'identifiant du dossier chez Academia.
revoke all on public.project_academia_requests from anon, authenticated;
grant select (id, agency_id, project_id, state, property_address, link_url, link_expires_at)
  on public.project_academia_requests to authenticated;

-- Le retrait du hors mandat de la mission 156.
do $$
begin
  if (select count(*) from public.property_living_here_links) > 0 then
    raise exception 'property_living_here_links n''est pas vide : rien n''est retiré';
  end if;
end $$;

select cron.unschedule('purge-stale-living-here-links');
drop function public.purge_stale_living_here_links();
drop table public.property_living_here_links;
drop function public.check_property_living_here_link();
