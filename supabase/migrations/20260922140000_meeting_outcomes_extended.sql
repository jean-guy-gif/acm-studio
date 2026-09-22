-- Mission 54 — Le Suivi qui sert : quatre issues, et l'issue devient modifiable.
--
-- On ajoute deux issues (« vendu ailleurs », « retiré de la vente ») et on rend l'issue
-- MODIFIABLE depuis le Suivi. Règle M53 tenue : `projects.status` reste `meeting_completed`
-- pour les quatre issues — aucune valeur d'enum de statut à créer. Les quatre montants
-- figés sont de l'HISTOIRE : changer l'issue ne les recalcule jamais.

-- 1) Quatre issues au lieu de deux.
alter table public.project_meeting_conclusions
  drop constraint project_meeting_conclusions_outcome_check;
alter table public.project_meeting_conclusions
  add constraint project_meeting_conclusions_outcome_check
  check (outcome is null or outcome in ('signed', 'follow_up', 'sold_elsewhere', 'withdrawn'));

-- 2) Deux dates distinctes : `concluded_at` (le rendez-vous) et `outcome_changed_at` (le
-- dernier changement d'issue). Colonne TOUJOURS présente (jamais nullable) : les requêtes
-- futures (« issue non bougée depuis 60 jours ») se trient et filtrent sans COALESCE. Une
-- colonne nullable pour servir une règle d'affichage, ce serait l'affichage qui fuit dans
-- le schéma. C'est l'AFFICHAGE qui se tait si les deux dates coïncident.
alter table public.project_meeting_conclusions add column outcome_changed_at timestamptz;
-- Rattrapage : à l'initialisation, la date de changement = la date de conclusion (ou, pour
-- une ligne prix-seul pas encore conclue, sa création).
update public.project_meeting_conclusions
  set outcome_changed_at = coalesce(concluded_at, created_at, now());
alter table public.project_meeting_conclusions alter column outcome_changed_at set not null;
alter table public.project_meeting_conclusions alter column outcome_changed_at set default now();

-- 3) conclude_meeting : guard élargi aux quatre issues, et pose de `outcome_changed_at`
-- (= now(), donc = concluded_at à la première conclusion : deux dates égales, l'affichage
-- n'en montre qu'une). Le reste (figeage COALESCE, bascule status gardée) est inchangé.
create or replace function public.conclude_meeting(
  p_project_id uuid,
  p_agency_id uuid,
  p_outcome text,
  p_reason text,
  p_price numeric,
  p_market_computed numeric,
  p_advisor_analysis numeric,
  p_advisor_price numeric
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
     frozen_advisor_analysis, frozen_advisor_price, outcome, follow_up_reason,
     concluded_at, outcome_changed_at)
  values
    (p_project_id, p_agency_id, p_price, p_market_computed, p_advisor_analysis, p_advisor_price,
     p_outcome, case when p_outcome = 'follow_up' then p_reason else null end, now(), now())
  on conflict (project_id) do update set
    outcome = excluded.outcome,
    follow_up_reason = case when excluded.outcome = 'follow_up' then excluded.follow_up_reason else null end,
    commercialization_price = coalesce(project_meeting_conclusions.commercialization_price, excluded.commercialization_price),
    frozen_market_computed  = coalesce(project_meeting_conclusions.frozen_market_computed, excluded.frozen_market_computed),
    frozen_advisor_analysis = coalesce(project_meeting_conclusions.frozen_advisor_analysis, excluded.frozen_advisor_analysis),
    frozen_advisor_price    = coalesce(project_meeting_conclusions.frozen_advisor_price, excluded.frozen_advisor_price),
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

-- 4) change_meeting_outcome — l'acte NORMAL du suivi : changer l'issue d'un dossier déjà
-- conclu. N'écrit QUE l'issue, le motif et la date de changement. Ne touche JAMAIS les
-- montants figés (l'histoire du rendez-vous), ni `commercialization_price`, ni
-- `projects.status`. Un `update` qui repasserait par le figeage réécrirait l'histoire —
-- c'est le défaut à ne pas commettre.
create or replace function public.change_meeting_outcome(
  p_project_id uuid,
  p_agency_id uuid,
  p_outcome text,
  p_reason text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  if p_outcome not in ('signed', 'follow_up', 'sold_elsewhere', 'withdrawn') then
    raise exception 'change_meeting_outcome: issue invalide %', p_outcome;
  end if;

  update public.project_meeting_conclusions
    set outcome = p_outcome,
        follow_up_reason = case when p_outcome = 'follow_up' then p_reason else null end,
        outcome_changed_at = now(),
        updated_at = now()
    where project_id = p_project_id
      and agency_id = p_agency_id;
  get diagnostics v_updated = row_count;

  return v_updated > 0;
end;
$$;

-- Exécution réservée au service role (écritures via Server Action, après autorisation).
revoke all on function public.change_meeting_outcome(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.change_meeting_outcome(uuid, uuid, text, text) to service_role;
