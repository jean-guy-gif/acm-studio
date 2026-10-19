-- Mission 109 — un dossier conclu ou archivé ne change plus par le Live, à la SOURCE DE VÉRITÉ :
--   le navigateur du conseiller comme une fonction ne peuvent plus écrire une réponse ni le résumé
--   d'un dossier conclu ou archivé ; pendant le Live, tout s'écrit ; supprimer reste possible.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/live_closed_after_conclusion.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values ('10911111-1111-1111-1111-111111111111');
insert into public.agencies (id, name) values ('109aaaaa-0000-0000-0000-000000000000', 'A109');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('10911111-1111-1111-1111-111111111111', '109aaaaa-0000-0000-0000-000000000000', 'Ac', 'Tif', 'a109@t.l', 'advisor');
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('109ccccc-0000-0000-0000-00000000000a', '109aaaaa-0000-0000-0000-000000000000',
   '10911111-1111-1111-1111-111111111111', 'conclu', 'ready_for_meeting'),
  ('109ccccc-0000-0000-0000-00000000000b', '109aaaaa-0000-0000-0000-000000000000',
   '10911111-1111-1111-1111-111111111111', 'archivé', 'ready_for_meeting');
insert into public.comparables (id, agency_id, project_id, title, price, display_order) values
  ('109dddd0-0000-0000-0000-00000000000a', '109aaaaa-0000-0000-0000-000000000000',
   '109ccccc-0000-0000-0000-00000000000a', 'c', 300000, 1),
  ('109dddd0-0000-0000-0000-00000000000b', '109aaaaa-0000-0000-0000-000000000000',
   '109ccccc-0000-0000-0000-00000000000b', 'c', 300000, 1);

create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}', p_uid), true);
  execute 'set local role authenticated';
end $$;
grant execute on function pg_temp.act_as(uuid) to authenticated;

-- Pendant le Live : la réponse et le résumé s'écrivent.
select pg_temp.act_as('10911111-1111-1111-1111-111111111111');
insert into public.live_seller_responses (project_id, comparable_id, agency_id, seller_serious_competitor)
  values ('109ccccc-0000-0000-0000-00000000000a', '109dddd0-0000-0000-0000-00000000000a',
          '109aaaaa-0000-0000-0000-000000000000', 'yes');
insert into public.live_seller_summary (project_id, agency_id, seller_perceived_property_price)
  values ('109ccccc-0000-0000-0000-00000000000a', '109aaaaa-0000-0000-0000-000000000000', 350000);
reset role;

-- Conclu, et l'autre archivé.
select public.conclude_meeting(
  p_project_id => '109ccccc-0000-0000-0000-00000000000a',
  p_agency_id => '109aaaaa-0000-0000-0000-000000000000',
  p_outcome => 'signed', p_reason => null, p_price => 320000,
  p_market_computed => null, p_advisor_analysis => null, p_advisor_price => null);
update public.projects set status = 'archived' where id = '109ccccc-0000-0000-0000-00000000000b';

select pg_temp.act_as('10911111-1111-1111-1111-111111111111');
do $$
begin
  begin
    update public.live_seller_responses set seller_serious_competitor = 'no'
      where project_id = '109ccccc-0000-0000-0000-00000000000a';
    raise exception 'FAIL 1: une réponse d''un dossier conclu a changé';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.live_seller_summary set seller_most_dangerous_reason = 'price'
      where project_id = '109ccccc-0000-0000-0000-00000000000a';
    raise exception 'FAIL 1: le résumé d''un dossier conclu a changé';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.live_seller_responses (project_id, comparable_id, agency_id, seller_serious_competitor)
      values ('109ccccc-0000-0000-0000-00000000000b', '109dddd0-0000-0000-0000-00000000000b',
              '109aaaaa-0000-0000-0000-000000000000', 'yes');
    raise exception 'FAIL 2: une réponse s''écrit sur un dossier archivé';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Même une fonction ou la clé de service ne réécrit pas un Live conclu.
do $$
begin
  begin
    update public.live_seller_responses set seller_serious_competitor = 'no'
      where project_id = '109ccccc-0000-0000-0000-00000000000a';
    raise exception 'FAIL 3: le serveur réécrit une réponse d''un dossier conclu';
  exception when insufficient_privilege then null;
  end;
  if (select seller_serious_competitor from public.live_seller_responses
      where project_id = '109ccccc-0000-0000-0000-00000000000a') is distinct from 'yes' then
    raise exception 'FAIL 3: la réponse a changé';
  end if;
  -- Supprimer un concurrent emporte toujours ses réponses (M92).
  delete from public.comparables where id = '109dddd0-0000-0000-0000-00000000000a';
  if exists (select 1 from public.live_seller_responses
             where project_id = '109ccccc-0000-0000-0000-00000000000a') then
    raise exception 'FAIL 4: la suppression du concurrent n''a pas emporté sa réponse';
  end if;
end $$;

-- =====================================================================
-- Les gestes légitimes passent (demande de Laurent, 19/10) :
--   §5 conclure un rendez-vous après un Live : le résumé et les faits s'enregistrent ;
--   §6 « Changer l'issue » d'un dossier conclu, et corriger la conclusion ;
--   §7 la réouverture d'un Live par un opérateur (M104), là où elle est permise — puis le
--      Live se rejoue.
-- =====================================================================
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('109ccccc-0000-0000-0000-00000000000e', '109aaaaa-0000-0000-0000-000000000000',
   '10911111-1111-1111-1111-111111111111', 'à conclure', 'ready_for_meeting'),
  ('109ccccc-0000-0000-0000-00000000000f', '109aaaaa-0000-0000-0000-000000000000',
   '10911111-1111-1111-1111-111111111111', 'à rouvrir', 'ready_for_meeting');
insert into public.comparables (id, agency_id, project_id, title, price, surface_area, is_selected, display_order) values
  ('109dddd0-0000-0000-0000-00000000000e', '109aaaaa-0000-0000-0000-000000000000',
   '109ccccc-0000-0000-0000-00000000000e', 'c', 300000, 60, true, 1),
  ('109dddd0-0000-0000-0000-00000000000f', '109aaaaa-0000-0000-0000-000000000000',
   '109ccccc-0000-0000-0000-00000000000f', 'c', 300000, 60, true, 1);

-- Le Live, mené dans le navigateur du conseiller : réponses, prix du vendeur, note, « Terminer ».
select pg_temp.act_as('10911111-1111-1111-1111-111111111111');
insert into public.live_seller_responses (project_id, comparable_id, agency_id,
                                          seller_serious_competitor, seller_estimated_listing_price)
  values ('109ccccc-0000-0000-0000-00000000000e', '109dddd0-0000-0000-0000-00000000000e',
          '109aaaaa-0000-0000-0000-000000000000', 'yes', 290000),
         ('109ccccc-0000-0000-0000-00000000000f', '109dddd0-0000-0000-0000-00000000000f',
          '109aaaaa-0000-0000-0000-000000000000', 'yes', 295000);
insert into public.live_seller_summary (project_id, agency_id, seller_perceived_property_price,
                                        seller_launch_readiness_first, seller_launch_readiness_last,
                                        seller_most_dangerous_comparable_id)
  values ('109ccccc-0000-0000-0000-00000000000e', '109aaaaa-0000-0000-0000-000000000000', 350000,
          7, 7, '109dddd0-0000-0000-0000-00000000000e'),
         ('109ccccc-0000-0000-0000-00000000000f', '109aaaaa-0000-0000-0000-000000000000', 360000,
          6, 6, '109dddd0-0000-0000-0000-00000000000f');
-- « Terminer le rendez-vous » : l'état final s'enregistre, avant la conclusion.
update public.live_seller_summary set seller_launch_readiness_last = 10
  where project_id = '109ccccc-0000-0000-0000-00000000000e';
reset role;
update public.projects set live_started_at = now() - interval '30 minutes', live_ended_at = now()
  where id in ('109ccccc-0000-0000-0000-00000000000e', '109ccccc-0000-0000-0000-00000000000f');

-- §5 — conclure après le Live : les faits du résumé sont figés, le dossier entre dans le Suivi.
do $$
declare r public.project_meeting_conclusions%rowtype; v_entered boolean;
begin
  v_entered := public.conclude_meeting(
    p_project_id => '109ccccc-0000-0000-0000-00000000000e',
    p_agency_id => '109aaaaa-0000-0000-0000-000000000000',
    p_outcome => 'follow_up', p_reason => null, p_price => 330000,
    p_market_computed => 310000, p_advisor_analysis => null, p_advisor_price => 320000,
    p_seller_perceived => 350000, p_retained => 1, p_exploitable => 1,
    p_follow_up_motive => 'thinking_price', p_next_follow_up_on => current_date + 30);
  if v_entered is not true then
    raise exception 'FAIL 5: le dossier n''est pas entré dans le Suivi';
  end if;
  select * into r from public.project_meeting_conclusions
    where project_id = '109ccccc-0000-0000-0000-00000000000e';
  if r.frozen_seller_perceived_price is distinct from 350000
     or r.frozen_launch_readiness_first is distinct from 7
     or r.frozen_launch_readiness_last is distinct from 10
     or r.frozen_meeting_duration_seconds is null
     or r.next_follow_up_on is null then
    raise exception 'FAIL 5: faits non figés (% / % / % / % / %)', r.frozen_seller_perceived_price,
      r.frozen_launch_readiness_first, r.frozen_launch_readiness_last,
      r.frozen_meeting_duration_seconds, r.next_follow_up_on;
  end if;
  -- Le Suivi relit le résumé et les réponses : ils sont intacts.
  if (select seller_most_dangerous_comparable_id from public.live_seller_summary
      where project_id = '109ccccc-0000-0000-0000-00000000000e')
     is distinct from '109dddd0-0000-0000-0000-00000000000e'::uuid then
    raise exception 'FAIL 5: le concurrent le plus dangereux a changé';
  end if;
end $$;

-- §6 — « Changer l'issue », puis corriger la conclusion : passent, le figé ne bouge pas.
do $$
declare r public.project_meeting_conclusions%rowtype;
begin
  if not public.change_meeting_outcome(
       p_project_id => '109ccccc-0000-0000-0000-00000000000e',
       p_agency_id => '109aaaaa-0000-0000-0000-000000000000',
       p_outcome => 'signed', p_reason => null, p_mandate_type => 'exclusive',
       p_price => 335000) then
    raise exception 'FAIL 6: « Changer l''issue » refusé';
  end if;
  perform public.conclude_meeting(
    p_project_id => '109ccccc-0000-0000-0000-00000000000e',
    p_agency_id => '109aaaaa-0000-0000-0000-000000000000',
    p_outcome => 'signed', p_reason => null, p_price => null,
    p_market_computed => null, p_advisor_analysis => null, p_advisor_price => null,
    p_mandate_type => 'simple');
  select * into r from public.project_meeting_conclusions
    where project_id = '109ccccc-0000-0000-0000-00000000000e';
  if r.outcome is distinct from 'signed' or r.mandate_type is distinct from 'simple'
     or r.commercialization_price is distinct from 335000
     or r.frozen_seller_perceived_price is distinct from 350000 then
    raise exception 'FAIL 6: issue ou figé incorrects (% / % / % / %)', r.outcome, r.mandate_type,
      r.commercialization_price, r.frozen_seller_perceived_price;
  end if;
end $$;

-- §7 — la réouverture par un opérateur, sur un Live commencé et non conclu : elle efface et garde
-- la trace ; le Live se rejoue ensuite. Sur un dossier conclu, elle reste refusée (M104).
do $$
declare v_result jsonb;
begin
  v_result := public.reopen_live('109ccccc-0000-0000-0000-00000000000f', null, 'op@t.l',
                                 'essai mené sans le vendeur');
  if (v_result ->> 'responses')::int <> 1 or (v_result ->> 'summary')::boolean is not true then
    raise exception 'FAIL 7: réouverture incomplète (%)', v_result;
  end if;
  if exists (select 1 from public.live_seller_responses
             where project_id = '109ccccc-0000-0000-0000-00000000000f')
     or exists (select 1 from public.live_seller_summary
                where project_id = '109ccccc-0000-0000-0000-00000000000f') then
    raise exception 'FAIL 7: la réouverture n''a pas effacé le Live';
  end if;
  begin
    perform public.reopen_live('109ccccc-0000-0000-0000-00000000000e', null, 'op@t.l',
                               'essai mené sans le vendeur');
    raise exception 'FAIL 7: un dossier conclu a été rouvert';
  exception when raise_exception then null;
  end;
end $$;
select pg_temp.act_as('10911111-1111-1111-1111-111111111111');
insert into public.live_seller_responses (project_id, comparable_id, agency_id, seller_serious_competitor)
  values ('109ccccc-0000-0000-0000-00000000000f', '109dddd0-0000-0000-0000-00000000000f',
          '109aaaaa-0000-0000-0000-000000000000', 'yes');
reset role;

-- =====================================================================
-- Mission 109 (suite) — les suppressions légitimes passent le verrou, une par lien recensé :
--   §8  supprimer le concurrent le plus dangereux d'un dossier conclu (`on delete set null`),
--       depuis le navigateur du conseiller ; vider ce choix À LA MAIN reste refusé ;
--   §9  supprimer un concurrent d'un dossier conclu emporte ses réponses (`cascade`) ;
--   §10 effacer un dossier conclu entier selon PROCEDURE_EFFACEMENT.md (A) ;
--   §11 effacer le bien d'un propriétaire selon PROCEDURE_EFFACEMENT.md (B), dossier conclu ;
--   §12 supprimer un dossier archivé entier.
-- =====================================================================
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('109ccccc-0000-0000-0000-000000000011', '109aaaaa-0000-0000-0000-000000000000',
   '10911111-1111-1111-1111-111111111111', 'dangereux', 'ready_for_meeting'),
  ('109ccccc-0000-0000-0000-000000000012', '109aaaaa-0000-0000-0000-000000000000',
   '10911111-1111-1111-1111-111111111111', 'à effacer', 'ready_for_meeting'),
  ('109ccccc-0000-0000-0000-000000000013', '109aaaaa-0000-0000-0000-000000000000',
   '10911111-1111-1111-1111-111111111111', 'archivé à supprimer', 'ready_for_meeting');
insert into public.subject_properties (agency_id, project_id) values
  ('109aaaaa-0000-0000-0000-000000000000', '109ccccc-0000-0000-0000-000000000012');
insert into public.comparables (id, agency_id, project_id, title, price, is_selected, display_order, locator_address, locator_confirmed) values
  ('109dddd0-0000-0000-0000-000000000011', '109aaaaa-0000-0000-0000-000000000000',
   '109ccccc-0000-0000-0000-000000000011', 'dangereux', 300000, true, 1, '8 rue A, Antibes', true),
  ('109dddd0-0000-0000-0000-000000000111', '109aaaaa-0000-0000-0000-000000000000',
   '109ccccc-0000-0000-0000-000000000011', 'autre', 310000, true, 2, '10 rue B, Antibes', true),
  ('109dddd0-0000-0000-0000-000000000012', '109aaaaa-0000-0000-0000-000000000000',
   '109ccccc-0000-0000-0000-000000000012', 'c', 300000, true, 1, null, null),
  ('109dddd0-0000-0000-0000-000000000013', '109aaaaa-0000-0000-0000-000000000000',
   '109ccccc-0000-0000-0000-000000000013', 'c', 300000, true, 1, null, null);

-- Le Live de chacun : réponses, et le concurrent le plus dangereux.
select pg_temp.act_as('10911111-1111-1111-1111-111111111111');
insert into public.live_seller_responses (project_id, comparable_id, agency_id, seller_serious_competitor)
  values ('109ccccc-0000-0000-0000-000000000011', '109dddd0-0000-0000-0000-000000000011', '109aaaaa-0000-0000-0000-000000000000', 'yes'),
         ('109ccccc-0000-0000-0000-000000000011', '109dddd0-0000-0000-0000-000000000111', '109aaaaa-0000-0000-0000-000000000000', 'yes'),
         ('109ccccc-0000-0000-0000-000000000012', '109dddd0-0000-0000-0000-000000000012', '109aaaaa-0000-0000-0000-000000000000', 'yes'),
         ('109ccccc-0000-0000-0000-000000000013', '109dddd0-0000-0000-0000-000000000013', '109aaaaa-0000-0000-0000-000000000000', 'yes');
insert into public.live_seller_summary (project_id, agency_id, seller_perceived_property_price, seller_most_dangerous_comparable_id, seller_most_dangerous_reason)
  values ('109ccccc-0000-0000-0000-000000000011', '109aaaaa-0000-0000-0000-000000000000', 350000, '109dddd0-0000-0000-0000-000000000011', 'better_value'),
         ('109ccccc-0000-0000-0000-000000000012', '109aaaaa-0000-0000-0000-000000000000', 350000, '109dddd0-0000-0000-0000-000000000012', 'better_value'),
         ('109ccccc-0000-0000-0000-000000000013', '109aaaaa-0000-0000-0000-000000000000', 350000, '109dddd0-0000-0000-0000-000000000013', 'better_value');
reset role;
do $$
declare v_id uuid;
begin
  foreach v_id in array array['109ccccc-0000-0000-0000-000000000011', '109ccccc-0000-0000-0000-000000000012']::uuid[] loop
    perform public.conclude_meeting(
      p_project_id => v_id, p_agency_id => '109aaaaa-0000-0000-0000-000000000000',
      p_outcome => 'signed', p_reason => null, p_price => 320000,
      p_market_computed => null, p_advisor_analysis => null, p_advisor_price => null);
  end loop;
end $$;
update public.projects set status = 'archived' where id = '109ccccc-0000-0000-0000-000000000013';

-- §8 — vider le choix à la main : refusé ; supprimer le concurrent : passe, le choix se vide seul.
select pg_temp.act_as('10911111-1111-1111-1111-111111111111');
do $$
declare s public.live_seller_summary%rowtype;
begin
  begin
    update public.live_seller_summary set seller_most_dangerous_comparable_id = null
      where project_id = '109ccccc-0000-0000-0000-000000000011';
    raise exception 'FAIL 8: le choix du plus dangereux vidé à la main sur un dossier conclu';
  exception when insufficient_privilege then null;
  end;
  delete from public.comparables where id = '109dddd0-0000-0000-0000-000000000011';
  select * into s from public.live_seller_summary where project_id = '109ccccc-0000-0000-0000-000000000011';
  if s.seller_most_dangerous_comparable_id is not null
     or s.seller_most_dangerous_reason is distinct from 'better_value'
     or s.seller_perceived_property_price is distinct from 350000 then
    raise exception 'FAIL 8: le résumé a changé au-delà du concurrent supprimé';
  end if;
  -- §9 — ses réponses sont parties, celles de l'autre concurrent restent.
  if exists (select 1 from public.live_seller_responses where comparable_id = '109dddd0-0000-0000-0000-000000000011')
     or not exists (select 1 from public.live_seller_responses where comparable_id = '109dddd0-0000-0000-0000-000000000111') then
    raise exception 'FAIL 9: réponses mal emportées';
  end if;
end $$;
reset role;

-- §11 — effacement B (propriétaire), sur un dossier conclu : le concurrent sort des retenus, son
-- adresse part ; ses réponses du Live restent (l'annonce publique sert au Live).
delete from public.competitor_prospecting_files where comparable_id in ('109dddd0-0000-0000-0000-000000000111');
update public.comparables set
  address = null,
  locator_address = null, locator_latitude = null, locator_longitude = null,
  locator_property_id = null, locator_label = null, locator_label_key = null,
  locator_source = null, locator_state = null, locator_confirmed = null,
  locator_analyzed_at = null,
  is_selected = false,
  updated_at = now()
where id in ('109dddd0-0000-0000-0000-000000000111');
do $$
begin
  if (select locator_address from public.comparables where id = '109dddd0-0000-0000-0000-000000000111') is not null
     or not exists (select 1 from public.live_seller_responses where comparable_id = '109dddd0-0000-0000-0000-000000000111') then
    raise exception 'FAIL 11: effacement B incomplet, ou réponses du Live perdues';
  end if;
end $$;

-- §10 — effacement A (vendeur), dossier conclu ENTIER, dans l'ordre de la procédure.
delete from public.comparables where project_id = '109ccccc-0000-0000-0000-000000000012' and agency_id = '109aaaaa-0000-0000-0000-000000000000';
delete from public.subject_properties where project_id = '109ccccc-0000-0000-0000-000000000012' and agency_id = '109aaaaa-0000-0000-0000-000000000000';
delete from public.projects where id = '109ccccc-0000-0000-0000-000000000012' and agency_id = '109aaaaa-0000-0000-0000-000000000000';
-- §12 — un dossier archivé entier, concurrents d'abord, comme le nettoyage de l'agence de test.
delete from public.comparables where project_id = '109ccccc-0000-0000-0000-000000000013';
delete from public.projects where id = '109ccccc-0000-0000-0000-000000000013';
do $$
begin
  if exists (select 1 from public.live_seller_responses where project_id in ('109ccccc-0000-0000-0000-000000000012', '109ccccc-0000-0000-0000-000000000013'))
     or exists (select 1 from public.live_seller_summary where project_id in ('109ccccc-0000-0000-0000-000000000012', '109ccccc-0000-0000-0000-000000000013'))
     or exists (select 1 from public.project_meeting_conclusions where project_id = '109ccccc-0000-0000-0000-000000000012') then
    raise exception 'FAIL 10/12: il reste du Live ou de la conclusion d''un dossier effacé';
  end if;
end $$;

do $$ begin raise notice 'live_closed_after_conclusion : OK'; end $$;

rollback;
