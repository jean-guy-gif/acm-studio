-- Mission 114 (partie B) — la marque des dossiers de démonstration, prouvée dans la base :
--   §1 nulle par défaut ; §2 une valeur hors liste est refusée (contrainte) ;
--   §3 un conseiller ne lit que les dossiers de son agence, marque comprise.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/dossiers_demo.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id, email) values
  ('11421111-0000-0000-0000-0000000000a1', 'ca@a114b.test'),
  ('11421111-0000-0000-0000-0000000000b1', 'cb@b114b.test');
insert into public.agencies (id, name, is_demo) values
  ('114baaaa-0000-0000-0000-000000000000', 'Agence démo 114 B', true),
  ('114bbbbb-0000-0000-0000-000000000000', 'Agence B 114 B', false);
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('11421111-0000-0000-0000-0000000000a1', '114baaaa-0000-0000-0000-000000000000',
   'Carl', 'Closer', 'ca@a114b.test', 'advisor'),
  ('11421111-0000-0000-0000-0000000000b1', '114bbbbb-0000-0000-0000-000000000000',
   'Boris', 'Conseiller', 'cb@b114b.test', 'advisor');
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('114baaaa-1111-0000-0000-000000000000', '114baaaa-0000-0000-0000-000000000000',
   '11421111-0000-0000-0000-0000000000a1', 'Vendeur ordinaire', 'draft');

create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
grant execute on function pg_temp.act_as(uuid) to authenticated;

create function pg_temp.attempt(p_sql text) returns text language plpgsql as $$
declare v_rows int;
begin
  execute p_sql;
  get diagnostics v_rows = row_count;
  return v_rows::text;
exception when check_violation then
  return 'contrainte';
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

-- §1 — nulle par défaut.
select pg_temp.expect('§1 marque nulle par défaut',
  (select (demo_stage is null)::text from public.projects
   where id = '114baaaa-1111-0000-0000-000000000000'), 'true');

-- §2 — une valeur hors liste est refusée ; une étape de la liste passe.
select pg_temp.expect('§2 marque hors liste',
  pg_temp.attempt($$update public.projects set demo_stage = 'autre'
                    where id = '114baaaa-1111-0000-0000-000000000000'$$), 'contrainte');
select pg_temp.expect('§2 marque « ready »',
  pg_temp.attempt($$update public.projects set demo_stage = 'ready'
                    where id = '114baaaa-1111-0000-0000-000000000000'$$), '1');

-- §3 — une autre agence ne lit pas le dossier marqué.
select pg_temp.act_as('11421111-0000-0000-0000-0000000000b1');
select pg_temp.expect('§3 une autre agence ne voit pas le dossier de démo',
  (select count(*)::text from public.projects where demo_stage is not null), '0');
select pg_temp.act_as('11421111-0000-0000-0000-0000000000a1');
select pg_temp.expect('§3 le closer voit son dossier marqué',
  (select count(*)::text from public.projects where demo_stage = 'ready'), '1');

rollback;
