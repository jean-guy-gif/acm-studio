-- Mission 56 — Capter avant de perdre.
--
-- Une donnée non figée le jour du rendez-vous est perdue pour toujours. La M53 fige quatre
-- montants ; on en ajoute QUATRE, au même instant, avec le même patron définitif (COALESCE,
-- jamais réécrit). Huit valeurs figées en tout. Aucun écran : on capte, c'est tout.
--
-- Les quatre nouvelles :
--   • le prix SOUHAITÉ par le vendeur au départ (project_price_positionings.seller_price,
--     modifiable après coup) — le point de départ du mouvement ;
--   • la valeur PERÇUE par le vendeur pendant le Live (live_seller_summary, modifiable) —
--     le point d'arrivée de la pédagogie, avant la négociation ;
--   • le nombre de concurrents RETENUS (is_selected) — le nombre humain, « votre bien face
--     à N concurrents », celui qu'on dit à l'oral ;
--   • le nombre de concurrents EXPLOITABLES (retenus + prix > 0 + surface > 0) — le nombre
--     technique, celui qui a réellement produit frozen_market_computed.
-- Les deux comptes s'érodent quand un concurrent est supprimé du dossier.

alter table public.project_meeting_conclusions
  add column frozen_seller_wanted_price numeric
    check (frozen_seller_wanted_price is null or frozen_seller_wanted_price > 0),
  add column frozen_seller_perceived_price numeric
    check (frozen_seller_perceived_price is null or frozen_seller_perceived_price > 0),
  add column frozen_retained_competitors integer
    check (frozen_retained_competitors is null or frozen_retained_competitors >= 0),
  add column frozen_exploitable_competitors integer
    check (frozen_exploitable_competitors is null or frozen_exploitable_competitors >= 0);

-- conclude_meeting gagne quatre paramètres, figés au MÊME instant que les quatre montants,
-- même COALESCE. Les quatre nouveaux ont un DEFAULT null : un appel à 8 arguments (le code
-- actuellement déployé) reste résolu vers cette fonction (les 4 nouveaux valent null), et
-- un appel à 12 arguments (le nouveau code) fige les huit. La migration est donc INOFFENSIVE
-- sur le code en place — pas de fenêtre où une conclusion casse pendant le déploiement.
-- La signature change → on remplace la fonction (drop + create).
drop function if exists public.conclude_meeting(uuid, uuid, text, text, numeric, numeric, numeric, numeric);

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
     outcome, follow_up_reason, concluded_at, outcome_changed_at)
  values
    (p_project_id, p_agency_id, p_price, p_market_computed, p_advisor_analysis, p_advisor_price,
     p_seller_wanted, p_seller_perceived, p_retained, p_exploitable,
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

revoke all on function public.conclude_meeting(uuid, uuid, text, text, numeric, numeric, numeric, numeric, numeric, numeric, integer, integer) from public, anon, authenticated;
grant execute on function public.conclude_meeting(uuid, uuid, text, text, numeric, numeric, numeric, numeric, numeric, numeric, integer, integer) to service_role;

-- Rattrapage — dernier moment où ces valeurs sont vraies. On capte les conclusions
-- existantes (issue posée) depuis les valeurs COURANTES, COALESCE (jamais par-dessus un
-- déjà-figé). Ne touche AUCUN des quatre montants déjà figés. Une valeur absente reste
-- absente (prix null → null) ; un compte est toujours un entier (0 si plus aucun concurrent).
update public.project_meeting_conclusions c set
  frozen_seller_wanted_price = coalesce(
    c.frozen_seller_wanted_price,
    (select pp.seller_price from public.project_price_positionings pp where pp.project_id = c.project_id)),
  frozen_seller_perceived_price = coalesce(
    c.frozen_seller_perceived_price,
    (select s.seller_perceived_property_price from public.live_seller_summary s where s.project_id = c.project_id)),
  frozen_retained_competitors = coalesce(
    c.frozen_retained_competitors,
    (select count(*)::int from public.comparables k where k.project_id = c.project_id and k.is_selected)),
  frozen_exploitable_competitors = coalesce(
    c.frozen_exploitable_competitors,
    (select count(*)::int from public.comparables k
       where k.project_id = c.project_id and k.is_selected and k.price > 0 and k.surface_area > 0))
where c.outcome is not null;
