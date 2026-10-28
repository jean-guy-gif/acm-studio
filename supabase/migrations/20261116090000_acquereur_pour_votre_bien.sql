-- Mission 120 (partie A) — « J'ai un acquéreur pour votre bien » : quand un acquéreur veut visiter un
-- bien qui n'est pas un mandat de l'agence, le conseiller prépare le courrier au propriétaire, et le
-- retrouve dans la même Prospection que le mode vendeur.
--
-- Pas de concurrent sans dossier vendeur (M118) : un bien démarché depuis une recherche acquéreur, que
-- l'agence ne connaît pas déjà comme concurrent d'un mandat signé, vit dans sa propre table.
--
-- `buyer_prospects` : un bien démarché, UN par annonce publiée et par agence (M98 : une carte par
-- bien) — l'annonce, ce qu'elle publie (relu par le serveur), qui le vend et son exclusivité, son
-- adresse (Localisateur ou conseiller, M75, M84) et les faits datés de la prospection (M86, M115).
-- `buyer_prospect_origins` : d'où vient la démarche — une fiche acquéreur et son bien retenu (la ligne
-- de sélection, M118) —, rattachée SOIT à un `buyer_prospects`, SOIT au concurrent qui porte déjà la
-- carte (« la carte existante reçoit en plus l'origine ») ; elle garde le courrier propre à cette
-- recherche (textes réécrits, photo choisie, M84, M87, M115).
--
-- Lecture : les membres non retirés de l'agence ; écriture : le serveur seul, après son garde.
-- Compatible avec le code de `main` : deux tables neuves, une fonction et une tâche de nuit ; aucune
-- table existante n'est modifiée, aucune ligne n'est écrite.

create table public.buyer_prospects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  listing_url text not null check (listing_url ~ '^https?://' and length(listing_url) <= 2000),
  -- L'identité publiée (portail + numéro, M47, M98) : une carte par bien et par agence.
  listing_key text not null check (length(listing_key) between 3 and 300),
  -- Ce que l'annonce publie, relu par le serveur (liste d'autorisation) : type, surface, pièces,
  -- terrain, extérieurs, stationnements, DPE, quartier, commune, prix, photos.
  facts jsonb not null default '{}'::jsonb check (jsonb_typeof(facts) = 'object'),
  sold_by text check (sold_by in ('agency', 'private', 'unknown')),
  exclusivity text check (exclusivity in ('yes', 'no', 'unknown')),
  -- L'adresse, comme celle d'un concurrent (M75, M84, M102, M103).
  locator_state text,
  locator_label text,
  locator_label_key text,
  locator_address text,
  locator_source text,
  locator_confirmed boolean,
  locator_property_id text,
  locator_latitude double precision,
  locator_longitude double precision,
  locator_analyzed_at timestamptz,
  locator_address_at timestamptz,
  locator_purged_at timestamptz,
  -- Les faits datés de la prospection (M86, M115).
  prospecting_handed_at timestamptz,
  prospecting_meeting_at timestamptz,
  prospecting_mandate_at timestamptz,
  prospecting_declined_at timestamptz,
  prospecting_collaboration_at timestamptz,
  prospecting_collaboration_declined_at timestamptz,
  unique (agency_id, listing_key),
  -- Comme sur `comparables` (M115) : la collaboration suit le contact, l'une ou l'autre, jamais
  -- « obtenue » avec un mandat rentré.
  check (prospecting_collaboration_at is null or prospecting_handed_at is not null),
  check (prospecting_collaboration_declined_at is null or prospecting_handed_at is not null),
  check (prospecting_collaboration_at is null or prospecting_collaboration_declined_at is null),
  check (prospecting_collaboration_at is null or prospecting_mandate_at is null)
);

comment on table public.buyer_prospects is
  'Mission 120 — un bien démarché depuis une recherche acquéreur, que l''agence ne connaît pas comme concurrent d''un mandat signé : une carte de Prospection par annonce et par agence.';

-- La date de l'adresse, posée par la base (M102) : départ de la durée de conservation.
create trigger buyer_prospects_stamp_locator_address_at
  before insert or update of locator_address on public.buyer_prospects
  for each row execute function public.stamp_locator_address_at();

create table public.buyer_prospect_origins (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  buyer_id uuid not null references public.buyers (id) on delete cascade,
  -- Le bien retenu dans la sélection de la fiche (M118) : une origine par bien retenu.
  selection_item_id uuid not null unique references public.buyer_selection_items (id) on delete cascade,
  -- La carte : un bien démarché depuis la recherche, OU le concurrent qui porte déjà la carte.
  prospect_id uuid references public.buyer_prospects (id) on delete cascade,
  comparable_id uuid references public.comparables (id) on delete cascade,
  check ((prospect_id is null) <> (comparable_id is null)),
  -- Le courrier de cette recherche (M84, M87, M115) : seul ce qui diffère du texte proposé.
  letter_version text check (letter_version in ('owner', 'colleague')),
  letter_title text check (length(letter_title) <= 200),
  letter_body text check (length(letter_body) <= 3000),
  letter_contact_hook text check (length(letter_contact_hook) <= 200),
  their_photo_mode text check (their_photo_mode in ('listing', 'upload', 'none')),
  their_photo_source_url text check (length(their_photo_source_url) <= 2000),
  their_photo_path text check (length(their_photo_path) <= 500),
  letter_saved_at timestamptz,
  letter_saved_by uuid references public.profiles (id) on delete set null
);

create index buyer_prospect_origins_agency on public.buyer_prospect_origins (agency_id);
create index buyer_prospect_origins_buyer on public.buyer_prospect_origins (buyer_id);
create index buyer_prospect_origins_prospect on public.buyer_prospect_origins (prospect_id);
create index buyer_prospect_origins_comparable on public.buyer_prospect_origins (comparable_id);
create index buyer_prospect_origins_created_by on public.buyer_prospect_origins (created_by);
create index buyer_prospect_origins_letter_saved_by on public.buyer_prospect_origins (letter_saved_by);
create index buyer_prospects_created_by on public.buyer_prospects (created_by);

-- L'agence d'une origine est celle de sa fiche, de son bien retenu et de sa carte — vérifié par la
-- base, quel que soit le chemin, clé service comprise (relecture du gardien-sql ; même intention que
-- les règles de M108 et M111 sur les tables rattachées à un dossier).
create function public.check_buyer_prospect_origin_agency()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (select 1 from public.buyers b where b.id = new.buyer_id and b.agency_id = new.agency_id) then
    raise exception 'buyer_prospect_origins : la fiche n''est pas de cette agence' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.buyer_selection_items i
                 where i.id = new.selection_item_id and i.agency_id = new.agency_id) then
    raise exception 'buyer_prospect_origins : le bien retenu n''est pas de cette agence' using errcode = 'check_violation';
  end if;
  if new.prospect_id is not null and not exists (
    select 1 from public.buyer_prospects p where p.id = new.prospect_id and p.agency_id = new.agency_id
  ) then
    raise exception 'buyer_prospect_origins : le bien démarché n''est pas de cette agence' using errcode = 'check_violation';
  end if;
  if new.comparable_id is not null and not exists (
    select 1 from public.comparables c where c.id = new.comparable_id and c.agency_id = new.agency_id
  ) then
    raise exception 'buyer_prospect_origins : le concurrent n''est pas de cette agence' using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger buyer_prospect_origins_check_agency
  before insert or update of agency_id, buyer_id, selection_item_id, prospect_id, comparable_id
  on public.buyer_prospect_origins
  for each row execute function public.check_buyer_prospect_origin_agency();

comment on table public.buyer_prospect_origins is
  'Mission 120 — l''origine « Recherche acquéreur » d''une carte de Prospection : la fiche, son bien retenu, la carte (bien démarché ou concurrent existant) et le courrier de cette recherche.';

alter table public.buyer_prospects enable row level security;
create policy buyer_prospects_agency_read on public.buyer_prospects
  for select to authenticated
  using (agency_id = public.get_current_agency_id());
revoke all on public.buyer_prospects from anon, authenticated;
grant select on public.buyer_prospects to authenticated;

alter table public.buyer_prospect_origins enable row level security;
create policy buyer_prospect_origins_agency_read on public.buyer_prospect_origins
  for select to authenticated
  using (agency_id = public.get_current_agency_id());
revoke all on public.buyer_prospect_origins from anon, authenticated;
grant select on public.buyer_prospect_origins to authenticated;

-- Conservation (M102) : l'adresse d'un bien démarché sans contact ni statut depuis 3 ans est
-- effacée, comme celle d'un concurrent ; l'annonce et la carte restent.
create function public.purge_stale_buyer_prospect_addresses()
returns integer
language sql
security invoker
set search_path = public
as $$
  with gone as (
    update public.buyer_prospects
    set locator_address = null,
        locator_latitude = null,
        locator_longitude = null,
        locator_property_id = null,
        locator_label = null,
        locator_label_key = null,
        locator_source = null,
        locator_state = null,
        locator_confirmed = null,
        locator_analyzed_at = null,
        locator_purged_at = now(),
        updated_at = now()
    where nullif(btrim(locator_address), '') is not null
      and greatest(
            coalesce(locator_address_at, updated_at),
            prospecting_handed_at,
            prospecting_meeting_at,
            prospecting_mandate_at,
            prospecting_declined_at,
            prospecting_collaboration_at,
            prospecting_collaboration_declined_at
          ) < now() - interval '3 years'
    returning 1
  )
  select count(*)::integer from gone
$$;

revoke all on function public.purge_stale_buyer_prospect_addresses() from public, anon, authenticated;
grant execute on function public.purge_stale_buyer_prospect_addresses() to service_role;

-- Tous les jours à 3 h 29 (UTC), deux minutes après celle des concurrents.
select cron.schedule(
  'purge-stale-buyer-prospect-addresses',
  '29 3 * * *',
  $$select public.purge_stale_buyer_prospect_addresses()$$
);
