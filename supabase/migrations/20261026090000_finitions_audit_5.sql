-- Mission 108 — les finitions de l'audit n°5. Une seule migration, en trois parties :
--   1. les règles d'écriture de `comparables` et de `stream_estate_results` vérifient que le
--      dossier appartient à l'agence, comme `live_seller_responses` ;
--   2. les réglages de recherche par défaut d'un conseiller (`profiles.search_defaults`), écrits
--      par le serveur seul : la colonne n'entre pas dans la liste des colonnes modifiables (M88) ;
--   3. la date de première relance, posée à la conclusion « à relancer »
--      (`project_meeting_conclusions.next_follow_up_on`).
--
-- Compatible avec le code de `main` : il n'écrit jamais un concurrent ni un résultat payé sur le
-- dossier d'une autre agence ; il ne lit ni n'écrit les deux colonnes nouvelles ; il appelle
-- `conclude_meeting` avec 15 arguments nommés et `change_meeting_outcome` avec 8, et le nouveau
-- paramètre a une valeur par défaut (sans date fournie, un dossier « à relancer » garde la sienne).

-- ---------------------------------------------------------------------------------------------
-- 1. Le dossier de la même agence.
-- ---------------------------------------------------------------------------------------------
do $$
declare v_foreign integer;
begin
  select count(*) into v_foreign
  from public.comparables c join public.projects p on p.id = c.project_id
  where p.agency_id <> c.agency_id;
  if v_foreign > 0 then
    raise exception 'comparables : % concurrent(s) rattaché(s) au dossier d''une autre agence', v_foreign;
  end if;
  select count(*) into v_foreign
  from public.stream_estate_results r join public.projects p on p.id = r.project_id
  where p.agency_id <> r.agency_id;
  if v_foreign > 0 then
    raise exception 'stream_estate_results : % résultat(s) rattaché(s) au dossier d''une autre agence', v_foreign;
  end if;
end $$;

drop policy comparables_agency_isolation on public.comparables;

create policy comparables_agency_isolation on public.comparables
  for all
  to authenticated
  using (
    agency_id = public.get_current_agency_id()
    and exists (select 1 from public.projects p
                where p.id = project_id and p.agency_id = public.get_current_agency_id()))
  with check (
    agency_id = public.get_current_agency_id()
    and exists (select 1 from public.projects p
                where p.id = project_id and p.agency_id = public.get_current_agency_id()));

drop policy stream_estate_results_agency on public.stream_estate_results;

create policy stream_estate_results_agency on public.stream_estate_results
  for all
  to authenticated
  using (
    agency_id = public.get_current_agency_id()
    and exists (select 1 from public.projects p
                where p.id = project_id and p.agency_id = public.get_current_agency_id()))
  with check (
    agency_id = public.get_current_agency_id()
    and exists (select 1 from public.projects p
                where p.id = project_id and p.agency_id = public.get_current_agency_id()));

-- ---------------------------------------------------------------------------------------------
-- 2. Les réglages de recherche par défaut du conseiller. Null = ceux de l'outil. Recopiés dans
--    `projects.search_settings` à la création d'un dossier ; les dossiers existants ne changent pas.
-- ---------------------------------------------------------------------------------------------
alter table public.profiles
  add column search_defaults jsonb
    check (search_defaults is null
           or (jsonb_typeof(search_defaults) = 'object' and pg_column_size(search_defaults) <= 4000));

comment on column public.profiles.search_defaults is
  'Réglages de recherche par défaut du conseiller (mission 108), écrits par le serveur seul. Null = ceux de l''outil.';

-- ---------------------------------------------------------------------------------------------
-- 3. La date de première relance, posée à la conclusion « à relancer » (règles de M105 : un mois
--    pour « Réfléchit au prix », sept jours sinon, modifiable). Elle tombe quand le dossier n'est
--    plus à relancer. Les relances suivantes portent leur propre date (`follow_up_contacts`).
-- ---------------------------------------------------------------------------------------------
alter table public.project_meeting_conclusions
  add column next_follow_up_on date,
  add constraint pmc_next_follow_up_only_follow_up
    check (next_follow_up_on is null or outcome = 'follow_up');

comment on column public.project_meeting_conclusions.next_follow_up_on is
  'Date de la première relance, posée à la conclusion « à relancer » (mission 108).';

drop function public.conclude_meeting(
  uuid, uuid, text, text, numeric, numeric, numeric, numeric, numeric, numeric, integer, integer,
  text, text, text);

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
  p_next_follow_up_on date default null
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
  -- Mission 108 — la date de première relance, pour « à relancer » seulement.
  v_next := case when p_outcome = 'follow_up' then p_next_follow_up_on end;

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
     mandate_type, signed_at, concluded_at, outcome_changed_at)
  values
    (p_project_id, p_agency_id, p_price, p_market_computed, p_advisor_analysis, p_advisor_price,
     p_seller_wanted, p_seller_perceived, p_retained, p_exploitable,
     public.meeting_duration_seconds(p_project_id),
     v_readiness_first, v_readiness_last, v_readiness_missing,
     p_outcome, v_reason, v_motive, v_motive_detail, v_next, v_mandate_type,
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
    -- Une date fournie remplace l'ancienne ; sans date fournie, un dossier « à relancer » garde
    -- la sienne. Elle tombe quand le dossier n'est plus à relancer.
    next_follow_up_on = case
      when excluded.outcome = 'follow_up' then coalesce(excluded.next_follow_up_on, c.next_follow_up_on)
      else null
    end,
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
  text, text, text, date)
  from public, anon, authenticated;
grant execute on function public.conclude_meeting(
  uuid, uuid, text, text, numeric, numeric, numeric, numeric, numeric, numeric, integer, integer,
  text, text, text, date)
  to service_role;

drop function public.change_meeting_outcome(uuid, uuid, text, text, text, numeric, text, text);

create function public.change_meeting_outcome(
  p_project_id uuid,
  p_agency_id uuid,
  p_outcome text,
  p_reason text,
  p_mandate_type text default null,
  p_price numeric default null,
  p_follow_up_motive text default null,
  p_follow_up_motive_detail text default null,
  p_next_follow_up_on date default null
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

revoke all on function public.change_meeting_outcome(uuid, uuid, text, text, text, numeric, text, text, date)
  from public, anon, authenticated;
grant execute on function public.change_meeting_outcome(uuid, uuid, text, text, text, numeric, text, text, date)
  to service_role;
