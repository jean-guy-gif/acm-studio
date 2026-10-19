-- Mission 110, partie A — l'aide à la prise de mandat. Deux ajouts, aucune ligne existante
-- modifiée :
--   1. les OBJECTIONS cochées à la conclusion (`project_meeting_conclusions.objections`, liste
--      fermée) et leur ligne libre (`objection_note`) ; elles s'ajoutent au motif de relance (M96),
--      qui reste obligatoire pour « à relancer » ;
--   2. les LIENS de la synthèse laissée au vendeur (`seller_synthesis_links`) : seul le condensat
--      du jeton est gardé, le lien expire après 30 jours ; écrits et lus par le serveur seul.
--
-- Compatible avec le code de `main` : il appelle `conclude_meeting` avec 16 arguments nommés et
-- `change_meeting_outcome` avec 9 ; les nouveaux paramètres ont une valeur par défaut, et un appel
-- sans objections garde celles qui sont posées. `main` ne lit ni les colonnes ni la table nouvelles.

-- ---------------------------------------------------------------------------------------------
-- 1. Les objections.
-- ---------------------------------------------------------------------------------------------
alter table public.project_meeting_conclusions
  add column objections text[] not null default '{}'
    check (objections <@ array['price', 'exclusivity', 'timing', 'other_agency', 'not_ready']::text[]),
  add column objection_note text
    check (objection_note is null or char_length(objection_note) <= 200);

comment on column public.project_meeting_conclusions.objections is
  'Ce qui freine le vendeur, coché à la conclusion (mission 110) : prix, exclusivité, délai, autre agence, projet pas mûr.';
comment on column public.project_meeting_conclusions.objection_note is
  'La ligne libre des objections (mission 110), 200 caractères au plus.';

drop function public.conclude_meeting(
  uuid, uuid, text, text, numeric, numeric, numeric, numeric, numeric, numeric, integer, integer,
  text, text, text, date);

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
  p_follow_up_motive_detail text default null,
  p_next_follow_up_on date default null,
  p_objections text[] default null,
  p_objection_note text default null
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
  v_next date;
  v_note text;
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
  v_reason := case when p_outcome = 'signed' then null else nullif(btrim(p_reason), '') end;
  v_mandate_type := case when p_outcome = 'signed' then p_mandate_type else null end;
  v_motive := case when p_outcome = 'follow_up' then p_follow_up_motive end;
  v_motive_detail := case when v_motive = 'other'
    then nullif(left(btrim(p_follow_up_motive_detail), 200), '') end;
  v_next := case when p_outcome = 'follow_up' then p_next_follow_up_on end;
  v_note := nullif(left(btrim(p_objection_note), 200), '');

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
     outcome, follow_up_reason, follow_up_motive, follow_up_motive_detail, next_follow_up_on,
     objections, objection_note,
     mandate_type, signed_at, concluded_at, outcome_changed_at)
  values
    (p_project_id, p_agency_id, p_price, p_market_computed, p_advisor_analysis, p_advisor_price,
     p_seller_wanted, p_seller_perceived, p_retained, p_exploitable,
     public.meeting_duration_seconds(p_project_id),
     v_readiness_first, v_readiness_last, v_readiness_missing,
     p_outcome, v_reason, v_motive, v_motive_detail, v_next,
     coalesce(p_objections, '{}'), v_note,
     v_mandate_type,
     case when p_outcome = 'signed' then now() end, now(), now())
  on conflict (project_id) do update set
    signed_at = coalesce(
      c.signed_at,
      case when excluded.outcome = 'signed' and c.outcome is distinct from 'signed' then now() end),
    outcome = excluded.outcome,
    follow_up_reason = excluded.follow_up_reason,
    follow_up_motive = case
      when excluded.outcome = 'follow_up' then coalesce(excluded.follow_up_motive, c.follow_up_motive)
      else null
    end,
    follow_up_motive_detail = case
      when excluded.outcome <> 'follow_up' then null
      when excluded.follow_up_motive is not null then excluded.follow_up_motive_detail
      else c.follow_up_motive_detail
    end,
    next_follow_up_on = case
      when excluded.outcome = 'follow_up' then coalesce(excluded.next_follow_up_on, c.next_follow_up_on)
      else null
    end,
    -- Mission 110 — des objections fournies remplacent les anciennes ; sans objections fournies
    -- (code d'avant), celles qui sont posées restent.
    objections = case when p_objections is null then c.objections else excluded.objections end,
    objection_note = case when p_objections is null then c.objection_note else excluded.objection_note end,
    mandate_type = case
      when excluded.outcome = 'signed' then coalesce(excluded.mandate_type, c.mandate_type)
      else null
    end,
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
  text, text, text, date, text[], text)
  from public, anon, authenticated;
grant execute on function public.conclude_meeting(
  uuid, uuid, text, text, numeric, numeric, numeric, numeric, numeric, numeric, integer, integer,
  text, text, text, date, text[], text)
  to service_role;

drop function public.change_meeting_outcome(uuid, uuid, text, text, text, numeric, text, text, date);

create function public.change_meeting_outcome(
  p_project_id uuid,
  p_agency_id uuid,
  p_outcome text,
  p_reason text,
  p_mandate_type text default null,
  p_price numeric default null,
  p_follow_up_motive text default null,
  p_follow_up_motive_detail text default null,
  p_next_follow_up_on date default null,
  p_objections text[] default null,
  p_objection_note text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
  v_motive text;
  v_motive_detail text;
  v_next date;
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
  v_next := case when p_outcome = 'follow_up' then p_next_follow_up_on end;

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
        next_follow_up_on = case
          when p_outcome = 'follow_up' then coalesce(v_next, c.next_follow_up_on)
          else null
        end,
        objections = coalesce(p_objections, c.objections),
        objection_note = case
          when p_objections is null then c.objection_note
          else nullif(left(btrim(p_objection_note), 200), '')
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

revoke all on function public.change_meeting_outcome(uuid, uuid, text, text, text, numeric, text, text, date, text[], text)
  from public, anon, authenticated;
grant execute on function public.change_meeting_outcome(uuid, uuid, text, text, text, numeric, text, text, date, text[], text)
  to service_role;

-- ---------------------------------------------------------------------------------------------
-- 2. Les liens de la synthèse au vendeur. Le jeton n'est jamais gardé, seulement son condensat
--    (sha256, hexadécimal) ; le lien expire après 30 jours. Cloisonné par agence ; aucune
--    lecture ni écriture depuis le navigateur : le serveur crée le lien après le garde, et la page
--    publique le relit par la clé de service.
-- ---------------------------------------------------------------------------------------------
create table public.seller_synthesis_links (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create index seller_synthesis_links_project on public.seller_synthesis_links (project_id);

alter table public.seller_synthesis_links enable row level security;

-- Le manager et le conseiller de l'agence voient ses liens (date, expiration) ; rien d'autre.
create policy seller_synthesis_links_agency_read on public.seller_synthesis_links
  for select
  to authenticated
  using (agency_id = public.get_current_agency_id());

revoke all on public.seller_synthesis_links from anon, authenticated;
grant select on public.seller_synthesis_links to authenticated;
