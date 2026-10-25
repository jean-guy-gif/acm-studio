-- Mission 122 (partie A) — le dossier qui fait agir, prouvé dans la base :
--   §1 l'agence lit les réponses de ses acquéreurs, jamais celles d'une autre agence, un membre
--      retiré rien ; le navigateur n'écrit ni une réponse, ni « Vous m'avez dit », ni « Pourquoi »,
--      ni des disponibilités, ni une suggestion ignorée ;
--   §2 les contraintes : réponse et raisons en liste, raisons à « Pas pour moi » seulement, une
--      réponse par bien et par moment, « Pourquoi » à 140 caractères, disponibilités en liste ;
--   §3 les défauts vides, l'écriture par la clé service, la cascade avec le bien retenu.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/dossier_qui_fait_agir.sql

begin;

insert into auth.users (id, email) values
  ('12211111-0000-0000-0000-0000000000a1', 'ca@a122.test'),
  ('12211111-0000-0000-0000-0000000000a2', 'ra@a122.test'),
  ('12211111-0000-0000-0000-0000000000b1', 'cb@b122.test');
insert into public.agencies (id, name) values
  ('122aaaaa-0000-0000-0000-000000000000', 'Agence A 122'),
  ('122bbbbb-0000-0000-0000-000000000000', 'Agence B 122');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, removed_at) values
  ('12211111-0000-0000-0000-0000000000a1', '122aaaaa-0000-0000-0000-000000000000', 'Carl', 'Conseiller', 'ca@a122.test', 'advisor', null),
  ('12211111-0000-0000-0000-0000000000a2', '122aaaaa-0000-0000-0000-000000000000', 'Rémi', 'Retiré', 'ra@a122.test', 'advisor', now()),
  ('12211111-0000-0000-0000-0000000000b1', '122bbbbb-0000-0000-0000-000000000000', 'Boris', 'Conseiller', 'cb@b122.test', 'advisor', null);
insert into public.buyers (id, agency_id, advisor_id, name, cities) values
  ('122aaaaa-1111-0000-0000-000000000000', '122aaaaa-0000-0000-0000-000000000000', '12211111-0000-0000-0000-0000000000a1', 'Famille Test', array['Antibes']);
insert into public.buyer_selections (id, agency_id, buyer_id) values
  ('122aaaaa-2222-0000-0000-000000000000', '122aaaaa-0000-0000-0000-000000000000', '122aaaaa-1111-0000-0000-000000000000');
insert into public.buyer_selection_items (id, agency_id, selection_id, position, source, reference, label) values
  ('122aaaaa-3333-0000-0000-000000000000', '122aaaaa-0000-0000-0000-000000000000', '122aaaaa-2222-0000-0000-000000000000', 1, 'listing', 'https://exemple.invalid/a', 'Appartement · Antibes'),
  ('122aaaaa-3333-0000-0000-000000000001', '122aaaaa-0000-0000-0000-000000000000', '122aaaaa-2222-0000-0000-000000000000', 2, 'listing', 'https://exemple.invalid/b', 'Appartement · Antibes');
insert into public.buyer_item_responses (id, agency_id, buyer_id, selection_item_id, answer, reasons, answered_during) values
  ('122aaaaa-4444-0000-0000-000000000000', '122aaaaa-0000-0000-0000-000000000000', '122aaaaa-1111-0000-0000-000000000000',
   '122aaaaa-3333-0000-0000-000000000000', 'no', array['surface'], 'presentation');
insert into public.buyer_visit_requests (id, agency_id, buyer_id, buyer_selection_item_id, requested_during) values
  ('122aaaaa-5555-0000-0000-000000000000', '122aaaaa-0000-0000-0000-000000000000', '122aaaaa-1111-0000-0000-000000000000',
   '122aaaaa-3333-0000-0000-000000000001', 'presentation');

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
select pg_temp.act_as('12211111-0000-0000-0000-0000000000a1');
select pg_temp.expect('§1 le conseiller lit la réponse de son acquéreur', (select count(*)::text from public.buyer_item_responses), '1');
select pg_temp.expect('§1 le navigateur n''écrit pas une réponse',
  pg_temp.attempt($$insert into public.buyer_item_responses (agency_id, buyer_id, selection_item_id, answer, answered_during) values
    ('122aaaaa-0000-0000-0000-000000000000', '122aaaaa-1111-0000-0000-000000000000', '122aaaaa-3333-0000-0000-000000000001', 'visit', 'presentation')$$), 'refus');
select pg_temp.expect('§1 ni ne la change', pg_temp.attempt($$update public.buyer_item_responses set answer = 'visit', reasons = '{}'$$), 'refus');
select pg_temp.expect('§1 ni ne la retire', pg_temp.attempt($$delete from public.buyer_item_responses$$), 'refus');
select pg_temp.expect('§1 ni « Vous m''avez dit »',
  pg_temp.attempt($$update public.buyer_selections set buyer_words = 'Un 3 pièces'$$), 'refus');
select pg_temp.expect('§1 ni « Pourquoi »',
  pg_temp.attempt($$update public.buyer_selection_items set pitch = 'Il coche tout.'$$), 'refus');
select pg_temp.expect('§1 ni des disponibilités',
  pg_temp.attempt($$update public.buyer_visit_requests set availability = array['sunday']$$), 'refus');
select pg_temp.expect('§1 ni une suggestion ignorée',
  pg_temp.attempt($$update public.buyers set ignored_suggestions = array['surface']$$), 'refus');
select pg_temp.act_as('12211111-0000-0000-0000-0000000000b1');
select pg_temp.expect('§1 une autre agence ne lit rien', (select count(*)::text from public.buyer_item_responses), '0');
select pg_temp.act_as('12211111-0000-0000-0000-0000000000a2');
select pg_temp.expect('§1 un membre retiré ne lit rien', (select count(*)::text from public.buyer_item_responses), '0');

-- §2
select pg_temp.act_as_service();
select pg_temp.expect('§2 une réponse hors liste : refusée',
  pg_temp.attempt($$insert into public.buyer_item_responses (agency_id, buyer_id, selection_item_id, answer, answered_during) values
    ('122aaaaa-0000-0000-0000-000000000000', '122aaaaa-1111-0000-0000-000000000000', '122aaaaa-3333-0000-0000-000000000001', 'oui', 'presentation')$$), 'contrainte');
select pg_temp.expect('§2 une raison hors liste : refusée',
  pg_temp.attempt($$insert into public.buyer_item_responses (agency_id, buyer_id, selection_item_id, answer, reasons, answered_during) values
    ('122aaaaa-0000-0000-0000-000000000000', '122aaaaa-1111-0000-0000-000000000000', '122aaaaa-3333-0000-0000-000000000001', 'no', array['le voisin'], 'presentation')$$), 'contrainte');
select pg_temp.expect('§2 des raisons à « Je veux le visiter » : refusées',
  pg_temp.attempt($$insert into public.buyer_item_responses (agency_id, buyer_id, selection_item_id, answer, reasons, answered_during) values
    ('122aaaaa-0000-0000-0000-000000000000', '122aaaaa-1111-0000-0000-000000000000', '122aaaaa-3333-0000-0000-000000000001', 'visit', array['surface'], 'presentation')$$), 'contrainte');
select pg_temp.expect('§2 un moment hors liste : refusé',
  pg_temp.attempt($$insert into public.buyer_item_responses (agency_id, buyer_id, selection_item_id, answer, answered_during) values
    ('122aaaaa-0000-0000-0000-000000000000', '122aaaaa-1111-0000-0000-000000000000', '122aaaaa-3333-0000-0000-000000000001', 'maybe', 'telephone')$$), 'contrainte');
select pg_temp.expect('§2 deux réponses au même bien pendant la présentation : refusé',
  pg_temp.attempt($$insert into public.buyer_item_responses (agency_id, buyer_id, selection_item_id, answer, answered_during) values
    ('122aaaaa-0000-0000-0000-000000000000', '122aaaaa-1111-0000-0000-000000000000', '122aaaaa-3333-0000-0000-000000000000', 'maybe', 'presentation')$$), 'doublon');
select pg_temp.expect('§2 la même, depuis le lien : acceptée',
  pg_temp.attempt($$insert into public.buyer_item_responses (agency_id, buyer_id, selection_item_id, answer, answered_during) values
    ('122aaaaa-0000-0000-0000-000000000000', '122aaaaa-1111-0000-0000-000000000000', '122aaaaa-3333-0000-0000-000000000000', 'maybe', 'dossier')$$), '1');
select pg_temp.expect('§2 « Pourquoi » au-delà de 140 caractères : refusé',
  pg_temp.attempt($$update public.buyer_selection_items set pitch = repeat('x', 141) where id = '122aaaaa-3333-0000-0000-000000000000'$$), 'contrainte');
select pg_temp.expect('§2 « Pourquoi » vide : refusé (null vaut la phrase proposée)',
  pg_temp.attempt($$update public.buyer_selection_items set pitch = '' where id = '122aaaaa-3333-0000-0000-000000000000'$$), 'contrainte');
select pg_temp.expect('§2 « Vous m''avez dit » au-delà de 300 caractères : refusé',
  pg_temp.attempt($$update public.buyer_selections set buyer_words = repeat('x', 301)$$), 'contrainte');
select pg_temp.expect('§2 une disponibilité hors liste : refusée',
  pg_temp.attempt($$update public.buyer_visit_requests set availability = array['minuit']$$), 'contrainte');
select pg_temp.expect('§2 une suggestion ignorée hors liste : refusée',
  pg_temp.attempt($$update public.buyers set ignored_suggestions = array['voisin']$$), 'contrainte');

-- §3
select pg_temp.expect('§3 aucune disponibilité par défaut',
  (select cardinality(availability)::text from public.buyer_visit_requests where id = '122aaaaa-5555-0000-0000-000000000000'), '0');
select pg_temp.expect('§3 aucune suggestion ignorée par défaut',
  (select cardinality(ignored_suggestions)::text from public.buyers where id = '122aaaaa-1111-0000-0000-000000000000'), '0');
select pg_temp.expect('§3 « Vous m''avez dit » et « Pourquoi » proposés par défaut (null)',
  (select (s.buyer_words is null and i.pitch is null)::text from public.buyer_selections s
   join public.buyer_selection_items i on i.selection_id = s.id where i.id = '122aaaaa-3333-0000-0000-000000000001'), 'true');
select pg_temp.expect('§3 la clé service écrit les disponibilités',
  pg_temp.attempt($$update public.buyer_visit_requests set availability = array['sat_morning', 'sunday'] where id = '122aaaaa-5555-0000-0000-000000000000'$$), '1');
select pg_temp.expect('§3 et « Pourquoi »',
  pg_temp.attempt($$update public.buyer_selection_items set pitch = 'Il coche vos 7 critères.' where id = '122aaaaa-3333-0000-0000-000000000000'$$), '1');
delete from public.buyer_selection_items where id = '122aaaaa-3333-0000-0000-000000000000';
select pg_temp.expect('§3 les réponses partent avec leur bien', (select count(*)::text from public.buyer_item_responses), '0');

rollback;
