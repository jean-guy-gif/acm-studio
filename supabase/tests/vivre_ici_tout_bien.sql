-- Mission 156 — « Vivre ici » sur tout bien d'une sélection acquéreur, prouvé dans la base :
--   §1 l'agence lit ses liens ; une autre agence, un membre retiré et un visiteur non connecté, rien ;
--      le navigateur n'en écrit, n'en modifie ni n'en supprime aucun ;
--   §2 la clé de service l'écrit : un lien par bien et par agence ; seulement un lien d'Academia
--      (500 caractères au plus) ; une clé `listing:` ou `competitor:`, jamais `project:` ; un
--      concurrent de cette agence, rattaché (et le lien part avec lui) ; un auteur de cette agence ;
--      la date du collage est l'heure de la base, gardée tant que le lien ne change pas ; le bien et
--      l'agence d'un lien ne changent pas ;
--   §3 la date du lien d'un mandat (`projects.academia_living_here_pasted_at`) : posée par la base
--      quand le lien change, vidée quand il est retiré, jamais écrite par le navigateur ; nulle pour
--      un lien d'avant ; `updated_at` immobile ;
--   §4 la purge d'un an : un lien collé il y a plus d'un an part, un plus récent reste ; planifiée
--      chaque nuit, fermée au navigateur.
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

-- §2 — la clé de service écrit (d'abord, pour que §1 ait des lignes à lire).
select pg_temp.act_as_service();
select pg_temp.expect('§2 le lien d''une annonce du marché s''écrit',
  pg_temp.attempt($q$insert into public.property_living_here_links (agency_id, property_key, url, pasted_by)
    values ('156aaaaa-0000-0000-0000-000000000000', 'listing:seloger:123456', 'https://app.myacademia.ai/l/abc.DEF_1~2-3', '15611111-0000-0000-0000-0000000000a3')$q$), '1');
select pg_temp.expect('§2 une annonce sans identité reconnue, par son adresse',
  pg_temp.attempt($q$insert into public.property_living_here_links (agency_id, property_key, url)
    values ('156aaaaa-0000-0000-0000-000000000000', 'listing:https://annonces.exemple.fr/a/9', 'https://app.myacademia.ai/l/k7')$q$), '1');
select pg_temp.expect('§2 le lien d''un concurrent de l''agence s''écrit',
  pg_temp.attempt($q$insert into public.property_living_here_links (agency_id, property_key, url, comparable_id)
    values ('156aaaaa-0000-0000-0000-000000000000', 'competitor:156aaaaa-2222-0000-0000-000000000001', 'https://app.myacademia.ai/l/c1', '156aaaaa-2222-0000-0000-000000000002')$q$), '1');
select pg_temp.expect('§2 … rattaché par la base au concurrent de sa clé (jamais à celui envoyé)',
  (select comparable_id::text from public.property_living_here_links where property_key like 'competitor:%'),
  '156aaaaa-2222-0000-0000-000000000001');
select pg_temp.expect('§2 une annonce n''est rattachée à aucun concurrent',
  pg_temp.attempt($q$insert into public.property_living_here_links (agency_id, property_key, url, comparable_id)
    values ('156bbbbb-0000-0000-0000-000000000000', 'listing:seloger:123456', 'https://app.myacademia.ai/l/b1', '156bbbbb-2222-0000-0000-000000000001')$q$), '1');
select pg_temp.expect('§2 … même si on le lui demande (et une autre agence a la même annonce)',
  (select coalesce(comparable_id::text, 'aucun') from public.property_living_here_links
    where agency_id = '156bbbbb-0000-0000-0000-000000000000'), 'aucun');
select pg_temp.expect('§2 un lien par bien et par agence',
  pg_temp.attempt($q$insert into public.property_living_here_links (agency_id, property_key, url)
    values ('156aaaaa-0000-0000-0000-000000000000', 'listing:seloger:123456', 'https://app.myacademia.ai/l/autre')$q$), 'doublon');
select pg_temp.expect('§2 un concurrent d''une autre agence : refusé',
  pg_temp.attempt($q$insert into public.property_living_here_links (agency_id, property_key, url)
    values ('156aaaaa-0000-0000-0000-000000000000', 'competitor:156bbbbb-2222-0000-0000-000000000001', 'https://app.myacademia.ai/l/x')$q$), 'contrainte');
select pg_temp.expect('§2 un concurrent qui n''existe pas : refusé',
  pg_temp.attempt($q$insert into public.property_living_here_links (agency_id, property_key, url)
    values ('156aaaaa-0000-0000-0000-000000000000', 'competitor:156aaaaa-2222-0000-0000-0000000000ff', 'https://app.myacademia.ai/l/x')$q$), 'contrainte');
select pg_temp.expect('§2 jamais une clé de mandat (project:)',
  pg_temp.attempt($q$insert into public.property_living_here_links (agency_id, property_key, url)
    values ('156aaaaa-0000-0000-0000-000000000000', 'project:156aaaaa-1111-0000-0000-000000000000', 'https://app.myacademia.ai/l/x')$q$), 'contrainte');
select pg_temp.expect('§2 une clé de forme inconnue : refusée',
  pg_temp.attempt($q$insert into public.property_living_here_links (agency_id, property_key, url)
    values ('156aaaaa-0000-0000-0000-000000000000', 'rue des Lilas 12', 'https://app.myacademia.ai/l/x')$q$), 'contrainte');
select pg_temp.expect('§2 un concurrent de forme incomplète : refusé',
  pg_temp.attempt($q$insert into public.property_living_here_links (agency_id, property_key, url)
    values ('156aaaaa-0000-0000-0000-000000000000', 'competitor:156aaaaa-2222-0000-0000-00000000000', 'https://app.myacademia.ai/l/x')$q$), 'contrainte');
select pg_temp.expect('§2 un autre site qu''Academia : refusé',
  pg_temp.attempt($q$insert into public.property_living_here_links (agency_id, property_key, url)
    values ('156aaaaa-0000-0000-0000-000000000000', 'listing:bienici:1', 'https://exemple.fr/l/x')$q$), 'contrainte');
select pg_temp.expect('§2 un lien d''Academia avec un chemin de plus : refusé',
  pg_temp.attempt($q$insert into public.property_living_here_links (agency_id, property_key, url)
    values ('156aaaaa-0000-0000-0000-000000000000', 'listing:bienici:1', 'https://app.myacademia.ai/l/x?adresse=12+rue')$q$), 'contrainte');
select pg_temp.expect('§2 une clé de plus de 2 100 octets : refusée',
  pg_temp.attempt($q$insert into public.property_living_here_links (agency_id, property_key, url)
    values ('156aaaaa-0000-0000-0000-000000000000', 'listing:https://annonces.exemple.fr/' || repeat('é', 1100), 'https://app.myacademia.ai/l/x')$q$), 'contrainte');
select pg_temp.expect('§2 plus de 500 caractères : refusé',
  pg_temp.attempt($q$insert into public.property_living_here_links (agency_id, property_key, url)
    values ('156aaaaa-0000-0000-0000-000000000000', 'listing:bienici:1', 'https://app.myacademia.ai/l/' || repeat('a', 480))$q$), 'contrainte');
select pg_temp.expect('§2 un auteur d''une autre agence : refusé',
  pg_temp.attempt($q$insert into public.property_living_here_links (agency_id, property_key, url, pasted_by)
    values ('156aaaaa-0000-0000-0000-000000000000', 'listing:bienici:1', 'https://app.myacademia.ai/l/x', '15611111-0000-0000-0000-0000000000b1')$q$), 'contrainte');
select pg_temp.expect('§2 une date de collage envoyée est remplacée par l''heure de la base',
  pg_temp.attempt($q$insert into public.property_living_here_links (agency_id, property_key, url, pasted_at)
    values ('156aaaaa-0000-0000-0000-000000000000', 'listing:bienici:2', 'https://app.myacademia.ai/l/x', now() - interval '40 days')$q$), '1');
select pg_temp.expect('§2 … c''est bien l''heure de la base',
  (select (pasted_at = now())::text from public.property_living_here_links where property_key = 'listing:bienici:2'), 'true');
-- Un lien collé il y a 26 jours (la base le date ; ici on vieillit la ligne, déclencheur coupé).
reset role;
alter table public.property_living_here_links disable trigger property_living_here_links_check;
update public.property_living_here_links set pasted_at = now() - interval '26 days' where property_key = 'listing:bienici:2';
alter table public.property_living_here_links enable trigger property_living_here_links_check;
select pg_temp.act_as_service();
select pg_temp.expect('§2 la même adresse réécrite garde sa date',
  pg_temp.attempt($q$update public.property_living_here_links set url = 'https://app.myacademia.ai/l/x', pasted_at = now()
    where property_key = 'listing:bienici:2'$q$), '1');
select pg_temp.expect('§2 … 26 jours, toujours',
  (select (pasted_at = now() - interval '26 days')::text from public.property_living_here_links where property_key = 'listing:bienici:2'), 'true');
select pg_temp.expect('§2 un lien neuf repart du jour',
  pg_temp.attempt($q$update public.property_living_here_links set url = 'https://app.myacademia.ai/l/neuf'
    where property_key = 'listing:bienici:2'$q$), '1');
select pg_temp.expect('§2 … à l''heure de la base',
  (select (pasted_at = now())::text from public.property_living_here_links where property_key = 'listing:bienici:2'), 'true');
select pg_temp.expect('§2 le bien d''un lien ne change pas',
  pg_temp.attempt($q$update public.property_living_here_links set property_key = 'listing:bienici:3'
    where property_key = 'listing:bienici:2'$q$), 'contrainte');
select pg_temp.expect('§2 l''agence d''un lien ne change pas',
  pg_temp.attempt($q$update public.property_living_here_links set agency_id = '156bbbbb-0000-0000-0000-000000000000'
    where property_key = 'listing:bienici:2'$q$), 'contrainte');
select pg_temp.expect('§2 la fonction du déclencheur est fermée au navigateur',
  has_function_privilege('authenticated', 'public.check_property_living_here_link()', 'execute')::text, 'false');

-- §1 — lectures et écritures du navigateur.
select pg_temp.act_as('15611111-0000-0000-0000-0000000000a1');
select pg_temp.expect('§1 le conseiller lit les liens de son agence',
  (select count(*)::text from public.property_living_here_links), '4');
select pg_temp.expect('§1 le navigateur n''écrit pas de lien',
  pg_temp.attempt($q$insert into public.property_living_here_links (agency_id, property_key, url)
    values ('156aaaaa-0000-0000-0000-000000000000', 'listing:bienici:9', 'https://app.myacademia.ai/l/x')$q$), 'refus');
select pg_temp.expect('§1 ni n''en modifie',
  pg_temp.attempt($q$update public.property_living_here_links set url = 'https://app.myacademia.ai/l/y'$q$), 'refus');
select pg_temp.expect('§1 ni n''en supprime',
  pg_temp.attempt($q$delete from public.property_living_here_links$q$), 'refus');
select pg_temp.act_as('15611111-0000-0000-0000-0000000000b1');
select pg_temp.expect('§1 une autre agence ne lit que la sienne',
  (select string_agg(property_key, ',') from public.property_living_here_links), 'listing:seloger:123456');
select pg_temp.act_as('15611111-0000-0000-0000-0000000000a2');
select pg_temp.expect('§1 un membre retiré ne lit rien',
  (select count(*)::text from public.property_living_here_links), '0');
select pg_temp.act_as_anon();
select pg_temp.expect('§1 un visiteur non connecté ne lit rien',
  pg_temp.attempt($q$select 1 from public.property_living_here_links$q$), 'refus');

-- §2 — le lien part avec son concurrent ; l'auteur supprimé laisse le lien.
reset role;
delete from public.comparables where id = '156aaaaa-2222-0000-0000-000000000001';
select pg_temp.expect('§2 le lien part avec son concurrent',
  (select count(*)::text from public.property_living_here_links where property_key like 'competitor:%'), '0');
select pg_temp.expect('§2 les autres liens restent',
  (select count(*)::text from public.property_living_here_links), '4');
alter table public.property_living_here_links disable trigger property_living_here_links_check;
update public.property_living_here_links set pasted_at = now() - interval '20 days'
  where property_key = 'listing:seloger:123456' and agency_id = '156aaaaa-0000-0000-0000-000000000000';
alter table public.property_living_here_links enable trigger property_living_here_links_check;
delete from public.profiles where id = '15611111-0000-0000-0000-0000000000a3';
select pg_temp.expect('§2 l''auteur supprimé laisse le lien, sans auteur, avec sa date',
  (select (pasted_by is null and pasted_at = now() - interval '20 days' and comparable_id is null)::text
     from public.property_living_here_links
    where property_key = 'listing:seloger:123456' and agency_id = '156aaaaa-0000-0000-0000-000000000000'),
  'true');

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

-- §4 — la purge d'un an.
alter table public.property_living_here_links disable trigger property_living_here_links_check;
update public.property_living_here_links set pasted_at = now() - interval '1 year 1 day'
  where property_key = 'listing:seloger:123456' and agency_id = '156aaaaa-0000-0000-0000-000000000000';
update public.property_living_here_links set pasted_at = now() - interval '364 days'
  where property_key = 'listing:https://annonces.exemple.fr/a/9';
alter table public.property_living_here_links enable trigger property_living_here_links_check;
select pg_temp.expect('§4 la purge efface un seul lien',
  (select public.purge_stale_living_here_links()::text), '1');
select pg_temp.expect('§4 … celui collé il y a plus d''un an',
  (select count(*)::text from public.property_living_here_links
    where property_key = 'listing:seloger:123456' and agency_id = '156aaaaa-0000-0000-0000-000000000000'), '0');
select pg_temp.expect('§4 les autres restent',
  (select count(*)::text from public.property_living_here_links), '3');
select pg_temp.expect('§4 une seconde passe n''efface rien',
  (select public.purge_stale_living_here_links()::text), '0');
select pg_temp.expect('§4 la purge est planifiée chaque nuit, une seule fois',
  (select string_agg(schedule || ' ' || command, ' ; ') from cron.job
    where jobname = 'purge-stale-living-here-links' and active),
  '32 3 * * * select public.purge_stale_living_here_links()');
select pg_temp.expect('§4 le navigateur ne déclenche pas la purge',
  (has_function_privilege('authenticated', 'public.purge_stale_living_here_links()', 'execute')
   or has_function_privilege('anon', 'public.purge_stale_living_here_links()', 'execute'))::text,
  'false');

rollback;
