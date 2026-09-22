-- Mission 54 — les quatre issues et l'issue modifiable, testées à la SOURCE DE VÉRITÉ.
--   §6.1 changer l'issue ne modifie AUCUN des quatre montants figés ;
--   §6.2 les quatre issues sont posables, et projects.status reste meeting_completed.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/meeting_outcomes.sql
-- Une transaction annulée. now() est FIGÉ sur la transaction : pour tester que la date de
-- changement d'issue diffère de celle du rendez-vous, on antidate concluded_at.

begin;

insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111');
insert into public.agencies (id, name) values ('aaaaaaaa-0000-0000-0000-000000000000', 'A');
insert into public.profiles (id, agency_id, first_name, last_name, email, role)
  values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000000',
          'Al', 'A', 'a@t.l', 'owner');
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111', 'P1', 'ready_for_meeting'),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111', 'P2', 'ready_for_meeting');

-- Conclusion « signé » avec les quatre montants.
select public.conclude_meeting(
  'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000',
  'signed', null, 500000, 520000, 480000, 510000);

-- On antidate le rendez-vous pour distinguer les deux dates.
update public.project_meeting_conclusions
  set concluded_at = now() - interval '10 days'
  where project_id = 'cccccccc-0000-0000-0000-000000000001';

-- §6.1 — changer l'issue ne recalcule AUCUN montant figé (ni le prix convenu).
do $$
declare before_row public.project_meeting_conclusions%rowtype;
        after_row public.project_meeting_conclusions%rowtype;
begin
  select * into before_row from public.project_meeting_conclusions
    where project_id = 'cccccccc-0000-0000-0000-000000000001';

  perform public.change_meeting_outcome(
    'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000',
    'sold_elsewhere', 'motif à ignorer');

  select * into after_row from public.project_meeting_conclusions
    where project_id = 'cccccccc-0000-0000-0000-000000000001';

  if after_row.commercialization_price is distinct from before_row.commercialization_price
     or after_row.frozen_market_computed is distinct from before_row.frozen_market_computed
     or after_row.frozen_advisor_analysis is distinct from before_row.frozen_advisor_analysis
     or after_row.frozen_advisor_price is distinct from before_row.frozen_advisor_price then
    raise exception 'FAIL 6.1: un montant figé a bougé en changeant l''issue';
  end if;
  if after_row.outcome is distinct from 'sold_elsewhere' then
    raise exception 'FAIL 6.1: l''issue n''a pas été changée';
  end if;
  -- « vendu ailleurs » n'a pas de motif : la fonction annule tout motif.
  if after_row.follow_up_reason is not null then
    raise exception 'FAIL 6.1: un motif a été conservé hors « à relancer »';
  end if;
  -- Deux dates distinctes : le changement d'issue a sa propre date.
  if after_row.outcome_changed_at <= after_row.concluded_at then
    raise exception 'FAIL 6.1: la date de changement d''issue ne s''est pas mise à jour';
  end if;
  -- Le statut ne bouge pas.
  if (select status from public.projects where id = 'cccccccc-0000-0000-0000-000000000001')
       is distinct from 'meeting_completed' then
    raise exception 'FAIL 6.1: le statut a changé en changeant l''issue';
  end if;
end $$;

-- §6.2 — les quatre issues sont posables (par change_meeting_outcome), status inchangé.
do $$
declare v_outcome text; st text;
begin
  foreach v_outcome in array array['signed', 'follow_up', 'sold_elsewhere', 'withdrawn'] loop
    perform public.change_meeting_outcome(
      'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000',
      v_outcome, case when v_outcome = 'follow_up' then 'Le vendeur hésite.' else null end);

    if (select outcome from public.project_meeting_conclusions
        where project_id = 'cccccccc-0000-0000-0000-000000000001') is distinct from v_outcome then
      raise exception 'FAIL 6.2: issue % non posée', v_outcome;
    end if;
    select status into st from public.projects where id = 'cccccccc-0000-0000-0000-000000000001';
    if st is distinct from 'meeting_completed' then
      raise exception 'FAIL 6.2: status % pour l''issue % (attendu meeting_completed)', st, v_outcome;
    end if;
  end loop;

  -- Le motif ne survit qu'à « à relancer » : après le passage final « withdrawn », il est nul.
  if (select follow_up_reason from public.project_meeting_conclusions
      where project_id = 'cccccccc-0000-0000-0000-000000000001') is not null then
    raise exception 'FAIL 6.2: un motif survit hors « à relancer »';
  end if;
end $$;

-- §6.2 (bis) — les deux nouvelles issues sont aussi posables DÈS la conclusion.
select public.conclude_meeting(
  'cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000',
  'withdrawn', null, null, null, null, null);
do $$ begin
  if (select status from public.projects where id = 'cccccccc-0000-0000-0000-000000000002')
       is distinct from 'meeting_completed'
     or (select outcome from public.project_meeting_conclusions
         where project_id = 'cccccccc-0000-0000-0000-000000000002') is distinct from 'withdrawn' then
    raise exception 'FAIL 6.2: « retiré de la vente » non posable à la conclusion';
  end if;
end $$;

do $$ begin raise notice 'ALL SCENARIOS PASSED'; end $$;

rollback;
