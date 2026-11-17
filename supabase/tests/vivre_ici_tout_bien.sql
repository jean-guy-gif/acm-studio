-- Mission 156 — la date du lien « Vivre ici » d'un mandat, prouvée dans la base : posée par la base
-- quand le lien change, vidée quand il est retiré, jamais écrite par le navigateur ni à la main ;
-- nulle pour un lien d'avant ; `updated_at` immobile. (Le lien d'un bien hors mandat de la 156 est
-- abandonné le 16/11 : sa table part avec la migration de la mission 157, prouvé par son test.)
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/vivre_ici_tout_bien.sql

begin;

insert into auth.users (id, email) values
  ('15611111-0000-0000-0000-0000000000a1', 'ca@a156.test'),
  ('15611111-0000-0000-0000-0000000000a2', 'ra@a156.test'),
  ('15611111-0000-0000-0000-0000000000a3', 'aa@a156.test'),
  ('15611111-0000-0000-0000-0000000000b1', 'cb@b156.test');
insert into public.agencies (id, name) values
  ('156aaaaa-0000-0000-0000-000000000000', 'Agence A 156'),
  ('156bbbbb-0000-0000-0000-000000000000', 'Agence B 156');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, removed_at) values
  ('15611111-0000-0000-0000-0000000000a1', '156aaaaa-0000-0000-0000-000000000000', 'Carl', 'Conseiller', 'ca@a156.test', 'advisor', null),
  ('15611111-0000-0000-0000-0000000000a2', '156aaaaa-0000-0000-0000-000000000000', 'Rémi', 'Retiré', 'ra@a156.test', 'advisor', now()),
  ('15611111-0000-0000-0000-0000000000a3', '156aaaaa-0000-0000-0000-000000000000', 'Annie', 'Auteure', 'aa@a156.test', 'advisor', null),
  ('15611111-0000-0000-0000-0000000000b1', '156bbbbb-0000-0000-0000-000000000000', 'Boris', 'Conseiller', 'cb@b156.test', 'advisor', null);
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('156aaaaa-1111-0000-0000-000000000000', '156aaaaa-0000-0000-0000-000000000000', '15611111-0000-0000-0000-0000000000a1', 'Vendeur A', 'draft'),
  ('156bbbbb-1111-0000-0000-000000000000', '156bbbbb-0000-0000-0000-000000000000', '15611111-0000-0000-0000-0000000000b1', 'Vendeur B', 'draft');
insert into public.comparables (id, agency_id, project_id, title, price, surface_area, is_selected, display_order) values
  ('156aaaaa-2222-0000-0000-000000000001', '156aaaaa-0000-0000-0000-000000000000', '156aaaaa-1111-0000-0000-000000000000', 'Maison 1', 700000, 140, true, 1),
  ('156aaaaa-2222-0000-0000-000000000002', '156aaaaa-0000-0000-0000-000000000000', '156aaaaa-1111-0000-0000-000000000000', 'Maison 2', 720000, 150, true, 2),
  ('156bbbbb-2222-0000-0000-000000000001', '156bbbbb-0000-0000-0000-000000000000', '156bbbbb-1111-0000-0000-000000000000', 'Maison B', 650000, 130, true, 1);

create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
grant execute on function pg_temp.act_as(uuid) to authenticated;
create function pg_temp.act_as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end $$;
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
  when foreign_key_violation then return 'contrainte';
  when not_null_violation then return 'contrainte';
end $$;
grant execute on function pg_temp.attempt(text) to authenticated, anon;
create function pg_temp.expect(p_label text, p_got text, p_want text) returns void language plpgsql as $$
begin
  if p_got is distinct from p_want then
    raise exception 'FAIL % : attendu %, obtenu %', p_label, p_want, p_got;
  end if;
  raise notice 'ok — %', p_label;
end $$;
grant execute on function pg_temp.expect(text, text, text) to authenticated, anon;

-- §3 — la date du lien d'un mandat.
select pg_temp.expect('§3 nulle sans lien',
  (select coalesce(academia_living_here_pasted_at::text, 'nulle') from public.projects where id = '156aaaaa-1111-0000-0000-000000000000'), 'nulle');
update public.projects set updated_at = now() - interval '9 days' where id = '156aaaaa-1111-0000-0000-000000000000';
select pg_temp.act_as('15611111-0000-0000-0000-0000000000a1');
select pg_temp.expect('§3 le conseiller colle le lien du mandat',
  pg_temp.attempt($q$update public.projects set academia_living_here_url = 'https://app.myacademia.ai/l/m1'
    where id = '156aaaaa-1111-0000-0000-000000000000'$q$), '1');
select pg_temp.expect('§3 … la base le date',
  (select (academia_living_here_pasted_at = now())::text from public.projects where id = '156aaaaa-1111-0000-0000-000000000000'), 'true');
select pg_temp.expect('§3 … sans toucher à updated_at',
  (select (updated_at = now() - interval '9 days')::text from public.projects where id = '156aaaaa-1111-0000-0000-000000000000'), 'true');
reset role;
update public.projects set academia_living_here_pasted_at = now() - interval '31 days'
  where id = '156aaaaa-1111-0000-0000-000000000000';
select pg_temp.expect('§3 la date ne s''écrit pas à la main, même hors du navigateur',
  (select (academia_living_here_pasted_at = now())::text from public.projects where id = '156aaaaa-1111-0000-0000-000000000000'), 'true');
-- Vieillir la ligne, déclencheur coupé (un lien collé il y a 31 jours).
alter table public.projects disable trigger projects_date_academia_living_here_link;
update public.projects set academia_living_here_pasted_at = now() - interval '31 days'
  where id = '156aaaaa-1111-0000-0000-000000000000';
alter table public.projects enable trigger projects_date_academia_living_here_link;
select pg_temp.act_as('15611111-0000-0000-0000-0000000000a1');
select pg_temp.expect('§3 le navigateur ne rajeunit pas un lien',
  pg_temp.attempt($q$update public.projects set academia_living_here_pasted_at = now()
    where id = '156aaaaa-1111-0000-0000-000000000000'$q$), '1');
select pg_temp.expect('§3 … la date reste celle du collage',
  (select (academia_living_here_pasted_at = now() - interval '31 days')::text from public.projects where id = '156aaaaa-1111-0000-0000-000000000000'), 'true');
select pg_temp.expect('§3 une autre colonne modifiée garde la date',
  pg_temp.attempt($q$update public.projects set seller_name = 'Vendeur A bis'
    where id = '156aaaaa-1111-0000-0000-000000000000'$q$), '1');
select pg_temp.expect('§3 … toujours 31 jours',
  (select (academia_living_here_pasted_at = now() - interval '31 days')::text from public.projects where id = '156aaaaa-1111-0000-0000-000000000000'), 'true');
select pg_temp.expect('§3 un lien neuf repart du jour',
  pg_temp.attempt($q$update public.projects set academia_living_here_url = 'https://app.myacademia.ai/l/m2'
    where id = '156aaaaa-1111-0000-0000-000000000000'$q$), '1');
select pg_temp.expect('§3 … à l''heure de la base',
  (select (academia_living_here_pasted_at = now())::text from public.projects where id = '156aaaaa-1111-0000-0000-000000000000'), 'true');
select pg_temp.expect('§3 retirer le lien vide la date',
  pg_temp.attempt($q$update public.projects set academia_living_here_url = null
    where id = '156aaaaa-1111-0000-0000-000000000000'$q$), '1');
select pg_temp.expect('§3 … nulle',
  (select coalesce(academia_living_here_pasted_at::text, 'nulle') from public.projects where id = '156aaaaa-1111-0000-0000-000000000000'), 'nulle');
select pg_temp.act_as('15611111-0000-0000-0000-0000000000b1');
select pg_temp.expect('§3 une autre agence ne colle rien sur ce mandat',
  pg_temp.attempt($q$update public.projects set academia_living_here_url = 'https://app.myacademia.ai/l/z'
    where id = '156aaaaa-1111-0000-0000-000000000000'$q$), '0');
reset role;
select pg_temp.expect('§3 un dossier créé avec son lien est daté',
  pg_temp.attempt($q$insert into public.projects (id, agency_id, advisor_id, seller_name, status, academia_living_here_url)
    values ('156aaaaa-1111-0000-0000-000000000002', '156aaaaa-0000-0000-0000-000000000000', '15611111-0000-0000-0000-0000000000a1', 'Vendeur C', 'draft', 'https://app.myacademia.ai/l/m3')$q$), '1');
select pg_temp.expect('§3 … à l''heure de la base',
  (select (academia_living_here_pasted_at = now())::text from public.projects where id = '156aaaaa-1111-0000-0000-000000000002'), 'true');
select pg_temp.expect('§3 la fonction du déclencheur est fermée au navigateur',
  has_function_privilege('authenticated', 'public.date_academia_living_here_link()', 'execute')::text, 'false');

rollback;
