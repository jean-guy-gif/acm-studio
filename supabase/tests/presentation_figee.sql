-- Mission 122 (partie A, décisions du 25/10) — la présentation figée et le retrait doux, prouvés
-- dans la base :
--   §1 le navigateur ne fige pas un déroulé, ne retire pas un bien, et n'a pas le droit d'appeler
--      les deux fonctions (vérifié par has_function_privilege, M113) ;
--   §2 `answer_buyer_item` : la réponse et la demande en une transaction ; « visiter » garde une
--      demande « depuis le dossier » vivante ; une autre réponse n'annule que celle de la
--      présentation ; toucher une raison ne redate pas ; refus sur un bien retiré ;
--   §3 `finish_buyer_presentation` : les disponibilités sur les demandes des biens à visiter,
--      « dossier » comprise, puis la date et le déroulé ; un second appel ne réécrit rien ; une
--      réponse après « Terminer » est refusée.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/presentation_figee.sql

begin;

insert into auth.users (id, email) values
  ('12221111-0000-0000-0000-0000000000a1', 'ca@a122f.test');
insert into public.agencies (id, name) values
  ('122fffff-0000-0000-0000-000000000000', 'Agence A 122 figée');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('12221111-0000-0000-0000-0000000000a1', '122fffff-0000-0000-0000-000000000000', 'Carl', 'Conseiller', 'ca@a122f.test', 'advisor');
insert into public.buyers (id, agency_id, advisor_id, name, cities) values
  ('122fffff-1111-0000-0000-000000000000', '122fffff-0000-0000-0000-000000000000', '12221111-0000-0000-0000-0000000000a1', 'Famille Test', array['Antibes']);
insert into public.buyer_selections (id, agency_id, buyer_id) values
  ('122fffff-2222-0000-0000-000000000000', '122fffff-0000-0000-0000-000000000000', '122fffff-1111-0000-0000-000000000000');
insert into public.buyer_selection_items (id, agency_id, selection_id, position, source, reference, label) values
  ('122fffff-3333-0000-0000-00000000000a', '122fffff-0000-0000-0000-000000000000', '122fffff-2222-0000-0000-000000000000', 1, 'listing', 'https://exemple.invalid/a', 'A'),
  ('122fffff-3333-0000-0000-00000000000b', '122fffff-0000-0000-0000-000000000000', '122fffff-2222-0000-0000-000000000000', 2, 'listing', 'https://exemple.invalid/b', 'B'),
  ('122fffff-3333-0000-0000-00000000000c', '122fffff-0000-0000-0000-000000000000', '122fffff-2222-0000-0000-000000000000', 3, 'listing', 'https://exemple.invalid/c', 'C');
-- Une demande « depuis le dossier » existe déjà sur le bien B.
insert into public.buyer_visit_requests (id, agency_id, buyer_id, buyer_selection_item_id, requested_during) values
  ('122fffff-5555-0000-0000-00000000000b', '122fffff-0000-0000-0000-000000000000', '122fffff-1111-0000-0000-000000000000',
   '122fffff-3333-0000-0000-00000000000b', 'dossier');

create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
grant execute on function pg_temp.act_as(uuid) to authenticated;
create function pg_temp.act_as_service() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform set_config('role', 'service_role', true);
end $$;
create function pg_temp.attempt(p_sql text) returns text language plpgsql as $$
declare v_rows int;
begin
  execute p_sql;
  get diagnostics v_rows = row_count;
  return v_rows::text;
exception
  when insufficient_privilege then return 'refus';
  when check_violation then return 'contrainte';
  when unique_violation then return 'doublon';
  when raise_exception then return 'refus métier : ' || sqlerrm;
  when no_data_found then return 'refus métier : ' || sqlerrm;
end $$;
grant execute on function pg_temp.attempt(text) to authenticated;
create function pg_temp.expect(p_label text, p_got text, p_want text) returns void language plpgsql as $$
begin
  if p_got is distinct from p_want then
    raise exception 'FAIL % : attendu %, obtenu %', p_label, p_want, p_got;
  end if;
  raise notice 'ok — %', p_label;
end $$;
grant execute on function pg_temp.expect(text, text, text) to authenticated;

-- §1
select pg_temp.act_as('12221111-0000-0000-0000-0000000000a1');
select pg_temp.expect('§1 le navigateur ne fige pas un déroulé',
  pg_temp.attempt($$update public.buyer_selections set presented_deck = '{}'::jsonb$$), 'refus');
select pg_temp.expect('§1 ni ne retire un bien',
  pg_temp.attempt($$update public.buyer_selection_items set removed_at = now()$$), 'refus');
reset role;
select pg_temp.expect('§1 répondre : fermé au navigateur',
  (has_function_privilege('authenticated', 'public.answer_buyer_item(uuid, uuid, text, text[])', 'execute')
   or has_function_privilege('anon', 'public.answer_buyer_item(uuid, uuid, text, text[])', 'execute'))::text, 'false');
select pg_temp.expect('§1 terminer : fermé au navigateur',
  (has_function_privilege('authenticated', 'public.finish_buyer_presentation(uuid, uuid, jsonb, text[])', 'execute')
   or has_function_privilege('anon', 'public.finish_buyer_presentation(uuid, uuid, jsonb, text[])', 'execute'))::text, 'false');
select pg_temp.expect('§1 ouvert au serveur',
  has_function_privilege('service_role', 'public.answer_buyer_item(uuid, uuid, text, text[])', 'execute')::text, 'true');

-- §2
select pg_temp.act_as_service();
select public.answer_buyer_item('122fffff-0000-0000-0000-000000000000', '122fffff-3333-0000-0000-00000000000a', 'visit', array['surface']);
select pg_temp.expect('§2 « visiter » : une réponse, sans raison',
  (select answer || '/' || cardinality(reasons) from public.buyer_item_responses where selection_item_id = '122fffff-3333-0000-0000-00000000000a'), 'visit/0');
select pg_temp.expect('§2 et sa demande « pendant la présentation »',
  (select count(*)::text from public.buyer_visit_requests where buyer_selection_item_id = '122fffff-3333-0000-0000-00000000000a' and requested_during = 'presentation'), '1');
select public.answer_buyer_item('122fffff-0000-0000-0000-000000000000', '122fffff-3333-0000-0000-00000000000b', 'visit', '{}');
select pg_temp.expect('§2 « visiter » garde la demande « depuis le dossier »',
  (select count(*)::text from public.buyer_visit_requests where buyer_selection_item_id = '122fffff-3333-0000-0000-00000000000b'), '1');
select public.answer_buyer_item('122fffff-0000-0000-0000-000000000000', '122fffff-3333-0000-0000-00000000000a', 'no', array['surface']);
select pg_temp.expect('§2 « pas pour moi » annule la demande de la présentation',
  (select (cancelled_at is not null)::text from public.buyer_visit_requests where buyer_selection_item_id = '122fffff-3333-0000-0000-00000000000a'), 'true');
update public.buyer_item_responses set answered_at = '2026-10-01' where selection_item_id = '122fffff-3333-0000-0000-00000000000a';
select public.answer_buyer_item('122fffff-0000-0000-0000-000000000000', '122fffff-3333-0000-0000-00000000000a', 'no', array['surface', 'price']);
select pg_temp.expect('§2 toucher une raison ne redate pas',
  (select answered_at::date::text || '/' || cardinality(reasons) from public.buyer_item_responses where selection_item_id = '122fffff-3333-0000-0000-00000000000a'), '2026-10-01/2');
select public.answer_buyer_item('122fffff-0000-0000-0000-000000000000', '122fffff-3333-0000-0000-00000000000a', 'visit', '{}');
select public.answer_buyer_item('122fffff-0000-0000-0000-000000000000', '122fffff-3333-0000-0000-00000000000a', 'visit', '{}');
select pg_temp.expect('§2 revenir à « visiter » crée une demande, une seule',
  (select count(*)::text from public.buyer_visit_requests where buyer_selection_item_id = '122fffff-3333-0000-0000-00000000000a' and cancelled_at is null), '1');
select public.answer_buyer_item('122fffff-0000-0000-0000-000000000000', '122fffff-3333-0000-0000-00000000000b', 'maybe', '{}');
select pg_temp.expect('§2 « peut-être » laisse la demande « depuis le dossier »',
  (select (cancelled_at is null)::text from public.buyer_visit_requests where id = '122fffff-5555-0000-0000-00000000000b'), 'true');
select public.answer_buyer_item('122fffff-0000-0000-0000-000000000000', '122fffff-3333-0000-0000-00000000000b', 'visit', '{}');
update public.buyer_selection_items set removed_at = now() where id = '122fffff-3333-0000-0000-00000000000c';
select pg_temp.expect('§2 un bien retiré ne reçoit plus de réponse',
  pg_temp.attempt($$select public.answer_buyer_item('122fffff-0000-0000-0000-000000000000', '122fffff-3333-0000-0000-00000000000c', 'visit', '{}')$$),
  'refus métier : item_removed');
select pg_temp.expect('§2 une autre agence ne répond pas',
  pg_temp.attempt($$select public.answer_buyer_item('99999999-0000-0000-0000-000000000000', '122fffff-3333-0000-0000-00000000000a', 'visit', '{}')$$),
  'refus métier : buyer_item_not_found');

-- §3
select pg_temp.expect('§3 « Terminer » répond vrai la première fois',
  public.finish_buyer_presentation('122fffff-0000-0000-0000-000000000000', '122fffff-2222-0000-0000-000000000000',
    '{"words":"Un 3 pièces"}'::jsonb, array['sat_morning', 'sunday'])::text, 'true');
select pg_temp.expect('§3 les disponibilités sur les deux biens à visiter, « dossier » comprise',
  (select count(*)::text from public.buyer_visit_requests
   where cancelled_at is null and availability = array['sat_morning', 'sunday']), '2');
select pg_temp.expect('§3 la date et le déroulé figé',
  (select (presented_at is not null and presented_deck ->> 'words' = 'Un 3 pièces')::text
   from public.buyer_selections where id = '122fffff-2222-0000-0000-000000000000'), 'true');
select pg_temp.expect('§3 un second « Terminer » ne réécrit rien',
  public.finish_buyer_presentation('122fffff-0000-0000-0000-000000000000', '122fffff-2222-0000-0000-000000000000',
    '{"words":"Autre"}'::jsonb, array['weekday_day'])::text, 'false');
select pg_temp.expect('§3 le déroulé reste celui d''origine',
  (select presented_deck ->> 'words' from public.buyer_selections where id = '122fffff-2222-0000-0000-000000000000'), 'Un 3 pièces');
select pg_temp.expect('§3 une réponse après « Terminer » est refusée',
  pg_temp.attempt($$select public.answer_buyer_item('122fffff-0000-0000-0000-000000000000', '122fffff-3333-0000-0000-00000000000a', 'no', '{}')$$),
  'refus métier : presentation_finished');
select pg_temp.expect('§3 le bien retiré garde sa ligne',
  (select count(*)::text from public.buyer_selection_items where id = '122fffff-3333-0000-0000-00000000000c'), '1');

rollback;
