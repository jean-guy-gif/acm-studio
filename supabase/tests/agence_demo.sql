-- Mission 114 — l'agence de démonstration, prouvée à la SOURCE DE VÉRITÉ :
--   §1 une agence n'est pas de démonstration par défaut ;
--   §2 un manager modifie encore le nom et les seuils de son agence (M88), mais PAS `is_demo` :
--      refus par privilège (42501), pas par politique ;
--   §3 un conseiller ne modifie rien de son agence, `is_demo` compris ;
--   §4 la clé service (les opérateurs, après leur garde) pose et retire le repère ;
--   §5 chacun lit le repère de sa propre agence, jamais celui d'une autre.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/agence_demo.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id, email) values
  ('11411111-0000-0000-0000-0000000000a0', 'ma@a114.test'),
  ('11411111-0000-0000-0000-0000000000a1', 'ca@a114.test'),
  ('11411111-0000-0000-0000-0000000000b0', 'mb@b114.test');
insert into public.agencies (id, name) values
  ('114aaaaa-0000-0000-0000-000000000000', 'Agence A 114'),
  ('114bbbbb-0000-0000-0000-000000000000', 'Agence B 114');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('11411111-0000-0000-0000-0000000000a0', '114aaaaa-0000-0000-0000-000000000000',
   'Marie', 'Manager', 'ma@a114.test', 'manager'),
  ('11411111-0000-0000-0000-0000000000a1', '114aaaaa-0000-0000-0000-000000000000',
   'Carl', 'Conseiller', 'ca@a114.test', 'advisor'),
  ('11411111-0000-0000-0000-0000000000b0', '114bbbbb-0000-0000-0000-000000000000',
   'Boris', 'Manager', 'mb@b114.test', 'manager');

create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
grant execute on function pg_temp.act_as(uuid) to authenticated;

create function pg_temp.act_as_service() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform set_config('role', 'service_role', true);
end $$;

-- Une écriture refusée par les PRIVILÈGES lève 42501 ; refusée par une POLITIQUE, elle ne
-- touche aucune ligne. `attempt` rend 'refus' (42501), ou le nombre de lignes touchées.
create function pg_temp.attempt(p_sql text) returns text language plpgsql as $$
declare v_rows int;
begin
  execute p_sql;
  get diagnostics v_rows = row_count;
  return v_rows::text;
exception when insufficient_privilege then
  return 'refus';
end $$;
grant execute on function pg_temp.attempt(text) to authenticated;

create function pg_temp.expect(p_label text, p_got text, p_want text) returns void
language plpgsql as $$
begin
  if p_got is distinct from p_want then
    raise exception 'FAIL % : attendu %, obtenu %', p_label, p_want, p_got;
  end if;
  raise notice 'ok — %', p_label;
end $$;
grant execute on function pg_temp.expect(text, text, text) to authenticated;

-- §1 — par défaut, aucune agence n'est de démonstration.
select pg_temp.expect('§1 faux par défaut',
  (select is_demo::text from public.agencies where id = '114aaaaa-0000-0000-0000-000000000000'),
  'false');

-- §2 — le manager de A : son agence oui, le repère non.
select pg_temp.act_as('11411111-0000-0000-0000-0000000000a0');
select pg_temp.expect('§2 manager renomme son agence et règle ses seuils',
  pg_temp.attempt($$update public.agencies
                    set name = 'Agence A 114 renommée', preparation_dormant_days = 14,
                        follow_up_dormant_days = 45, updated_at = now()
                    where id = '114aaaaa-0000-0000-0000-000000000000'$$), '1');
select pg_temp.expect('§2 manager pose le repère de démonstration',
  pg_temp.attempt($$update public.agencies set is_demo = true
                    where id = '114aaaaa-0000-0000-0000-000000000000'$$), 'refus');
select pg_temp.expect('§2 manager pose le repère en même temps que le nom',
  pg_temp.attempt($$update public.agencies set name = 'X', is_demo = true
                    where id = '114aaaaa-0000-0000-0000-000000000000'$$), 'refus');
select pg_temp.expect('§2 manager modifie une autre agence',
  pg_temp.attempt($$update public.agencies set name = 'Piratée'
                    where id = '114bbbbb-0000-0000-0000-000000000000'$$), '0');

-- §3 — le conseiller de A : rien.
select pg_temp.act_as('11411111-0000-0000-0000-0000000000a1');
select pg_temp.expect('§3 conseiller renomme son agence',
  pg_temp.attempt($$update public.agencies set name = 'Par le conseiller'
                    where id = '114aaaaa-0000-0000-0000-000000000000'$$), '0');
select pg_temp.expect('§3 conseiller pose le repère',
  pg_temp.attempt($$update public.agencies set is_demo = true
                    where id = '114aaaaa-0000-0000-0000-000000000000'$$), 'refus');

-- §4 — la clé service pose et retire le repère.
select pg_temp.act_as_service();
select pg_temp.expect('§4 la clé service pose le repère',
  pg_temp.attempt($$update public.agencies set is_demo = true
                    where id = '114aaaaa-0000-0000-0000-000000000000'$$), '1');
select pg_temp.expect('§4 le repère est posé',
  (select is_demo::text from public.agencies where id = '114aaaaa-0000-0000-0000-000000000000'),
  'true');
select pg_temp.expect('§4 l''autre agence n''a pas bougé',
  (select is_demo::text from public.agencies where id = '114bbbbb-0000-0000-0000-000000000000'),
  'false');

-- §5 — chacun lit le repère de sa propre agence, et seulement la sienne.
select pg_temp.act_as('11411111-0000-0000-0000-0000000000a1');
select pg_temp.expect('§5 le conseiller de A lit le repère de A',
  (select string_agg(is_demo::text, ',') from public.agencies), 'true');
select pg_temp.act_as('11411111-0000-0000-0000-0000000000b0');
select pg_temp.expect('§5 le manager de B lit le seul repère de B',
  (select string_agg(id::text || ':' || is_demo::text, ',') from public.agencies),
  '114bbbbb-0000-0000-0000-000000000000:false');

-- §4 (suite) — la clé service retire le repère.
select pg_temp.act_as_service();
select pg_temp.expect('§4 la clé service retire le repère',
  pg_temp.attempt($$update public.agencies set is_demo = false
                    where id = '114aaaaa-0000-0000-0000-000000000000'$$), '1');

rollback;
