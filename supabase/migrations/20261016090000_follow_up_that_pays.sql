-- Mission 96 — La relance qui rapporte.
--
-- Trois ajouts, aucune ligne existante modifiée :
--   1. le MOTIF de relance d'un dossier « à relancer », choisi dans une liste
--      (`follow_up_motive`), et sa précision d'une ligne pour « Autre »
--      (`follow_up_motive_detail`). La note libre `follow_up_reason` (M90) reste telle quelle.
--      Les dossiers « à relancer » déjà en base n'ont pas de motif : aucun n'est inventé.
--   2. l'HISTORIQUE des relances (`follow_up_contacts`) : une ligne par « Relancé aujourd'hui »,
--      avec sa date, sa note facultative et son auteur ; cloisonné par agence, ajout seul.
--   3. le PRIX RÉVÉLÉ d'un concurrent (`live_seller_responses.revealed_listing_price`), figé par
--      la base à l'instant où la devinette du vendeur est enregistrée — c'est-à-dire à la
--      révélation. Les Lives déjà faits n'en ont pas : aucun prix n'est reconstitué.
--
-- Compatible avec le code de `main` : il appelle `conclude_meeting` avec 13 arguments nommés et
-- `change_meeting_outcome` avec 6 ; les nouveaux paramètres ont une valeur par défaut, et un
-- appel sans motif garde le motif déjà enregistré. `main` ne lit ni la nouvelle table ni les
-- nouvelles colonnes ; son écran reçoit `revealed_listing_price` avec la réponse du vendeur,
-- mais cette colonne n'existe qu'une fois la devinette enregistrée, donc le prix déjà révélé.

-- ---------------------------------------------------------------------------------------------
-- 1. Le motif de relance.
-- ---------------------------------------------------------------------------------------------
alter table public.project_meeting_conclusions
  add column follow_up_motive text
    check (follow_up_motive is null or follow_up_motive in (
      'price_accepted', 'thinking_price', 'consulting_relative', 'awaiting_estimate',
      'undated_project', 'other')),
  add column follow_up_motive_detail text
    check (follow_up_motive_detail is null or char_length(follow_up_motive_detail) <= 200),
  -- Un motif de relance n'a de sens que pour un dossier « à relancer ».
  add constraint pmc_motive_only_follow_up
    check (follow_up_motive is null or outcome = 'follow_up'),
  -- La précision n'accompagne que « Autre ».
  add constraint pmc_motive_detail_only_other
    check (follow_up_motive_detail is null or follow_up_motive = 'other');

comment on column public.project_meeting_conclusions.follow_up_motive is
  'Motif de relance d''un dossier « à relancer », choisi dans une liste (mission 96). Null = non renseigné.';
comment on column public.project_meeting_conclusions.follow_up_motive_detail is
  'La ligne de texte du motif « Autre » (mission 96).';

drop function public.conclude_meeting(
  uuid, uuid, text, text, numeric, numeric, numeric, numeric, numeric, numeric, integer, integer, text);

create function public.conclude_meeting(
  p_project_id uuid,
  p_agency_id uuid,
  p_outcome text,
  p_reason text,
  p_price numeric,
  p_market_computed numeric,
  p_advisor_analysis numeric,
  p_advisor_price numeric,
  p_seller_wanted numeric default null,
  p_seller_perceived numeric default null,
  p_retained integer default null,
  p_exploitable integer default null,
  p_mandate_type text default null,
  p_follow_up_motive text default null,
  p_follow_up_motive_detail text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
  v_readiness_first smallint;
  v_readiness_last smallint;
  v_readiness_missing text;
  v_reason text;
  v_mandate_type text;
  v_motive text;
  v_motive_detail text;
begin
  if p_outcome not in ('signed', 'follow_up', 'sold_elsewhere', 'withdrawn') then
    raise exception 'conclude_meeting: issue invalide %', p_outcome;
  end if;
  if p_mandate_type is not null and p_mandate_type not in ('exclusive', 'simple') then
    raise exception 'conclude_meeting: type de mandat invalide %', p_mandate_type;
  end if;
  if p_follow_up_motive is not null and p_follow_up_motive not in (
       'price_accepted', 'thinking_price', 'consulting_relative', 'awaiting_estimate',
       'undated_project', 'other') then
    raise exception 'conclude_meeting: motif de relance invalide %', p_follow_up_motive;
  end if;
  -- Le motif vaut pour tout sauf un mandat signé ; le type de mandat, pour lui seul.
  v_reason := case when p_outcome = 'signed' then null else nullif(btrim(p_reason), '') end;
  v_mandate_type := case when p_outcome = 'signed' then p_mandate_type else null end;
  -- Mission 96 — le motif de relance, pour « à relancer » seulement ; sa précision, pour « Autre ».
  v_motive := case when p_outcome = 'follow_up' then p_follow_up_motive end;
  v_motive_detail := case when v_motive = 'other'
    then nullif(left(btrim(p_follow_up_motive_detail), 200), '') end;

  -- Mission 85 — la note du vendeur, lue ici à l'instant du figeage. Absente reste absente.
  select s.seller_launch_readiness_first, s.seller_launch_readiness_last,
         s.seller_launch_readiness_missing
    into v_readiness_first, v_readiness_last, v_readiness_missing
    from public.live_seller_summary s
    where s.project_id = p_project_id and s.agency_id = p_agency_id;

  insert into public.project_meeting_conclusions as c
    (project_id, agency_id, commercialization_price, frozen_market_computed,
     frozen_advisor_analysis, frozen_advisor_price, frozen_seller_wanted_price,
     frozen_seller_perceived_price, frozen_retained_competitors, frozen_exploitable_competitors,
     frozen_meeting_duration_seconds,
     frozen_launch_readiness_first, frozen_launch_readiness_last, frozen_launch_readiness_missing,
     outcome, follow_up_reason, follow_up_motive, follow_up_motive_detail,
     mandate_type, signed_at, concluded_at, outcome_changed_at)
  values
    (p_project_id, p_agency_id, p_price, p_market_computed, p_advisor_analysis, p_advisor_price,
     p_seller_wanted, p_seller_perceived, p_retained, p_exploitable,
     -- Durée CALCULÉE ici, à l'instant du figeage, depuis les horodatages courants.
     public.meeting_duration_seconds(p_project_id),
     v_readiness_first, v_readiness_last, v_readiness_missing,
     p_outcome, v_reason, v_motive, v_motive_detail, v_mandate_type,
     case when p_outcome = 'signed' then now() end, now(), now())
  on conflict (project_id) do update set
    -- La signature se date UNE fois, au premier passage d'une autre issue (ou d'aucune) à
    -- « mandat signé ». Lue AVANT le changement d'issue (c.outcome est l'ancienne valeur).
    signed_at = coalesce(
      c.signed_at,
      case when excluded.outcome = 'signed' and c.outcome is distinct from 'signed' then now() end),
    outcome = excluded.outcome,
    follow_up_reason = excluded.follow_up_reason,
    -- Un motif fourni remplace l'ancien ; sans motif fourni (code d'avant la mission 96), un
    -- dossier « à relancer » garde le sien. Il tombe quand le dossier n'est plus à relancer.
    follow_up_motive = case
      when excluded.outcome = 'follow_up' then coalesce(excluded.follow_up_motive, c.follow_up_motive)
      else null
    end,
    follow_up_motive_detail = case
      when excluded.outcome <> 'follow_up' then null
      when excluded.follow_up_motive is not null then excluded.follow_up_motive_detail
      else c.follow_up_motive_detail
    end,
    -- Un type fourni remplace l'ancien ; sans type fourni, un mandat déjà typé le garde.
    mandate_type = case
      when excluded.outcome = 'signed' then coalesce(excluded.mandate_type, c.mandate_type)
      else null
    end,
    -- Un prix fourni à la conclusion remplace l'ancien ; sinon l'ancien est gardé.
    commercialization_price = coalesce(excluded.commercialization_price, c.commercialization_price),
    frozen_market_computed  = coalesce(c.frozen_market_computed, excluded.frozen_market_computed),
    frozen_advisor_analysis = coalesce(c.frozen_advisor_analysis, excluded.frozen_advisor_analysis),
    frozen_advisor_price    = coalesce(c.frozen_advisor_price, excluded.frozen_advisor_price),
    frozen_seller_wanted_price = coalesce(c.frozen_seller_wanted_price, excluded.frozen_seller_wanted_price),
    frozen_seller_perceived_price = coalesce(c.frozen_seller_perceived_price, excluded.frozen_seller_perceived_price),
    frozen_retained_competitors = coalesce(c.frozen_retained_competitors, excluded.frozen_retained_competitors),
    frozen_exploitable_competitors = coalesce(c.frozen_exploitable_competitors, excluded.frozen_exploitable_competitors),
    frozen_meeting_duration_seconds = coalesce(c.frozen_meeting_duration_seconds, public.meeting_duration_seconds(p_project_id)),
    frozen_launch_readiness_first = coalesce(c.frozen_launch_readiness_first, excluded.frozen_launch_readiness_first),
    frozen_launch_readiness_last = coalesce(c.frozen_launch_readiness_last, excluded.frozen_launch_readiness_last),
    frozen_launch_readiness_missing = coalesce(c.frozen_launch_readiness_missing, excluded.frozen_launch_readiness_missing),
    -- La date du rendez-vous ne se réécrit plus : corriger une issue ne la falsifie pas.
    concluded_at = coalesce(c.concluded_at, now()),
    outcome_changed_at = now(),
    updated_at = now();

  update public.projects
    set status = 'meeting_completed', updated_at = now()
    where id = p_project_id
      and agency_id = p_agency_id
      and status in ('draft', 'ready_for_meeting');
  get diagnostics v_updated = row_count;

  return v_updated > 0;
end;
$$;

revoke all on function public.conclude_meeting(
  uuid, uuid, text, text, numeric, numeric, numeric, numeric, numeric, numeric, integer, integer,
  text, text, text)
  from public, anon, authenticated;
grant execute on function public.conclude_meeting(
  uuid, uuid, text, text, numeric, numeric, numeric, numeric, numeric, numeric, integer, integer,
  text, text, text)
  to service_role;

drop function public.change_meeting_outcome(uuid, uuid, text, text, text, numeric);

create function public.change_meeting_outcome(
  p_project_id uuid,
  p_agency_id uuid,
  p_outcome text,
  p_reason text,
  p_mandate_type text default null,
  p_price numeric default null,
  p_follow_up_motive text default null,
  p_follow_up_motive_detail text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
  v_motive text;
  v_motive_detail text;
begin
  if p_outcome not in ('signed', 'follow_up', 'sold_elsewhere', 'withdrawn') then
    raise exception 'change_meeting_outcome: issue invalide %', p_outcome;
  end if;
  if p_mandate_type is not null and p_mandate_type not in ('exclusive', 'simple') then
    raise exception 'change_meeting_outcome: type de mandat invalide %', p_mandate_type;
  end if;
  if p_follow_up_motive is not null and p_follow_up_motive not in (
       'price_accepted', 'thinking_price', 'consulting_relative', 'awaiting_estimate',
       'undated_project', 'other') then
    raise exception 'change_meeting_outcome: motif de relance invalide %', p_follow_up_motive;
  end if;
  v_motive := case when p_outcome = 'follow_up' then p_follow_up_motive end;
  v_motive_detail := case when v_motive = 'other'
    then nullif(left(btrim(p_follow_up_motive_detail), 200), '') end;

  update public.project_meeting_conclusions c
    set signed_at = coalesce(
          c.signed_at,
          case when p_outcome = 'signed' and c.outcome is distinct from 'signed' then now() end),
        outcome = p_outcome,
        follow_up_reason = case when p_outcome = 'signed' then null else nullif(btrim(p_reason), '') end,
        follow_up_motive = case
          when p_outcome = 'follow_up' then coalesce(v_motive, c.follow_up_motive)
          else null
        end,
        follow_up_motive_detail = case
          when p_outcome <> 'follow_up' then null
          when v_motive is not null then v_motive_detail
          else c.follow_up_motive_detail
        end,
        mandate_type = case
          when p_outcome = 'signed' then coalesce(p_mandate_type, c.mandate_type)
          else null
        end,
        commercialization_price = coalesce(p_price, c.commercialization_price),
        outcome_changed_at = now(),
        updated_at = now()
    where c.project_id = p_project_id
      and c.agency_id = p_agency_id;
  get diagnostics v_updated = row_count;

  return v_updated > 0;
end;
$$;

revoke all on function public.change_meeting_outcome(uuid, uuid, text, text, text, numeric, text, text)
  from public, anon, authenticated;
grant execute on function public.change_meeting_outcome(uuid, uuid, text, text, text, numeric, text, text)
  to service_role;

-- ---------------------------------------------------------------------------------------------
-- 2. L'historique des relances.
--
-- Droits, sur le modèle de la liste d'opposition (M98) : les membres non retirés de l'agence
-- LISENT et AJOUTENT ; personne ne modifie ni ne retire une relance depuis le navigateur.
-- L'ajout ne choisit pas la date et ne signe pas à la place d'un collègue.
-- ---------------------------------------------------------------------------------------------
create table public.follow_up_contacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  agency_id uuid not null references public.agencies (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  contacted_at timestamptz not null default now(),
  note text check (note is null or (char_length(note) <= 200 and note !~ '[\n\r]')),
  created_at timestamptz not null default now()
);

create index idx_follow_up_contacts_project on public.follow_up_contacts (project_id, contacted_at desc);
create index idx_follow_up_contacts_agency on public.follow_up_contacts (agency_id);

comment on table public.follow_up_contacts is
  'Historique des relances d''un dossier « à relancer » : date, note d''une ligne, auteur (mission 96).';

alter table public.follow_up_contacts enable row level security;

create policy follow_up_contacts_agency_read
  on public.follow_up_contacts
  for select
  to authenticated
  using (agency_id = public.get_current_agency_id());

create policy follow_up_contacts_agency_insert
  on public.follow_up_contacts
  for insert
  to authenticated
  with check (
    agency_id = public.get_current_agency_id()
    and author_id = auth.uid()
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.agency_id = public.get_current_agency_id()
    )
  );

revoke all on public.follow_up_contacts from anon;
revoke all on public.follow_up_contacts from authenticated;
grant select on public.follow_up_contacts to authenticated;
grant insert (project_id, agency_id, author_id, note) on public.follow_up_contacts to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3. Le prix révélé, figé à la révélation.
--
-- Le prix d'un concurrent se révèle au vendeur dès que sa devinette est enregistrée (M41, M51).
-- C'est donc à cet instant — la devinette passe de vide à renseignée — que la base recopie le
-- prix affiché du concurrent. Il ne se réécrit jamais ensuite, et le navigateur ne le choisit
-- pas : quoi qu'il envoie dans cette colonne, c'est la base qui décide.
-- Une devinette enregistrée AVANT cette migration ne fige rien après coup : ce serait le prix
-- d'un autre jour. Ces Lives se comparent au prix actuel, et l'écran le dit.
-- ---------------------------------------------------------------------------------------------
alter table public.live_seller_responses
  add column revealed_listing_price numeric;

comment on column public.live_seller_responses.revealed_listing_price is
  'Prix affiché du concurrent à l''instant de sa révélation, figé par la base (mission 96). Null pour les Lives d''avant.';

create function public.freeze_revealed_listing_price() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comparable_id uuid;
begin
  if tg_op = 'UPDATE' then
    -- Déjà figé, ou devinette déjà donnée (Live d'avant la mission) : rien ne bouge.
    if old.revealed_listing_price is not null or old.seller_estimated_listing_price is not null then
      new.revealed_listing_price := old.revealed_listing_price;
      return new;
    end if;
    -- Le rattachement d'une réponse est figé (M92) : on lit l'ancien.
    v_comparable_id := old.comparable_id;
  else
    v_comparable_id := new.comparable_id;
  end if;

  new.revealed_listing_price := null;
  if new.seller_estimated_listing_price is not null and v_comparable_id is not null then
    select c.price into new.revealed_listing_price
      from public.comparables c
      where c.id = v_comparable_id and c.agency_id = new.agency_id;
  end if;
  return new;
end;
$$;

create trigger live_seller_responses_freeze_revealed_price
  before insert or update on public.live_seller_responses
  for each row execute function public.freeze_revealed_listing_price();
