-- Mission 119 (partie A) — les demandes de visite, prouvées dans la base :
--   §1 l'agence lit ; une autre agence et un membre retiré, rien ; le navigateur n'écrit rien ;
--   §2 contraintes : pendant quoi, issue, visite datée, annulée jamais visitée ;
--   §3 une demande part avec son bien retenu (cascade) ; `presented_at` se pose par la clé service.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/visites.sql

begin;

insert into auth.users (id, email) values
  ('11911111-0000-0000-0000-0000000000a1', 'ca@a119.test'),
  ('11911111-0000-0000-0000-0000000000a2', 'ra@a119.test'),
  ('11911111-0000-0000-0000-0000000000b1', 'cb@b119.test');
insert into public.agencies (id, name) values
  ('119aaaaa-0000-0000-0000-000000000000', 'Agence A 119'),
  ('119bbbbb-0000-0000-0000-000000000000', 'Agence B 119');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, removed_at) values
  ('11911111-0000-0000-0000-0000000000a1', '119aaaaa-0000-0000-0000-000000000000', 'Carl', 'Conseiller', 'ca@a119.test', 'advisor', null),
  ('11911111-0000-0000-0000-0000000000a2', '119aaaaa-0000-0000-0000-000000000000', 'Rémi', 'Retiré', 'ra@a119.test', 'advisor', now()),
  ('11911111-0000-0000-0000-0000000000b1', '119bbbbb-0000-0000-0000-000000000000', 'Boris', 'Conseiller', 'cb@b119.test', 'advisor', null);
insert into public.buyers (id, agency_id, advisor_id, name, cities) values
  ('119aaaaa-1111-0000-0000-000000000000', '119aaaaa-0000-0000-0000-000000000000', '11911111-0000-0000-0000-0000000000a1', 'Famille Test', array['Mougins']);
insert into public.buyer_selections (id, agency_id, buyer_id) values
  ('119aaaaa-2222-0000-0000-000000000000', '119aaaaa-0000-0000-0000-000000000000', '119aaaaa-1111-0000-0000-000000000000');
insert into public.buyer_selection_items (id, agency_id, selection_id, position, source, reference, label) values
  ('119aaaaa-3333-0000-0000-000000000000', '119aaaaa-0000-0000-0000-000000000000', '119aaaaa-2222-0000-0000-000000000000', 1, 'listing', 'https://exemple.invalid/a', 'Maison · Mougins');
insert into public.buyer_visit_requests (id, agency_id, buyer_id, buyer_selection_item_id, requested_during) values
  ('119aaaaa-4444-0000-0000-000000000000', '119aaaaa-0000-0000-0000-000000000000', '119aaaaa-1111-0000-0000-000000000000', '119aaaaa-3333-0000-0000-000000000000', 'presentation');

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
select pg_temp.act_as('11911111-0000-0000-0000-0000000000a1');
select pg_temp.expect('§1 le conseiller lit la demande', (select count(*)::text from public.buyer_visit_requests), '1');
select pg_temp.expect('§1 à planifier par défaut, non annulée',
  (select (outcome = 'to_plan' and cancelled_at is null and visited_at is null)::text from public.buyer_visit_requests), 'true');
select pg_temp.expect('§1 le navigateur ne demande pas une visite',
  pg_temp.attempt($$insert into public.buyer_visit_requests (agency_id, buyer_id, buyer_selection_item_id, requested_during) values
    ('119aaaaa-0000-0000-0000-000000000000', '119aaaaa-1111-0000-0000-000000000000', '119aaaaa-3333-0000-0000-000000000000', 'conseiller')$$), 'refus');
select pg_temp.expect('§1 ni ne l''annule',
  pg_temp.attempt($$update public.buyer_visit_requests set cancelled_at = now()$$), 'refus');
select pg_temp.expect('§1 ni ne termine la présentation',
  pg_temp.attempt($$update public.buyer_selections set presented_at = now()$$), 'refus');
select pg_temp.act_as('11911111-0000-0000-0000-0000000000b1');
select pg_temp.expect('§1 une autre agence ne lit rien', (select count(*)::text from public.buyer_visit_requests), '0');
select pg_temp.act_as('11911111-0000-0000-0000-0000000000a2');
select pg_temp.expect('§1 un membre retiré ne lit rien', (select count(*)::text from public.buyer_visit_requests), '0');

-- §2
select pg_temp.act_as_service();
select pg_temp.expect('§2 « pendant quoi » hors liste : refusé',
  pg_temp.attempt($$insert into public.buyer_visit_requests (agency_id, buyer_id, buyer_selection_item_id, requested_during) values
    ('119aaaaa-0000-0000-0000-000000000000', '119aaaaa-1111-0000-0000-000000000000', '119aaaaa-3333-0000-0000-000000000000', 'live')$$), 'contrainte');
select pg_temp.expect('§2 issue hors liste : refusée',
  pg_temp.attempt($$update public.buyer_visit_requests set outcome = 'signed' where id = '119aaaaa-4444-0000-0000-000000000000'$$), 'contrainte');
select pg_temp.expect('§2 « visitée » sans date : refusée',
  pg_temp.attempt($$update public.buyer_visit_requests set outcome = 'visited' where id = '119aaaaa-4444-0000-0000-000000000000'$$), 'contrainte');
select pg_temp.expect('§2 la visite faite, datée, avec retour et issue',
  pg_temp.attempt($$update public.buyer_visit_requests set visited_at = now(), feedback = 'Trop sombre', outcome = 'declined'
    where id = '119aaaaa-4444-0000-0000-000000000000'$$), '1');
select pg_temp.expect('§2 annulée après visite : refusée',
  pg_temp.attempt($$update public.buyer_visit_requests set cancelled_at = now() where id = '119aaaaa-4444-0000-0000-000000000000'$$), 'contrainte');
select pg_temp.expect('§3 la clé service termine la présentation',
  pg_temp.attempt($$update public.buyer_selections set presented_at = now() where id = '119aaaaa-2222-0000-0000-000000000000'$$), '1');

-- §3
delete from public.buyer_selection_items where id = '119aaaaa-3333-0000-0000-000000000000';
select pg_temp.expect('§3 la demande part avec son bien retenu', (select count(*)::text from public.buyer_visit_requests), '0');

rollback;
