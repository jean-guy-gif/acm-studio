-- Mission 111 — les chiffres justes (audit n°7, corrections P1). Aucune ligne existante modifiée :
--   A. `conclude_meeting` : quand la ligne de conclusion a été créée par la seule saisie du prix au
--      Live (sans issue), la première issue enregistrée devient celle de la conclusion — elle
--      restait vide pour toujours, et le mandat était compté en « parcours inconnu ». Une première
--      issue déjà posée ne se réécrit jamais. Rattrapage : aucune conclusion n'a une issue sans
--      première issue (0 le 21/10) ; la migration recompte et s'arrête s'il en apparaît une.
--   D. `save_commercialization_price` : refusée hors « en préparation » et « prêt » — un onglet du
--      Live resté ouvert ne remplace plus le prix d'un dossier conclu (M109). La conclusion et
--      « Changer l'issue » écrivent ce prix par leurs propres fonctions (M90), inchangées.
--   G. Les règles d'écriture de `subject_properties` et de `competitor_prospecting_files`
--      vérifient que le dossier (et le concurrent) appartiennent à l'agence, comme `comparables`
--      depuis la M108. Arrêt si une ligne existante est rattachée à une autre agence (0 le 21/10).
--
-- Compatible avec le code de `main` : mêmes signatures ; `main` n'appelle la fonction du prix que
-- depuis le Live, qui refuse déjà d'écrire sur un dossier conclu (M109) ; il n'écrit jamais un bien
-- ni un courrier sur le dossier d'une autre agence.

-- ---------------------------------------------------------------------------------------------
-- Comptages d'arrêt.
-- ---------------------------------------------------------------------------------------------
do $$
declare v_count int;
begin
  select count(*) into v_count from public.project_meeting_conclusions
    where outcome is not null and first_outcome is null;
  if v_count > 0 then
    raise exception 'conclusions avec issue mais sans première issue : % (règle de rattrapage à soumettre)', v_count;
  end if;
  select count(*) into v_count from public.subject_properties sp
    join public.projects p on p.id = sp.project_id
    where p.agency_id <> sp.agency_id;
  if v_count > 0 then
    raise exception 'subject_properties : % bien(s) rattaché(s) au dossier d''une autre agence', v_count;
  end if;
  select count(*) into v_count from public.competitor_prospecting_files f
    join public.comparables c on c.id = f.comparable_id
    join public.projects p on p.id = f.project_id
    where c.agency_id <> f.agency_id or p.agency_id <> f.agency_id or c.project_id <> f.project_id;
  if v_count > 0 then
    raise exception 'competitor_prospecting_files : % courrier(s) rattaché(s) à une autre agence', v_count;
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- A. La première issue.
-- ---------------------------------------------------------------------------------------------
create or replace function public.conclude_meeting(
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
     objections, objection_note, first_outcome, went_through_follow_up,
     mandate_type, signed_at, concluded_at, outcome_changed_at)
  values
    (p_project_id, p_agency_id, p_price, p_market_computed, p_advisor_analysis, p_advisor_price,
     p_seller_wanted, p_seller_perceived, p_retained, p_exploitable,
     public.meeting_duration_seconds(p_project_id),
     v_readiness_first, v_readiness_last, v_readiness_missing,
     p_outcome, v_reason, v_motive, v_motive_detail, v_next,
     coalesce(p_objections, '{}'), v_note, p_outcome, p_outcome = 'follow_up',
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
    -- Mission 110 — le parcours : la première issue ne se réécrit jamais ; le passage par « à
    -- relancer » ne s'efface jamais.
    -- Mission 111 — une ligne créée par la seule saisie du prix au Live n'a pas encore d'issue :
    -- la première issue enregistrée est alors celle de cette conclusion.
    first_outcome = coalesce(c.first_outcome, case when c.outcome is null then excluded.outcome end),
    went_through_follow_up = c.went_through_follow_up or excluded.outcome = 'follow_up',
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

-- ---------------------------------------------------------------------------------------------
-- D. Le prix de commercialisation, seulement tant que le rendez-vous n'est pas conclu.
-- ---------------------------------------------------------------------------------------------
create or replace function public.save_commercialization_price(
  p_project_id uuid,
  p_agency_id uuid,
  p_price numeric,
  p_market_computed numeric,
  p_advisor_analysis numeric,
  p_advisor_price numeric
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.projects p
    where p.id = p_project_id
      and p.agency_id = p_agency_id
      and p.status in ('draft', 'ready_for_meeting')
  ) then
    raise exception 'live_closed';
  end if;
  insert into public.project_meeting_conclusions
    (project_id, agency_id, commercialization_price,
     frozen_market_computed, frozen_advisor_analysis, frozen_advisor_price)
  values
    (p_project_id, p_agency_id, p_price, p_market_computed, p_advisor_analysis, p_advisor_price)
  on conflict (project_id) do update set
    commercialization_price = excluded.commercialization_price,
    frozen_market_computed  = coalesce(project_meeting_conclusions.frozen_market_computed, excluded.frozen_market_computed),
    frozen_advisor_analysis = coalesce(project_meeting_conclusions.frozen_advisor_analysis, excluded.frozen_advisor_analysis),
    frozen_advisor_price    = coalesce(project_meeting_conclusions.frozen_advisor_price, excluded.frozen_advisor_price),
    updated_at = now();
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- G. Le dossier (et le concurrent) de la même agence.
-- ---------------------------------------------------------------------------------------------
drop policy subject_properties_agency_isolation on public.subject_properties;

create policy subject_properties_agency_isolation on public.subject_properties
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

drop policy competitor_prospecting_files_agency_isolation on public.competitor_prospecting_files;

create policy competitor_prospecting_files_agency_isolation on public.competitor_prospecting_files
  for all
  to authenticated
  using (
    agency_id = public.get_current_agency_id()
    and exists (select 1 from public.comparables c
                where c.id = competitor_prospecting_files.comparable_id
                  and c.project_id = competitor_prospecting_files.project_id
                  and c.agency_id = public.get_current_agency_id()))
  with check (
    agency_id = public.get_current_agency_id()
    and exists (select 1 from public.comparables c
                where c.id = competitor_prospecting_files.comparable_id
                  and c.project_id = competitor_prospecting_files.project_id
                  and c.agency_id = public.get_current_agency_id()));
