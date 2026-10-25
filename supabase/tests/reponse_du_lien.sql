-- Mission 122 (partie B) — la réponse depuis le lien, prouvée dans la base :
--   §1 la fonction est fermée au navigateur (has_function_privilege, M113), ouverte au serveur ;
--   §2 les réponses « depuis le lien » et les demandes de visite en une transaction : une demande
--      « depuis le dossier » avec ses créneaux, ou les créneaux ajoutés à une demande vivante ;
--      les raisons à « Pas pour moi » seulement ;
--   §3 une seule réponse : un second envoi est refusé et n'écrit rien ; un bien retiré ou hors de la
--      sélection, un acquéreur archivé, une autre agence, un envoi vide : refusés, rien d'écrit.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/reponse_du_lien.sql

begin;

insert into auth.users (id, email) values
  ('12231111-0000-0000-0000-0000000000a1', 'ca@a122b.test');
insert into public.agencies (id, name) values
  ('122bbbbb-1111-0000-0000-000000000000', 'Agence A 122 B');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('12231111-0000-0000-0000-0000000000a1', '122bbbbb-1111-0000-0000-000000000000', 'Carl', 'Conseiller', 'ca@a122b.test', 'advisor');
insert into public.buyers (id, agency_id, advisor_id, name, cities) values
  ('122bbbbb-2222-0000-0000-000000000000', '122bbbbb-1111-0000-0000-000000000000', '12231111-0000-0000-0000-0000000000a1', 'Famille Test', array['Antibes']),
  ('122bbbbb-2222-0000-0000-0000000000ff', '122bbbbb-1111-0000-0000-000000000000', '12231111-0000-0000-0000-0000000000a1', 'Archivé', array['Antibes']);
update public.buyers set archived_at = now() where id = '122bbbbb-2222-0000-0000-0000000000ff';
insert into public.buyer_selections (id, agency_id, buyer_id) values
  ('122bbbbb-3333-0000-0000-000000000000', '122bbbbb-1111-0000-0000-000000000000', '122bbbbb-2222-0000-0000-000000000000'),
  ('122bbbbb-3333-0000-0000-0000000000ff', '122bbbbb-1111-0000-0000-000000000000', '122bbbbb-2222-0000-0000-0000000000ff'),
  ('122bbbbb-3333-0000-0000-0000000000ee', '122bbbbb-1111-0000-0000-000000000000', '122bbbbb-2222-0000-0000-000000000000');
insert into public.buyer_selection_items (id, agency_id, selection_id, position, source, reference, label) values
  ('122bbbbb-4444-0000-0000-00000000000a', '122bbbbb-1111-0000-0000-000000000000', '122bbbbb-3333-0000-0000-000000000000', 1, 'listing', 'https://exemple.invalid/a', 'A'),
  ('122bbbbb-4444-0000-0000-00000000000b', '122bbbbb-1111-0000-0000-000000000000', '122bbbbb-3333-0000-0000-000000000000', 2, 'listing', 'https://exemple.invalid/b', 'B'),
  ('122bbbbb-4444-0000-0000-00000000000c', '122bbbbb-1111-0000-0000-000000000000', '122bbbbb-3333-0000-0000-000000000000', 3, 'listing', 'https://exemple.invalid/c', 'C'),
  ('122bbbbb-4444-0000-0000-0000000000ff', '122bbbbb-1111-0000-0000-000000000000', '122bbbbb-3333-0000-0000-0000000000ff', 1, 'listing', 'https://exemple.invalid/z', 'Z'),
  ('122bbbbb-4444-0000-0000-0000000000ee', '122bbbbb-1111-0000-0000-000000000000', '122bbbbb-3333-0000-0000-0000000000ee', 1, 'listing', 'https://exemple.invalid/y', 'Y');
update public.buyer_selection_items set removed_at = now() where id = '122bbbbb-4444-0000-0000-00000000000c';
-- Une demande vivante « pendant la présentation » sur A, avec un créneau.
insert into public.buyer_visit_requests (id, agency_id, buyer_id, buyer_selection_item_id, requested_during, availability) values
  ('122bbbbb-5555-0000-0000-00000000000a', '122bbbbb-1111-0000-0000-000000000000', '122bbbbb-2222-0000-0000-000000000000',
   '122bbbbb-4444-0000-0000-00000000000a', 'presentation', array['weekday_evening']);

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
  when raise_exception then return 'refus métier : ' || sqlerrm;
  when no_data_found then return 'refus métier : ' || sqlerrm;
end $$;
create function pg_temp.expect(p_label text, p_got text, p_want text) returns void language plpgsql as $$
begin
  if p_got is distinct from p_want then
    raise exception 'FAIL % : attendu %, obtenu %', p_label, p_want, p_got;
  end if;
  raise notice 'ok — %', p_label;
end $$;

-- §1
select pg_temp.expect('§1 fermée au navigateur',
  (has_function_privilege('authenticated', 'public.submit_buyer_dossier_answers(uuid, uuid, jsonb, text[])', 'execute')
   or has_function_privilege('anon', 'public.submit_buyer_dossier_answers(uuid, uuid, jsonb, text[])', 'execute'))::text, 'false');
select pg_temp.expect('§1 ouverte au serveur',
  has_function_privilege('service_role', 'public.submit_buyer_dossier_answers(uuid, uuid, jsonb, text[])', 'execute')::text, 'true');

-- §3 (refus d'abord, rien ne doit être écrit)
select pg_temp.act_as_service();
select pg_temp.expect('§3 un envoi vide : refusé',
  pg_temp.attempt($$select public.submit_buyer_dossier_answers('122bbbbb-1111-0000-0000-000000000000', '122bbbbb-3333-0000-0000-000000000000', '[]'::jsonb, '{}')$$),
  'refus métier : no_answer');
select pg_temp.expect('§3 un bien retiré : refusé',
  pg_temp.attempt($$select public.submit_buyer_dossier_answers('122bbbbb-1111-0000-0000-000000000000', '122bbbbb-3333-0000-0000-000000000000',
    '[{"itemId":"122bbbbb-4444-0000-0000-00000000000b","answer":"maybe"},{"itemId":"122bbbbb-4444-0000-0000-00000000000c","answer":"visit"}]'::jsonb, '{}')$$),
  'refus métier : item_not_in_selection');
select pg_temp.expect('§3 un bien d''une autre sélection : refusé',
  pg_temp.attempt($$select public.submit_buyer_dossier_answers('122bbbbb-1111-0000-0000-000000000000', '122bbbbb-3333-0000-0000-000000000000',
    '[{"itemId":"122bbbbb-4444-0000-0000-0000000000ee","answer":"visit"}]'::jsonb, '{}')$$),
  'refus métier : item_not_in_selection');
select pg_temp.expect('§3 un acquéreur archivé : refusé',
  pg_temp.attempt($$select public.submit_buyer_dossier_answers('122bbbbb-1111-0000-0000-000000000000', '122bbbbb-3333-0000-0000-0000000000ff',
    '[{"itemId":"122bbbbb-4444-0000-0000-0000000000ff","answer":"visit"}]'::jsonb, '{}')$$),
  'refus métier : buyer_archived');
select pg_temp.expect('§3 une autre agence : refusée',
  pg_temp.attempt($$select public.submit_buyer_dossier_answers('99999999-0000-0000-0000-000000000000', '122bbbbb-3333-0000-0000-000000000000',
    '[{"itemId":"122bbbbb-4444-0000-0000-00000000000a","answer":"visit"}]'::jsonb, '{}')$$),
  'refus métier : buyer_selection_not_found');
select pg_temp.expect('§3 rien n''a été écrit par les refus',
  (select count(*)::text from public.buyer_item_responses), '0');

-- §2
select pg_temp.expect('§2 deux réponses écrites',
  public.submit_buyer_dossier_answers('122bbbbb-1111-0000-0000-000000000000', '122bbbbb-3333-0000-0000-000000000000',
    '[{"itemId":"122bbbbb-4444-0000-0000-00000000000a","answer":"visit","reasons":["surface"]},
      {"itemId":"122bbbbb-4444-0000-0000-00000000000b","answer":"no","reasons":["surface","price"]}]'::jsonb,
    array['sunday', 'sat_morning', 'sunday'])::text, '2');
select pg_temp.expect('§2 « depuis le lien », raisons à « Pas pour moi » seulement',
  (select string_agg(answer || ':' || cardinality(reasons) || ':' || answered_during, ' ' order by answer)
   from public.buyer_item_responses), 'no:2:dossier visit:0:dossier');
select pg_temp.expect('§2 la demande vivante de A reçoit les créneaux en plus, sans doublon, dans l''ordre',
  (select availability::text from public.buyer_visit_requests where id = '122bbbbb-5555-0000-0000-00000000000a'),
  '{sat_morning,sunday,weekday_evening}');
select pg_temp.expect('§2 aucune demande « depuis le dossier » en double sur A',
  (select count(*)::text from public.buyer_visit_requests where buyer_selection_item_id = '122bbbbb-4444-0000-0000-00000000000a'), '1');
select pg_temp.expect('§2 « Pas pour moi » ne crée pas de demande',
  (select count(*)::text from public.buyer_visit_requests where buyer_selection_item_id = '122bbbbb-4444-0000-0000-00000000000b'), '0');

-- Sans demande vivante : une demande « depuis le dossier » naît, avec ses créneaux (nouvelle sélection).
update public.buyer_selection_items set removed_at = null where id = '122bbbbb-4444-0000-0000-00000000000c';
select public.submit_buyer_dossier_answers('122bbbbb-1111-0000-0000-000000000000', '122bbbbb-3333-0000-0000-0000000000ee',
  '[{"itemId":"122bbbbb-4444-0000-0000-0000000000ee","answer":"visit"}]'::jsonb, array['weekday_day']);
select pg_temp.expect('§2 une demande « depuis le dossier » avec ses créneaux',
  (select requested_during || ' ' || availability::text from public.buyer_visit_requests where buyer_selection_item_id = '122bbbbb-4444-0000-0000-0000000000ee'),
  'dossier {weekday_day}');

-- §3 une seule réponse
select pg_temp.expect('§3 un second envoi sur la même sélection : refusé',
  pg_temp.attempt($$select public.submit_buyer_dossier_answers('122bbbbb-1111-0000-0000-000000000000', '122bbbbb-3333-0000-0000-000000000000',
    '[{"itemId":"122bbbbb-4444-0000-0000-00000000000c","answer":"maybe"}]'::jsonb, '{}')$$),
  'refus métier : already_answered');
select pg_temp.expect('§3 et n''écrit rien',
  (select count(*)::text from public.buyer_item_responses where selection_item_id = '122bbbbb-4444-0000-0000-00000000000c'), '0');

rollback;
