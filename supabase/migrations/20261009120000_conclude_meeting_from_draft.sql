-- Mission 81 — Un rendez-vous mené dans le Live se conclut toujours.
--
-- « Lancer le Live » est proposé quel que soit le statut du dossier : un rendez-vous peut
-- donc être réellement mené sur un dossier encore en préparation (`draft`). Jusqu'ici la
-- bascule vers le Suivi était gardée sur `ready_for_meeting` seul : conclure un `draft`
-- aurait écrit l'issue SANS déplacer le dossier — une issue hors du Suivi.
--
-- La bascule part désormais de `draft` OU de `ready_for_meeting` (liste d'autorisation),
-- toujours dans la même transaction que l'issue. `archived` (soft delete) n'est jamais
-- basculé ; `meeting_completed` reste en place (correction d'issue, retourne false).
--
-- Signature à 12 arguments INCHANGÉE (CREATE OR REPLACE, privilèges préservés) : seul le
-- corps change, et seulement la clause `status` du dernier UPDATE. Compatible avec le code
-- de `main`, qui refuse `draft` avant même d'appeler la fonction. Aucune donnée n'est
-- écrite par cette migration.
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
  p_exploitable integer default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  if p_outcome not in ('signed', 'follow_up', 'sold_elsewhere', 'withdrawn') then
    raise exception 'conclude_meeting: issue invalide %', p_outcome;
  end if;

  insert into public.project_meeting_conclusions
    (project_id, agency_id, commercialization_price, frozen_market_computed,
     frozen_advisor_analysis, frozen_advisor_price, frozen_seller_wanted_price,
     frozen_seller_perceived_price, frozen_retained_competitors, frozen_exploitable_competitors,
     frozen_meeting_duration_seconds,
     outcome, follow_up_reason, concluded_at, outcome_changed_at)
  values
    (p_project_id, p_agency_id, p_price, p_market_computed, p_advisor_analysis, p_advisor_price,
     p_seller_wanted, p_seller_perceived, p_retained, p_exploitable,
     -- Durée CALCULÉE ici, à l'instant du figeage, depuis les horodatages courants.
     public.meeting_duration_seconds(p_project_id),
     p_outcome, case when p_outcome = 'follow_up' then p_reason else null end, now(), now())
  on conflict (project_id) do update set
    outcome = excluded.outcome,
    follow_up_reason = case when excluded.outcome = 'follow_up' then excluded.follow_up_reason else null end,
    commercialization_price = coalesce(project_meeting_conclusions.commercialization_price, excluded.commercialization_price),
    frozen_market_computed  = coalesce(project_meeting_conclusions.frozen_market_computed, excluded.frozen_market_computed),
    frozen_advisor_analysis = coalesce(project_meeting_conclusions.frozen_advisor_analysis, excluded.frozen_advisor_analysis),
    frozen_advisor_price    = coalesce(project_meeting_conclusions.frozen_advisor_price, excluded.frozen_advisor_price),
    frozen_seller_wanted_price = coalesce(project_meeting_conclusions.frozen_seller_wanted_price, excluded.frozen_seller_wanted_price),
    frozen_seller_perceived_price = coalesce(project_meeting_conclusions.frozen_seller_perceived_price, excluded.frozen_seller_perceived_price),
    frozen_retained_competitors = coalesce(project_meeting_conclusions.frozen_retained_competitors, excluded.frozen_retained_competitors),
    frozen_exploitable_competitors = coalesce(project_meeting_conclusions.frozen_exploitable_competitors, excluded.frozen_exploitable_competitors),
    frozen_meeting_duration_seconds = coalesce(project_meeting_conclusions.frozen_meeting_duration_seconds, public.meeting_duration_seconds(p_project_id)),
    concluded_at = now(),
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
