-- Mission 156 — « Vivre ici » sur tout bien d'une sélection acquéreur (périmètre et maquettes A3,
-- validés par Jean-Guy le 16/11).
--
-- Le lien client « Vivre ici » d'Academia (https://app.myacademia.ai/l/<jeton>) se collait seulement
-- sur un mandat (`projects.academia_living_here_url`, M147 A). Il se colle maintenant aussi sur un
-- bien HORS MANDAT d'une sélection acquéreur (un concurrent, une annonce du marché), depuis la page
-- du dossier acquéreur : un lien par bien, pour toute l'agence.
--
--   `property_living_here_links` : le lien d'un bien hors mandat, repéré par la clé du bien de la
--   boucle (M134, M139) — `listing:<portail>:<numéro>` (l'identité publiée de l'annonce, M47 ; ou,
--   sans identité reconnue, l'adresse de l'annonce), ou `competitor:<id>` pour un concurrent sans
--   annonce reconnue. Jamais `project:` : un mandat garde son lien sur son dossier. Une ligne par
--   bien et par agence. La base vérifie qu'un `competitor:` est un concurrent de cette agence et le
--   rattache (`comparable_id`, cascade : le lien part avec son concurrent) ; une clé `listing:` est
--   publique, le serveur la recalcule depuis un bien de la sélection de l'agence. L'auteur est un
--   membre de cette agence ; la date du collage est l'heure de la base, posée quand le lien change.
--   Lue par les membres non retirés de l'agence ; écrite par le serveur seul.
--
--   Conservation (Jean-Guy, 16/11) : un lien est effacé un an après son collage, chaque nuit (un
--   lien d'Academia ne s'ouvre plus après 30 jours ; un an suffit pour la trace).
--
--   `projects.academia_living_here_pasted_at` : le jour où le lien du mandat a été collé, pour
--   prévenir le conseiller aux 25e et 30e jours (Jean-Guy, 15 et 16/11). Posée par la base quand le
--   lien change, vidée quand il est retiré, jamais écrite par le navigateur (`projects` lui est
--   accordée en entier, M88 : le déclencheur remet l'ancienne valeur). Nulle pour les liens collés
--   avant la mission : rien n'est inventé (M56). `updated_at` ne bouge pas (« ce qui dort », M59).
--
-- Compatible avec le code de `main` : une table neuve qu'il ne lit pas, une colonne nulle qu'il ne
-- lit ni n'écrit ; quand il colle ou retire le lien d'un mandat, la date suit. Aucune ligne modifiée.

set local lock_timeout = '5s';

create table public.property_living_here_links (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  property_key text not null
    check (char_length(property_key) >= 10 and octet_length(property_key) <= 2100
           and property_key ~ '^(competitor:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|listing:[^:]+:.+)$'),
  comparable_id uuid references public.comparables (id) on delete cascade,
  url text not null
    check (url ~ '^https://app\.myacademia\.ai/l/[A-Za-z0-9._~-]+$' and char_length(url) <= 500),
  pasted_by uuid references public.profiles (id) on delete set null,
  pasted_at timestamptz not null default now(),
  unique (agency_id, property_key)
);

create index property_living_here_links_comparable on public.property_living_here_links (comparable_id);
create index property_living_here_links_pasted_at on public.property_living_here_links (pasted_at);

comment on table public.property_living_here_links is
  'Mission 156 — le lien client « Vivre ici » d''Academia d''un bien hors mandat d''une sélection acquéreur, un par bien et par agence (clé de la boucle) ; écrit par le serveur seul, effacé un an après son collage.';

create function public.check_property_living_here_link()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and (new.agency_id is distinct from old.agency_id
          or new.property_key is distinct from old.property_key) then
    raise exception 'property_living_here_links : le bien et l''agence d''un lien ne changent pas'
      using errcode = 'check_violation';
  end if;
  new.comparable_id := null;
  if new.property_key ~ '^competitor:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select c.id into new.comparable_id
      from public.comparables c
     where c.id = substr(new.property_key, 12)::uuid and c.agency_id = new.agency_id;
    if new.comparable_id is null then
      raise exception 'property_living_here_links : le concurrent n''est pas à cette agence'
        using errcode = 'check_violation';
    end if;
  end if;
  if new.pasted_by is not null and not exists (
    select 1 from public.profiles p where p.id = new.pasted_by and p.agency_id = new.agency_id
  ) then
    raise exception 'property_living_here_links : l''auteur n''est pas de cette agence'
      using errcode = 'check_violation';
  end if;
  if tg_op = 'INSERT' or new.url is distinct from old.url then
    new.pasted_at := now();
  else
    new.pasted_at := old.pasted_at;
  end if;
  new.updated_at := now();
  return new;
end $$;

revoke all on function public.check_property_living_here_link() from public, anon, authenticated;

create trigger property_living_here_links_check
  before insert or update on public.property_living_here_links
  for each row execute function public.check_property_living_here_link();

alter table public.property_living_here_links enable row level security;
create policy property_living_here_links_agency_read on public.property_living_here_links
  for select to authenticated
  using (agency_id = public.get_current_agency_id());
revoke all on public.property_living_here_links from anon, authenticated;
grant select on public.property_living_here_links to authenticated;

-- La date du lien d'un mandat.
alter table public.projects add column academia_living_here_pasted_at timestamptz;
comment on column public.projects.academia_living_here_pasted_at is
  'Mission 156 — le jour où le lien « Vivre ici » du mandat a été collé (heure de la base) ; nulle sans lien, et pour les liens collés avant la mission.';

create function public.date_academia_living_here_link()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.academia_living_here_url is distinct from old.academia_living_here_url then
    new.academia_living_here_pasted_at :=
      case when new.academia_living_here_url is null then null else now() end;
  else
    new.academia_living_here_pasted_at := old.academia_living_here_pasted_at;
  end if;
  return new;
end $$;

revoke all on function public.date_academia_living_here_link() from public, anon, authenticated;

create trigger projects_date_academia_living_here_link
  before insert or update of academia_living_here_url, academia_living_here_pasted_at on public.projects
  for each row execute function public.date_academia_living_here_link();

-- La purge d'un an (Jean-Guy, 16/11), chaque nuit, après celles de la M152 (3 h 28 et 3 h 30 UTC).
create function public.purge_stale_living_here_links()
returns integer
language sql
security invoker
set search_path = public
as $$
  with gone as (
    delete from public.property_living_here_links
    where pasted_at < now() - interval '1 year'
    returning 1
  )
  select count(*)::integer from gone
$$;

revoke all on function public.purge_stale_living_here_links() from public, anon, authenticated;
grant execute on function public.purge_stale_living_here_links() to service_role;

select cron.schedule(
  'purge-stale-living-here-links',
  '32 3 * * *',
  $$select public.purge_stale_living_here_links()$$
);
