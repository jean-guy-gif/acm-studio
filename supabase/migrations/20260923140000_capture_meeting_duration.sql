-- Mission 56 (suite) — Capter avant de perdre : la durée d'engagement du vendeur.
--
-- Neuvième valeur figée, dans le même esprit que les huit de 20260923120000 : une durée
-- non figée le jour du rendez-vous est perdue pour toujours. On la CALCULE à l'instant de
-- la conclusion, depuis les horodatages courants, et on la fige (COALESCE, jamais réécrite).
-- On ne la DÉRIVE jamais à la lecture : les horodatages s'érodent (un concurrent supprimé,
-- une réponse rejouée déplacent les bornes), la valeur figée, elle, reste vraie.
--
-- Pourquoi une SECONDE migration plutôt que d'amender 20260923120000 : cette dernière est
-- déjà appliquée sur staging. L'éditer ne la rejouerait pas (le suivi de version la croit à
-- jour) et ferait DÉRIVER le contenu d'une migration déjà passée — pire que deux fichiers.
-- Une migration en propre, jouée une seule fois, atteint staging par « db push ». Même idée,
-- même passe, même commit que la 56 ; deux fichiers seulement parce que l'un est déjà en base.
--
-- L'intervalle : première interaction vendeur → dernière interaction vendeur. Les bornes
-- viennent UNIQUEMENT des tables du Live (live_seller_responses, live_seller_summary), toutes
-- deux écrites seulement pendant le Live — jamais pendant la préparation du dossier. Jamais
-- concluded_at (qui peut suivre le Live de plusieurs heures) comme borne haute.
--
-- Note pour l'agrégation (V2) : un rendez-vous interrompu et repris le lendemain donnera
-- ~24 h ; la reprise d'un dossier des semaines plus tard, davantage encore. Ces valeurs sont
-- RÉELLES mais aberrantes pour un « temps de rendez-vous » : à l'agrégation, médiane plutôt
-- que moyenne, et écart des valeurs hors bornes plausibles. On fige la vérité brute ici.

alter table public.project_meeting_conclusions
  add column frozen_meeting_duration_seconds integer
    check (frozen_meeting_duration_seconds is null or frozen_meeting_duration_seconds >= 0);

-- Durée d'engagement = max(updated_at) − min(created_at) sur toutes les interactions vendeur
-- du dossier. Aucune interaction → null (rien à figer, pas 0). greatest(0, …) barre tout
-- négatif né d'un horodatage incohérent.
create or replace function public.meeting_duration_seconds(p_project_id uuid)
returns integer
language sql
stable
set search_path = public
as $$
  with interactions as (
    select created_at, updated_at from public.live_seller_responses where project_id = p_project_id
    union all
    select created_at, updated_at from public.live_seller_summary where project_id = p_project_id
  )
  select case
    when count(*) = 0 then null
    else greatest(0, extract(epoch from (max(updated_at) - min(created_at)))::int)
  end
  from interactions;
$$;

-- conclude_meeting garde sa signature à 12 arguments (inchangée depuis la 56) : on remplace
-- seulement son CORPS pour figer la durée au même instant que les huit autres, même COALESCE.
-- Pas de drop : CREATE OR REPLACE sur signature identique, les privilèges sont préservés.
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
      and status = 'ready_for_meeting';
  get diagnostics v_updated = row_count;

  return v_updated > 0;
end;
$$;

-- Aucun rattrapage. Les trois conclusions déjà en base restent à NULL sur la durée : leurs
-- horodatages de Live datent de semaines (données de test staging) et produiraient des durées
-- aberrantes. Figer une durée fausse serait inventer un fait ; on préfère l'absence.
