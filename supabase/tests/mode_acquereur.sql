-- Mission 118 (partie A) — le mode du menu, prouvé dans la base :
--   §1 'seller' par défaut ;
--   §2 le navigateur ne le modifie pas (liste des colonnes de `profiles`, M88) ;
--   §3 la clé service l'écrit, dans la liste seulement.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/mode_acquereur.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id, email) values ('11811111-0000-0000-0000-0000000000a1', 'ca@a118.test');
insert into public.agencies (id, name) values ('118aaaaa-0000-0000-0000-000000000000', 'Agence A 118');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('11811111-0000-0000-0000-0000000000a1', '118aaaaa-0000-0000-0000-000000000000',
   'Carl', 'Conseiller', 'ca@a118.test', 'advisor');

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

create function pg_temp.expect(p_label text, p_got text, p_want text) returns void
language plpgsql as $$
begin
  if p_got is distinct from p_want then
    raise exception 'FAIL % : attendu %, obtenu %', p_label, p_want, p_got;
  end if;
  raise notice 'ok — %', p_label;
end $$;
grant execute on function pg_temp.expect(text, text, text) to authenticated;

select pg_temp.expect('§1 Vendeur par défaut',
  (select workspace_mode from public.profiles where id = '11811111-0000-0000-0000-0000000000a1'), 'seller');

select pg_temp.act_as('11811111-0000-0000-0000-0000000000a1');
select pg_temp.expect('§2 le navigateur ne change pas son mode',
  pg_temp.attempt($$update public.profiles set workspace_mode = 'buyer'
    where id = '11811111-0000-0000-0000-0000000000a1'$$), 'refus');

select pg_temp.act_as_service();
select pg_temp.expect('§3 hors liste : refusé',
  pg_temp.attempt($$update public.profiles set workspace_mode = 'landlord'
    where id = '11811111-0000-0000-0000-0000000000a1'$$), 'contrainte');
select pg_temp.expect('§3 la clé service passe en Acquéreur',
  pg_temp.attempt($$update public.profiles set workspace_mode = 'buyer'
    where id = '11811111-0000-0000-0000-0000000000a1'$$), '1');
select pg_temp.expect('§3 relu',
  (select workspace_mode from public.profiles where id = '11811111-0000-0000-0000-0000000000a1'), 'buyer');

rollback;
