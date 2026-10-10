-- Mission 85 — Après le prix, une question qui aide à signer.
--
-- Juste après le prix de commercialisation, le vendeur se situe sur une échelle de 1 à 10 :
-- « où en êtes-vous pour lancer la vente à ce prix ? ». On garde TROIS faits :
--   • la PREMIÈRE note donnée (le point de départ, avant de traiter l'objection) ;
--   • la DERNIÈRE note (celle à laquelle le rendez-vous s'achève) ;
--   • ce qui manquerait au vendeur pour être à 10 (sa réponse, facultative).
-- Ils vivent dans le résumé du Live (live_seller_summary), puis sont FIGÉS à la conclusion
-- avec le même patron que la valeur perçue (M56 : COALESCE, jamais réécrit).
--
-- Compatible avec le code de `main` : six colonnes nullables de plus, aucune ligne écrite,
-- et `conclude_meeting` garde sa signature à 12 arguments (CREATE OR REPLACE, privilèges
-- préservés) — les trois faits sont lus par la fonction dans le résumé du Live, comme la
-- durée du rendez-vous, et non passés par l'appelant.

alter table public.live_seller_summary
  add column seller_launch_readiness_first smallint
    check (seller_launch_readiness_first is null or seller_launch_readiness_first between 1 and 10),
  add column seller_launch_readiness_last smallint
    check (seller_launch_readiness_last is null or seller_launch_readiness_last between 1 and 10),
  add column seller_launch_readiness_missing text
    check (seller_launch_readiness_missing is null
           or char_length(seller_launch_readiness_missing) <= 2000);

alter table public.project_meeting_conclusions
  add column frozen_launch_readiness_first smallint
    check (frozen_launch_readiness_first is null or frozen_launch_readiness_first between 1 and 10),
  add column frozen_launch_readiness_last smallint
    check (frozen_launch_readiness_last is null or frozen_launch_readiness_last between 1 and 10),
  add column frozen_launch_readiness_missing text;

-- La première note ne se réécrit jamais : une fois posée, elle reste, quoi qu'envoie le
-- navigateur ; tant qu'elle manque, elle vaut la note du moment. C'est ce qui permet de
-- lire « 7/10 → 10/10 » même si le chiffre a été touché plusieurs fois.
create function public.keep_first_launch_readiness() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.seller_launch_readiness_first is not null then
    new.seller_launch_readiness_first := old.seller_launch_readiness_first;
  elsif new.seller_launch_readiness_first is null then
    new.seller_launch_readiness_first := new.seller_launch_readiness_last;
  end if;
  return new;
end;
$$;

create trigger live_seller_summary_keep_first_launch_readiness
  before insert or update on public.live_seller_summary
  for each row execute function public.keep_first_launch_readiness();

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
  v_readiness_first smallint;
  v_readiness_last smallint;
  v_readiness_missing text;
begin
  if p_outcome not in ('signed', 'follow_up', 'sold_elsewhere', 'withdrawn') then
    raise exception 'conclude_meeting: issue invalide %', p_outcome;
  end if;

  -- Mission 85 — la note du vendeur, lue ici à l'instant du figeage. Absente reste absente.
  select s.seller_launch_readiness_first, s.seller_launch_readiness_last,
         s.seller_launch_readiness_missing
    into v_readiness_first, v_readiness_last, v_readiness_missing
    from public.live_seller_summary s
    where s.project_id = p_project_id and s.agency_id = p_agency_id;

  insert into public.project_meeting_conclusions
    (project_id, agency_id, commercialization_price, frozen_market_computed,
     frozen_advisor_analysis, frozen_advisor_price, frozen_seller_wanted_price,
     frozen_seller_perceived_price, frozen_retained_competitors, frozen_exploitable_competitors,
     frozen_meeting_duration_seconds,
     frozen_launch_readiness_first, frozen_launch_readiness_last, frozen_launch_readiness_missing,
     outcome, follow_up_reason, concluded_at, outcome_changed_at)
  values
    (p_project_id, p_agency_id, p_price, p_market_computed, p_advisor_analysis, p_advisor_price,
     p_seller_wanted, p_seller_perceived, p_retained, p_exploitable,
     -- Durée CALCULÉE ici, à l'instant du figeage, depuis les horodatages courants.
     public.meeting_duration_seconds(p_project_id),
     v_readiness_first, v_readiness_last, v_readiness_missing,
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
    frozen_launch_readiness_first = coalesce(project_meeting_conclusions.frozen_launch_readiness_first, excluded.frozen_launch_readiness_first),
    frozen_launch_readiness_last = coalesce(project_meeting_conclusions.frozen_launch_readiness_last, excluded.frozen_launch_readiness_last),
    frozen_launch_readiness_missing = coalesce(project_meeting_conclusions.frozen_launch_readiness_missing, excluded.frozen_launch_readiness_missing),
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
