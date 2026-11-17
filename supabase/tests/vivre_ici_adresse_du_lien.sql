-- Mission 157 — l'adresse du bien au moment où le lien « Vivre ici » est posé, prouvée dans la base :
-- relue sur le bien vendeur par le déclencheur de la date (M156), jamais choisie par le navigateur
-- ni écrite à la main, gardée quand le bien change ensuite, reprise avec un lien neuf, vidée avec
-- le lien, nulle sans bien vendeur. Le serveur la compare à l'adresse du jour (un lien collé dont
-- l'adresse a changé n'est plus montré, Jean-Guy, 17/11).
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/vivre_ici_adresse_du_lien.sql

begin;

insert into auth.users (id, email) values
  ('15a11111-0000-0000-0000-0000000000a1', 'ca@a15a.test'),
  ('15a11111-0000-0000-0000-0000000000a2', 'ra@a15a.test'),
  ('15a11111-0000-0000-0000-0000000000a3', 'aa@a15a.test'),
  ('15a11111-0000-0000-0000-0000000000b1', 'cb@b15a.test');
insert into public.agencies (id, name) values
  ('15aaaaaa-0000-0000-0000-000000000000', 'Agence A 157 adr'),
  ('15abbbbb-0000-0000-0000-000000000000', 'Agence B 157 adr');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, removed_at) values
  ('15a11111-0000-0000-0000-0000000000a1', '15aaaaaa-0000-0000-0000-000000000000', 'Carl', 'Conseiller', 'ca@a15a.test', 'advisor', null),
  ('15a11111-0000-0000-0000-0000000000a2', '15aaaaaa-0000-0000-0000-000000000000', 'Rémi', 'Retiré', 'ra@a15a.test', 'advisor', now()),
  ('15a11111-0000-0000-0000-0000000000a3', '15aaaaaa-0000-0000-0000-000000000000', 'Annie', 'Auteure', 'aa@a15a.test', 'advisor', null),
  ('15a11111-0000-0000-0000-0000000000b1', '15abbbbb-0000-0000-0000-000000000000', 'Boris', 'Conseiller', 'cb@b15a.test', 'advisor', null);
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('15aaaaaa-1111-0000-0000-000000000000', '15aaaaaa-0000-0000-0000-000000000000', '15a11111-0000-0000-0000-0000000000a1', 'Vendeur A', 'draft'),
  ('15abbbbb-1111-0000-0000-000000000000', '15abbbbb-0000-0000-0000-000000000000', '15a11111-0000-0000-0000-0000000000b1', 'Vendeur B', 'draft');
insert into public.comparables (id, agency_id, project_id, title, price, surface_area, is_selected, display_order) values
  ('15aaaaaa-2222-0000-0000-000000000001', '15aaaaaa-0000-0000-0000-000000000000', '15aaaaaa-1111-0000-0000-000000000000', 'Maison 1', 700000, 140, true, 1),
  ('15aaaaaa-2222-0000-0000-000000000002', '15aaaaaa-0000-0000-0000-000000000000', '15aaaaaa-1111-0000-0000-000000000000', 'Maison 2', 720000, 150, true, 2),
  ('15abbbbb-2222-0000-0000-000000000001', '15abbbbb-0000-0000-0000-000000000000', '15abbbbb-1111-0000-0000-000000000000', 'Maison B', 650000, 130, true, 1);

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


insert into public.subject_properties (agency_id, project_id, address, postal_code, city) values
  ('15aaaaaa-0000-0000-0000-000000000000', '15aaaaaa-1111-0000-0000-000000000000', '4 chemin des Restanques Hautes', '06140', 'Vence');

-- §1 — l'adresse du bien au collage, posée par la base.
select pg_temp.act_as('15a11111-0000-0000-0000-0000000000a1');
select pg_temp.expect('§1 le conseiller colle le lien',
  pg_temp.attempt($q$update public.projects set academia_living_here_url = 'https://app.myacademia.ai/l/a1'
    where id = '15aaaaaa-1111-0000-0000-000000000000'$q$), '1');
select pg_temp.expect('§1 … la base garde l''adresse du bien',
  (select academia_living_here_property::text from public.projects where id = '15aaaaaa-1111-0000-0000-000000000000'),
  '{"city": "Vence", "address": "4 chemin des Restanques Hautes", "postal_code": "06140"}');
select pg_temp.expect('§1 le navigateur ne la choisit pas',
  pg_temp.attempt($q$update public.projects set academia_living_here_property = '{"address": "ailleurs", "postal_code": "06000", "city": "Nice"}'
    where id = '15aaaaaa-1111-0000-0000-000000000000'$q$), '1');
select pg_temp.expect('§1 … elle reste celle du collage',
  (select academia_living_here_property->>'address' from public.projects where id = '15aaaaaa-1111-0000-0000-000000000000'),
  '4 chemin des Restanques Hautes');
reset role;
update public.projects set academia_living_here_property = null where id = '15aaaaaa-1111-0000-0000-000000000000';
select pg_temp.expect('§1 ni à la main, hors du navigateur',
  (select academia_living_here_property->>'city' from public.projects where id = '15aaaaaa-1111-0000-0000-000000000000'), 'Vence');

-- §2 — l'adresse du bien change ensuite : la colonne garde celle du collage.
update public.subject_properties set address = '12 rue Neuve' where project_id = '15aaaaaa-1111-0000-0000-000000000000';
select pg_temp.expect('§2 l''adresse du collage ne suit pas le bien',
  (select academia_living_here_property->>'address' from public.projects where id = '15aaaaaa-1111-0000-0000-000000000000'),
  '4 chemin des Restanques Hautes');
select pg_temp.act_as('15a11111-0000-0000-0000-0000000000a1');
select pg_temp.expect('§2 une autre colonne modifiée la garde',
  pg_temp.attempt($q$update public.projects set seller_name = 'Vendeur A bis' where id = '15aaaaaa-1111-0000-0000-000000000000'$q$), '1');
select pg_temp.expect('§2 … toujours celle du collage',
  (select academia_living_here_property->>'address' from public.projects where id = '15aaaaaa-1111-0000-0000-000000000000'),
  '4 chemin des Restanques Hautes');
select pg_temp.expect('§2 un lien neuf prend la nouvelle adresse',
  pg_temp.attempt($q$update public.projects set academia_living_here_url = 'https://app.myacademia.ai/l/a2'
    where id = '15aaaaaa-1111-0000-0000-000000000000'$q$), '1');
select pg_temp.expect('§2 … 12 rue Neuve',
  (select academia_living_here_property->>'address' from public.projects where id = '15aaaaaa-1111-0000-0000-000000000000'), '12 rue Neuve');

-- §3 — retirer le lien vide l'adresse ; un dossier sans bien vendeur n'en a pas.
select pg_temp.expect('§3 retirer le lien',
  pg_temp.attempt($q$update public.projects set academia_living_here_url = null where id = '15aaaaaa-1111-0000-0000-000000000000'$q$), '1');
select pg_temp.expect('§3 … l''adresse est vidée',
  (select coalesce(academia_living_here_property::text, 'nulle') from public.projects where id = '15aaaaaa-1111-0000-0000-000000000000'), 'nulle');
reset role;
select pg_temp.expect('§3 un dossier créé avec son lien, sans bien vendeur',
  pg_temp.attempt($q$insert into public.projects (id, agency_id, advisor_id, seller_name, status, academia_living_here_url)
    values ('15aaaaaa-1111-0000-0000-000000000002', '15aaaaaa-0000-0000-0000-000000000000', '15a11111-0000-0000-0000-0000000000a1', 'Vendeur C', 'draft', 'https://app.myacademia.ai/l/a3')$q$), '1');
select pg_temp.expect('§3 … daté, sans adresse',
  (select (academia_living_here_pasted_at = now())::text || ' ' || coalesce(academia_living_here_property::text, 'nulle')
     from public.projects where id = '15aaaaaa-1111-0000-0000-000000000002'), 'true nulle');
select pg_temp.act_as('15a11111-0000-0000-0000-0000000000b1');
select pg_temp.expect('§3 une autre agence ne lit pas l''adresse du collage',
  (select count(*)::text from public.projects where id = '15aaaaaa-1111-0000-0000-000000000002'), '0');
reset role;
select pg_temp.expect('§3 la fonction est fermée au navigateur',
  has_function_privilege('authenticated', 'public.date_academia_living_here_link()', 'execute')::text, 'false');

rollback;
