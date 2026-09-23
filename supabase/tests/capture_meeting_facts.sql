-- Mission 56 — les huit valeurs figées, testées à la SOURCE DE VÉRITÉ.
--   §8.1 les 4 nouvelles figées à la conclusion, POUR LES QUATRE ISSUES ;
--   §8.2 une valeur absente reste absente (rien d'inventé) ;
--   §8.3 modifier le dossier après ne change AUCUNE des huit figées ;
--   §8.4 le rattrapage capte l'existant sans toucher aux quatre montants déjà figés.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/capture_meeting_facts.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111');
insert into public.agencies (id, name) values ('aaaaaaaa-0000-0000-0000-000000000000', 'A');
insert into public.profiles (id, agency_id, first_name, last_name, email, role)
  values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000000',
          'Al', 'A', 'a@t.l', 'owner');

-- =====================================================================
-- §8.1 — les quatre nouvelles valeurs sont figées, pour LES QUATRE ISSUES.
-- =====================================================================
do $$
declare
  v_outcome text;
  v_pid uuid;
  r public.project_meeting_conclusions%rowtype;
begin
  foreach v_outcome in array array['signed', 'follow_up', 'sold_elsewhere', 'withdrawn'] loop
    v_pid := gen_random_uuid();
    insert into public.projects (id, agency_id, advisor_id, seller_name, status)
      values (v_pid, 'aaaaaaaa-0000-0000-0000-000000000000',
              '11111111-1111-1111-1111-111111111111', v_outcome, 'ready_for_meeting');

    perform public.conclude_meeting(
      v_pid, 'aaaaaaaa-0000-0000-0000-000000000000', v_outcome,
      case when v_outcome = 'follow_up' then 'motif' else null end,
      512000, 500000, 372000, 498765, -- prix + ①②③
      555000, 400000, 5, 3);          -- souhaité, perçu, retenus, exploitables

    select * into r from public.project_meeting_conclusions where project_id = v_pid;
    if r.frozen_seller_wanted_price <> 555000
       or r.frozen_seller_perceived_price <> 400000
       or r.frozen_retained_competitors <> 5
       or r.frozen_exploitable_competitors <> 3 then
      raise exception 'FAIL 8.1 [%]: quatre faits non figés (%, %, %, %)', v_outcome,
        r.frozen_seller_wanted_price, r.frozen_seller_perceived_price,
        r.frozen_retained_competitors, r.frozen_exploitable_competitors;
    end if;
    if (select status from public.projects where id = v_pid) is distinct from 'meeting_completed' then
      raise exception 'FAIL 8.1 [%]: status non meeting_completed', v_outcome;
    end if;
  end loop;
end $$;

-- =====================================================================
-- §8.2 — une valeur absente le jour du rendez-vous reste absente.
-- =====================================================================
do $$
declare r public.project_meeting_conclusions%rowtype;
begin
  insert into public.projects (id, agency_id, advisor_id, seller_name, status)
    values ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000',
            '11111111-1111-1111-1111-111111111111', 'Absent', 'ready_for_meeting');
  -- Le vendeur n'a pas donné sa valeur perçue ni son prix souhaité : null.
  perform public.conclude_meeting(
    'cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000',
    'follow_up', 'motif', null, 500000, null, 498765, null, null, 4, 2);

  select * into r from public.project_meeting_conclusions
    where project_id = 'cccccccc-0000-0000-0000-000000000002';
  if r.frozen_seller_wanted_price is not null or r.frozen_seller_perceived_price is not null then
    raise exception 'FAIL 8.2: une valeur absente a été inventée';
  end if;
  -- Les comptes, eux, sont bien présents.
  if r.frozen_retained_competitors <> 4 or r.frozen_exploitable_competitors <> 2 then
    raise exception 'FAIL 8.2: comptes incorrects';
  end if;
end $$;

-- =====================================================================
-- §8.3 — modifier le dossier APRÈS la conclusion ne change AUCUNE des huit figées.
-- =====================================================================
insert into public.projects (id, agency_id, advisor_id, seller_name, status)
  values ('cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000000',
          '11111111-1111-1111-1111-111111111111', 'Stable', 'ready_for_meeting');
select public.conclude_meeting(
  'cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000000',
  'signed', null, 512000, 500000, 372000, 498765, 555000, 400000, 6, 4);

-- On change l'issue ET on modifie les sources (positionnement, résumé, concurrents).
select public.change_meeting_outcome(
  'cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000000',
  'sold_elsewhere', null);

do $$
declare r public.project_meeting_conclusions%rowtype;
begin
  select * into r from public.project_meeting_conclusions
    where project_id = 'cccccccc-0000-0000-0000-000000000003';
  if r.outcome <> 'sold_elsewhere' then
    raise exception 'FAIL 8.3: l''issue n''a pas changé';
  end if;
  -- Les HUIT figées, toutes intactes après le changement d'issue.
  if r.commercialization_price <> 512000
     or r.frozen_market_computed <> 500000
     or r.frozen_advisor_analysis <> 372000
     or r.frozen_advisor_price <> 498765
     or r.frozen_seller_wanted_price <> 555000
     or r.frozen_seller_perceived_price <> 400000
     or r.frozen_retained_competitors <> 6
     or r.frozen_exploitable_competitors <> 4 then
    raise exception 'FAIL 8.3: une valeur figée a bougé en changeant l''issue';
  end if;
end $$;

-- =====================================================================
-- §8.4 — le rattrapage capte les conclusions existantes depuis les valeurs COURANTES,
-- sans toucher aux quatre montants déjà figés. On simule une conclusion « pré-M56 » :
-- les quatre nouvelles colonnes à null, les quatre montants déjà figés.
-- =====================================================================
insert into public.projects (id, agency_id, advisor_id, seller_name, status)
  values ('cccccccc-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000000',
          '11111111-1111-1111-1111-111111111111', 'Rattrapage', 'ready_for_meeting');
-- Données courantes du dossier (ce que le rattrapage doit capter).
insert into public.project_price_positionings
  (project_id, agency_id, advisor_price, seller_price, range_low, range_central, range_high,
   confidence_score, confidence_level, calculation_snapshot, validated_by)
  values ('cccccccc-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000000',
          498765, 333000, 300000, 350000, 400000, 70, 'medium', '{}'::jsonb,
          '11111111-1111-1111-1111-111111111111');
-- Résumé horodaté : première interaction ~40 min avant, dernière ~5 min avant → ~35 min.
insert into public.live_seller_summary
  (project_id, agency_id, seller_perceived_property_price, created_at, updated_at)
  values ('cccccccc-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000000', 222000,
          now() - interval '40 minutes', now() - interval '5 minutes');
insert into public.comparables (project_id, agency_id, price, surface_area, is_selected, display_order) values
  ('cccccccc-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000000', 300000, 60, true, 1),
  ('cccccccc-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000000', 310000, 62, true, 2),
  ('cccccccc-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000000', 320000, null, true, 3); -- retenu, non exploitable

-- Une ligne de conclusion « pré-M56 » : les 4 montants figés, les 4 nouvelles à null.
insert into public.project_meeting_conclusions
  (project_id, agency_id, commercialization_price, frozen_market_computed,
   frozen_advisor_analysis, frozen_advisor_price, outcome, concluded_at, outcome_changed_at)
  values ('cccccccc-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000000',
          512000, 500000, 372000, 498765, 'signed', now(), now());

-- Le rattrapage (textuellement celui de la migration).
update public.project_meeting_conclusions c set
  frozen_seller_wanted_price = coalesce(c.frozen_seller_wanted_price,
    (select pp.seller_price from public.project_price_positionings pp where pp.project_id = c.project_id)),
  frozen_seller_perceived_price = coalesce(c.frozen_seller_perceived_price,
    (select s.seller_perceived_property_price from public.live_seller_summary s where s.project_id = c.project_id)),
  frozen_retained_competitors = coalesce(c.frozen_retained_competitors,
    (select count(*)::int from public.comparables k where k.project_id = c.project_id and k.is_selected)),
  frozen_exploitable_competitors = coalesce(c.frozen_exploitable_competitors,
    (select count(*)::int from public.comparables k
       where k.project_id = c.project_id and k.is_selected and k.price > 0 and k.surface_area > 0))
where c.outcome is not null;

do $$
declare r public.project_meeting_conclusions%rowtype;
begin
  select * into r from public.project_meeting_conclusions
    where project_id = 'cccccccc-0000-0000-0000-000000000004';
  -- Capté depuis le courant : souhaité 333000, perçu 222000, retenus 3, exploitables 2.
  if r.frozen_seller_wanted_price <> 333000
     or r.frozen_seller_perceived_price <> 222000
     or r.frozen_retained_competitors <> 3
     or r.frozen_exploitable_competitors <> 2 then
    raise exception 'FAIL 8.4: rattrapage incorrect (%, %, %, %)',
      r.frozen_seller_wanted_price, r.frozen_seller_perceived_price,
      r.frozen_retained_competitors, r.frozen_exploitable_competitors;
  end if;
  -- La durée N'EST PAS rattrapée : malgré des horodatages présents, elle reste NULL sur une
  -- conclusion existante (on ne fige pas une durée qui n'a jamais été vraie).
  if r.frozen_meeting_duration_seconds is not null then
    raise exception 'FAIL 8.4: le rattrapage a figé une durée (attendu NULL) : %', r.frozen_meeting_duration_seconds;
  end if;
  -- Les quatre montants déjà figés : INTACTS.
  if r.commercialization_price <> 512000
     or r.frozen_market_computed <> 500000
     or r.frozen_advisor_analysis <> 372000
     or r.frozen_advisor_price <> 498765 then
    raise exception 'FAIL 8.4: le rattrapage a touché un montant déjà figé';
  end if;
end $$;

-- =====================================================================
-- La durée (9e valeur) — CALCULÉE à la conclusion depuis les horodatages, jamais dérivée à
-- la lecture : quand un horodatage s'érode (on rejoue l'écran), la durée figée ne bouge pas.
-- =====================================================================
insert into public.projects (id, agency_id, advisor_id, seller_name, status)
  values ('cccccccc-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000000',
          '11111111-1111-1111-1111-111111111111', 'Duree', 'ready_for_meeting');
-- Première interaction 28 min avant, dernière 2 min avant → ~26 min = 1560 s.
insert into public.live_seller_summary
  (project_id, agency_id, seller_perceived_property_price, created_at, updated_at)
  values ('cccccccc-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000000', 400000,
          now() - interval '28 minutes', now() - interval '2 minutes');
select public.conclude_meeting(
  'cccccccc-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000000',
  'signed', null, 512000, 500000, 372000, 498765, 555000, 400000, 3, 3);

do $$
declare v_before int; v_after int;
begin
  select frozen_meeting_duration_seconds into v_before from public.project_meeting_conclusions
    where project_id = 'cccccccc-0000-0000-0000-000000000005';
  if v_before is null or v_before < 1500 or v_before > 1620 then
    raise exception 'FAIL durée: figée incorrecte à la conclusion (%)', v_before;
  end if;

  -- L'horodatage s'érode ET l'issue change : la durée FIGÉE ne doit pas bouger.
  update public.live_seller_summary
    set created_at = now() - interval '3 hours', updated_at = now()
    where project_id = 'cccccccc-0000-0000-0000-000000000005';
  perform public.change_meeting_outcome(
    'cccccccc-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000000', 'follow_up', 'motif');

  select frozen_meeting_duration_seconds into v_after from public.project_meeting_conclusions
    where project_id = 'cccccccc-0000-0000-0000-000000000005';
  if v_after is distinct from v_before then
    raise exception 'FAIL durée: la durée figée a bougé (dérivée à la lecture ?) % -> %', v_before, v_after;
  end if;
end $$;

do $$ begin raise notice 'ALL SCENARIOS PASSED'; end $$;

rollback;
