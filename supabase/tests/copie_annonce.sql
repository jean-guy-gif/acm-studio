-- Mission 152 (partie A) — la copie de l'annonce et la vérification des annonces, prouvées dans la
-- base :
--   §1 l'agence lit la copie ; une autre agence, un membre retiré et un visiteur non connecté, rien ;
--      le navigateur n'en écrit, n'en modifie ni n'en supprime aucune ;
--   §2 la clé de service l'écrit une fois : une seule par concurrent, jamais modifiée (clé de service
--      comprise), le concurrent de ce dossier et de cette agence, ni prix nul, ni date dans l'avenir,
--      source, photos et faits de la bonne forme ; une date passée est permise (la démo date ses
--      faits) ;
--   §3 elle part avec son concurrent (cascade), et rien ne reste d'un dossier effacé ;
--   §4 `projects.listings_checked_at` : nulle par défaut, posée par le conseiller de l'agence à
--      l'heure de la base (jamais une date de l'avenir), ni par une autre agence ni par un membre
--      retiré.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/copie_annonce.sql

begin;

insert into auth.users (id, email) values
  ('15211111-0000-0000-0000-0000000000a1', 'ca@a152.test'),
  ('15211111-0000-0000-0000-0000000000a2', 'ra@a152.test'),
  ('15211111-0000-0000-0000-0000000000b1', 'cb@b152.test');
insert into public.agencies (id, name) values
  ('152aaaaa-0000-0000-0000-000000000000', 'Agence A 152'),
  ('152bbbbb-0000-0000-0000-000000000000', 'Agence B 152');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, removed_at) values
  ('15211111-0000-0000-0000-0000000000a1', '152aaaaa-0000-0000-0000-000000000000', 'Carl', 'Conseiller', 'ca@a152.test', 'advisor', null),
  ('15211111-0000-0000-0000-0000000000a2', '152aaaaa-0000-0000-0000-000000000000', 'Rémi', 'Retiré', 'ra@a152.test', 'advisor', now()),
  ('15211111-0000-0000-0000-0000000000b1', '152bbbbb-0000-0000-0000-000000000000', 'Boris', 'Conseiller', 'cb@b152.test', 'advisor', null);
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('152aaaaa-1111-0000-0000-000000000000', '152aaaaa-0000-0000-0000-000000000000', '15211111-0000-0000-0000-0000000000a1', 'Vendeur A', 'draft'),
  ('152aaaaa-1111-0000-0000-000000000002', '152aaaaa-0000-0000-0000-000000000000', '15211111-0000-0000-0000-0000000000a1', 'Vendeur A bis', 'draft'),
  ('152bbbbb-1111-0000-0000-000000000000', '152bbbbb-0000-0000-0000-000000000000', '15211111-0000-0000-0000-0000000000b1', 'Vendeur B', 'draft');
insert into public.comparables (id, agency_id, project_id, title, price, surface_area, is_selected, display_order) values
  ('152aaaaa-2222-0000-0000-000000000001', '152aaaaa-0000-0000-0000-000000000000', '152aaaaa-1111-0000-0000-000000000000', 'Maison 1', 700000, 140, true, 1),
  ('152aaaaa-2222-0000-0000-000000000002', '152aaaaa-0000-0000-0000-000000000000', '152aaaaa-1111-0000-0000-000000000000', 'Maison 2', 720000, 150, true, 2),
  ('152aaaaa-2222-0000-0000-000000000003', '152aaaaa-0000-0000-0000-000000000000', '152aaaaa-1111-0000-0000-000000000002', 'Maison 3', 690000, 135, true, 1),
  ('152bbbbb-2222-0000-0000-000000000001', '152bbbbb-0000-0000-0000-000000000000', '152bbbbb-1111-0000-0000-000000000000', 'Maison B', 650000, 130, true, 1);

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

-- §2 — la clé de service écrit (d'abord, pour que §1 ait une ligne à lire).
select pg_temp.act_as_service();
select pg_temp.expect('§2 la copie d''une page lue s''écrit',
  pg_temp.attempt($$insert into public.competitor_listing_copies
    (agency_id, project_id, comparable_id, source, portal, listing_key, price, listing_text, photo_urls, facts) values
    ('152aaaaa-0000-0000-0000-000000000000', '152aaaaa-1111-0000-0000-000000000000', '152aaaaa-2222-0000-0000-000000000001',
     'page', 'seloger', 'seloger:123', 700000, 'Belle maison', '["https://exemple.invalid/1.jpg"]', '{"rooms":5}')$$), '1');
select pg_temp.expect('§2 une date passée est permise (la démo date ses faits)',
  pg_temp.attempt($$insert into public.competitor_listing_copies
    (agency_id, project_id, comparable_id, source, captured_at, price) values
    ('152aaaaa-0000-0000-0000-000000000000', '152aaaaa-1111-0000-0000-000000000000', '152aaaaa-2222-0000-0000-000000000002',
     'search', now() - interval '30 days', 720000)$$), '1');
select pg_temp.expect('§2 la copie de B s''écrit dans B',
  pg_temp.attempt($$insert into public.competitor_listing_copies
    (agency_id, project_id, comparable_id, source, price) values
    ('152bbbbb-0000-0000-0000-000000000000', '152bbbbb-1111-0000-0000-000000000000', '152bbbbb-2222-0000-0000-000000000001', 'page', 650000)$$), '1');
select pg_temp.expect('§2 une seule copie par concurrent',
  pg_temp.attempt($$insert into public.competitor_listing_copies
    (agency_id, project_id, comparable_id, source, price) values
    ('152aaaaa-0000-0000-0000-000000000000', '152aaaaa-1111-0000-0000-000000000000', '152aaaaa-2222-0000-0000-000000000001', 'page', 690000)$$), 'doublon');
select pg_temp.expect('§2 « on conflict do nothing » laisse la première copie',
  pg_temp.attempt($$insert into public.competitor_listing_copies
    (agency_id, project_id, comparable_id, source, price) values
    ('152aaaaa-0000-0000-0000-000000000000', '152aaaaa-1111-0000-0000-000000000000', '152aaaaa-2222-0000-0000-000000000001', 'page', 690000)
    on conflict (comparable_id) do nothing$$), '0');
select pg_temp.expect('§2 la première copie est restée',
  (select price::text from public.competitor_listing_copies where comparable_id = '152aaaaa-2222-0000-0000-000000000001'), '700000');
select pg_temp.expect('§2 jamais modifiée, clé de service comprise',
  pg_temp.attempt($$update public.competitor_listing_copies set price = 1
    where comparable_id = '152aaaaa-2222-0000-0000-000000000001'$$), 'contrainte');
select pg_temp.expect('§2 le concurrent d''un autre dossier : refusé',
  pg_temp.attempt($$insert into public.competitor_listing_copies
    (agency_id, project_id, comparable_id, source, price) values
    ('152aaaaa-0000-0000-0000-000000000000', '152aaaaa-1111-0000-0000-000000000000', '152aaaaa-2222-0000-0000-000000000003', 'page', 690000)$$), 'contrainte');
select pg_temp.expect('§2 le concurrent d''une autre agence : refusé',
  pg_temp.attempt($$insert into public.competitor_listing_copies
    (agency_id, project_id, comparable_id, source, price) values
    ('152aaaaa-0000-0000-0000-000000000000', '152bbbbb-1111-0000-0000-000000000000', '152bbbbb-2222-0000-0000-000000000001', 'page', 650000)$$), 'contrainte');
select pg_temp.expect('§2 une date dans l''avenir : refusée',
  pg_temp.attempt($$insert into public.competitor_listing_copies
    (agency_id, project_id, comparable_id, source, captured_at, price) values
    ('152aaaaa-0000-0000-0000-000000000000', '152aaaaa-1111-0000-0000-000000000002', '152aaaaa-2222-0000-0000-000000000003',
     'page', now() + interval '1 day', 690000)$$), 'contrainte');
select pg_temp.expect('§2 un prix nul : refusé',
  pg_temp.attempt($$insert into public.competitor_listing_copies
    (agency_id, project_id, comparable_id, source, price) values
    ('152aaaaa-0000-0000-0000-000000000000', '152aaaaa-1111-0000-0000-000000000002', '152aaaaa-2222-0000-0000-000000000003', 'page', 0)$$), 'contrainte');
select pg_temp.expect('§2 une source hors liste : refusée',
  pg_temp.attempt($$insert into public.competitor_listing_copies
    (agency_id, project_id, comparable_id, source, price) values
    ('152aaaaa-0000-0000-0000-000000000000', '152aaaaa-1111-0000-0000-000000000002', '152aaaaa-2222-0000-0000-000000000003', 'manual', 690000)$$), 'contrainte');
select pg_temp.expect('§2 des photos qui ne sont pas une liste : refusées',
  pg_temp.attempt($$insert into public.competitor_listing_copies
    (agency_id, project_id, comparable_id, source, price, photo_urls) values
    ('152aaaaa-0000-0000-0000-000000000000', '152aaaaa-1111-0000-0000-000000000002', '152aaaaa-2222-0000-0000-000000000003', 'page', 690000, '{"a":1}')$$), 'contrainte');
select pg_temp.expect('§2 plus de 40 photos : refusées',
  pg_temp.attempt($$insert into public.competitor_listing_copies
    (agency_id, project_id, comparable_id, source, price, photo_urls) values
    ('152aaaaa-0000-0000-0000-000000000000', '152aaaaa-1111-0000-0000-000000000002', '152aaaaa-2222-0000-0000-000000000003', 'page', 690000,
     (select jsonb_agg('https://exemple.invalid/' || g) from generate_series(1, 41) g))$$), 'contrainte');
select pg_temp.expect('§2 des faits qui ne sont pas un objet : refusés',
  pg_temp.attempt($$insert into public.competitor_listing_copies
    (agency_id, project_id, comparable_id, source, price, facts) values
    ('152aaaaa-0000-0000-0000-000000000000', '152aaaaa-1111-0000-0000-000000000002', '152aaaaa-2222-0000-0000-000000000003', 'page', 690000, '[1]')$$), 'contrainte');
select pg_temp.expect('§2 un texte de plus de 20 000 caractères : refusé',
  pg_temp.attempt($$insert into public.competitor_listing_copies
    (agency_id, project_id, comparable_id, source, price, listing_text) values
    ('152aaaaa-0000-0000-0000-000000000000', '152aaaaa-1111-0000-0000-000000000002', '152aaaaa-2222-0000-0000-000000000003', 'page', 690000, repeat('a', 20001))$$), 'contrainte');
select pg_temp.expect('§2 la fonction du déclencheur est fermée au navigateur',
  has_function_privilege('authenticated', 'public.check_competitor_listing_copy()', 'execute')::text, 'false');
select pg_temp.expect('§2 la clé de service supprime une copie (effacement B)',
  pg_temp.attempt($$delete from public.competitor_listing_copies
    where comparable_id = '152bbbbb-2222-0000-0000-000000000001'$$), '1');
select pg_temp.expect('§2 puis la réécrit (le concurrent de B garde sa copie pour §3)',
  pg_temp.attempt($$insert into public.competitor_listing_copies
    (agency_id, project_id, comparable_id, source, price) values
    ('152bbbbb-0000-0000-0000-000000000000', '152bbbbb-1111-0000-0000-000000000000', '152bbbbb-2222-0000-0000-000000000001', 'page', 650000)$$), '1');

-- §1 — lectures et écritures du navigateur.
select pg_temp.act_as('15211111-0000-0000-0000-0000000000a1');
select pg_temp.expect('§1 le conseiller lit les copies de son agence',
  (select count(*)::text from public.competitor_listing_copies), '2');
select pg_temp.expect('§1 le navigateur n''écrit pas de copie',
  pg_temp.attempt($$insert into public.competitor_listing_copies
    (agency_id, project_id, comparable_id, source, price) values
    ('152aaaaa-0000-0000-0000-000000000000', '152aaaaa-1111-0000-0000-000000000002', '152aaaaa-2222-0000-0000-000000000003', 'page', 690000)$$), 'refus');
select pg_temp.expect('§1 ni n''en modifie',
  pg_temp.attempt($$update public.competitor_listing_copies set listing_text = 'autre'$$), 'refus');
select pg_temp.expect('§1 ni n''en supprime',
  pg_temp.attempt($$delete from public.competitor_listing_copies$$), 'refus');
select pg_temp.act_as('15211111-0000-0000-0000-0000000000b1');
select pg_temp.expect('§1 une autre agence ne lit que la sienne',
  (select count(*)::text from public.competitor_listing_copies where agency_id = '152aaaaa-0000-0000-0000-000000000000'), '0');
select pg_temp.act_as('15211111-0000-0000-0000-0000000000a2');
select pg_temp.expect('§1 un membre retiré ne lit rien', (select count(*)::text from public.competitor_listing_copies), '0');
select pg_temp.act_as_anon();
select pg_temp.expect('§1 un visiteur non connecté ne lit rien',
  pg_temp.attempt($$select 1 from public.competitor_listing_copies$$), 'refus');

-- §4 — la date de la vérification des annonces.
select pg_temp.act_as('15211111-0000-0000-0000-0000000000a1');
select pg_temp.expect('§4 nulle par défaut',
  (select (listings_checked_at is null)::text from public.projects where id = '152aaaaa-1111-0000-0000-000000000000'), 'true');
select pg_temp.expect('§4 le conseiller de l''agence la pose',
  pg_temp.attempt($$update public.projects set listings_checked_at = now()
    where id = '152aaaaa-1111-0000-0000-000000000000'$$), '1');
select pg_temp.expect('§4 une date dans l''avenir devient l''heure de la base',
  pg_temp.attempt($$update public.projects set listings_checked_at = now() + interval '30 days'
    where id = '152aaaaa-1111-0000-0000-000000000002'$$), '1');
select pg_temp.expect('§4 … relue : pas dans l''avenir',
  (select (listings_checked_at <= now())::text from public.projects where id = '152aaaaa-1111-0000-0000-000000000002'), 'true');
select pg_temp.expect('§4 la vider reste permis',
  pg_temp.attempt($$update public.projects set listings_checked_at = null
    where id = '152aaaaa-1111-0000-0000-000000000002'$$), '1');
select pg_temp.expect('§4 la fonction du déclencheur est fermée au navigateur',
  has_function_privilege('authenticated', 'public.date_listings_check()', 'execute')::text, 'false');
select pg_temp.expect('§4 une autre agence ne la pose pas',
  pg_temp.attempt($$update public.projects set listings_checked_at = now()
    where id = '152bbbbb-1111-0000-0000-000000000000'$$), '0');
select pg_temp.act_as('15211111-0000-0000-0000-0000000000a2');
select pg_temp.expect('§4 un membre retiré ne la pose pas',
  pg_temp.attempt($$update public.projects set listings_checked_at = now()
    where id = '152aaaaa-1111-0000-0000-000000000000'$$), '0');

-- §3 — les cascades.
select pg_temp.act_as_service();
delete from public.comparables where id = '152aaaaa-2222-0000-0000-000000000002';
select pg_temp.expect('§3 la copie part avec son concurrent',
  (select count(*)::text from public.competitor_listing_copies where comparable_id = '152aaaaa-2222-0000-0000-000000000002'), '0');
-- Comme la procédure d'effacement (A) : les concurrents d'abord, puis le dossier.
delete from public.comparables where project_id = '152aaaaa-1111-0000-0000-000000000000';
delete from public.projects where id = '152aaaaa-1111-0000-0000-000000000000';
select pg_temp.expect('§3 le dossier effacé ne laisse aucune copie',
  (select count(*)::text from public.competitor_listing_copies where project_id = '152aaaaa-1111-0000-0000-000000000000'), '0');
select pg_temp.expect('§3 la copie de B ne bouge pas',
  (select count(*)::text from public.competitor_listing_copies where agency_id = '152bbbbb-0000-0000-0000-000000000000'), '1');

rollback;
