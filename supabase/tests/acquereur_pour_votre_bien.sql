-- Mission 120 (partie A) — les biens démarchés depuis une recherche acquéreur, prouvés dans la base :
--   §1 l'agence lit ses biens démarchés et leurs origines, jamais ceux d'une autre agence, un membre
--      retiré rien ; le navigateur n'écrit, ne modifie ni ne retire rien ;
--   §2 une carte par annonce et par agence ; une origine par bien retenu ; une origine désigne
--      un bien démarché OU un concurrent, jamais les deux ni aucun ; listes fermées ; l'agence de
--      l'origine est celle de sa fiche, de son bien retenu et de sa carte, vérifiée par la base ;
--   §3 la date de l'adresse est posée par la base ; la collaboration suit le contact (M115) ;
--   §4 la purge efface l'adresse après 3 ans sans contact, et elle seule ; fermée au navigateur ;
--   §5 une origine part avec son bien retenu, sa fiche, son bien démarché ou son concurrent.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/acquereur_pour_votre_bien.sql

begin;

insert into auth.users (id, email) values
  ('12011111-0000-0000-0000-0000000000a1', 'ca@a120.test'),
  ('12011111-0000-0000-0000-0000000000a2', 'ra@a120.test'),
  ('12011111-0000-0000-0000-0000000000b1', 'cb@b120.test');
insert into public.agencies (id, name) values
  ('120aaaaa-0000-0000-0000-000000000000', 'Agence A 120'),
  ('120bbbbb-0000-0000-0000-000000000000', 'Agence B 120');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, removed_at) values
  ('12011111-0000-0000-0000-0000000000a1', '120aaaaa-0000-0000-0000-000000000000', 'Carl', 'Conseiller', 'ca@a120.test', 'advisor', null),
  ('12011111-0000-0000-0000-0000000000a2', '120aaaaa-0000-0000-0000-000000000000', 'Rémi', 'Retiré', 'ra@a120.test', 'advisor', now()),
  ('12011111-0000-0000-0000-0000000000b1', '120bbbbb-0000-0000-0000-000000000000', 'Boris', 'Conseiller', 'cb@b120.test', 'advisor', null);
insert into public.buyers (id, agency_id, advisor_id, name, cities) values
  ('120aaaaa-1111-0000-0000-000000000000', '120aaaaa-0000-0000-0000-000000000000', '12011111-0000-0000-0000-0000000000a1', 'Famille Test', array['Mougins']);
insert into public.buyer_selections (id, agency_id, buyer_id) values
  ('120aaaaa-2222-0000-0000-000000000000', '120aaaaa-0000-0000-0000-000000000000', '120aaaaa-1111-0000-0000-000000000000');
insert into public.buyer_selection_items (id, agency_id, selection_id, position, source, reference, label) values
  ('120aaaaa-3333-0000-0000-000000000001', '120aaaaa-0000-0000-0000-000000000000', '120aaaaa-2222-0000-0000-000000000000', 1, 'listing', 'https://exemple.invalid/a', 'Maison · Mougins'),
  ('120aaaaa-3333-0000-0000-000000000002', '120aaaaa-0000-0000-0000-000000000000', '120aaaaa-2222-0000-0000-000000000000', 2, 'competitor', '120aaaaa-6666-0000-0000-000000000000', 'Maison · Mougins');
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('120aaaaa-5555-0000-0000-000000000000', '120aaaaa-0000-0000-0000-000000000000',
   '12011111-0000-0000-0000-0000000000a1', 'Vendeur 120', 'meeting_completed');
insert into public.comparables (id, agency_id, project_id, title, price, is_selected, display_order) values
  ('120aaaaa-6666-0000-0000-000000000000', '120aaaaa-0000-0000-0000-000000000000',
   '120aaaaa-5555-0000-0000-000000000000', 'Concurrent 120', 300000, true, 1);
insert into public.buyer_prospects (id, agency_id, listing_url, listing_key, exclusivity, locator_address, locator_confirmed) values
  ('120aaaaa-4444-0000-0000-000000000000', '120aaaaa-0000-0000-0000-000000000000',
   'https://exemple.invalid/a', 'exemple:a-120', 'no', '8 allée du Décor, 06370 Mouans-Sartoux', true);
insert into public.buyer_prospect_origins (id, agency_id, buyer_id, selection_item_id, prospect_id, comparable_id) values
  ('120aaaaa-7777-0000-0000-000000000001', '120aaaaa-0000-0000-0000-000000000000', '120aaaaa-1111-0000-0000-000000000000',
   '120aaaaa-3333-0000-0000-000000000001', '120aaaaa-4444-0000-0000-000000000000', null),
  ('120aaaaa-7777-0000-0000-000000000002', '120aaaaa-0000-0000-0000-000000000000', '120aaaaa-1111-0000-0000-000000000000',
   '120aaaaa-3333-0000-0000-000000000002', null, '120aaaaa-6666-0000-0000-000000000000');

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
select pg_temp.act_as('12011111-0000-0000-0000-0000000000a1');
select pg_temp.expect('§1 le conseiller lit le bien démarché de son agence',
  (select count(*)::text from public.buyer_prospects), '1');
select pg_temp.expect('§1 et ses deux origines', (select count(*)::text from public.buyer_prospect_origins), '2');
select pg_temp.expect('§1 le navigateur ne crée pas un bien démarché',
  pg_temp.attempt($$insert into public.buyer_prospects (agency_id, listing_url, listing_key) values
    ('120aaaaa-0000-0000-0000-000000000000', 'https://exemple.invalid/b', 'exemple:b-120')$$), 'refus');
select pg_temp.expect('§1 ni ne marque un courrier remis',
  pg_temp.attempt($$update public.buyer_prospects set prospecting_handed_at = now()$$), 'refus');
select pg_temp.expect('§1 ni ne confirme une adresse',
  pg_temp.attempt($$update public.buyer_prospects set locator_address = '1 rue Fausse, Nice'$$), 'refus');
select pg_temp.expect('§1 ni ne retire un bien démarché', pg_temp.attempt($$delete from public.buyer_prospects$$), 'refus');
select pg_temp.expect('§1 ni n''écrit un courrier',
  pg_temp.attempt($$update public.buyer_prospect_origins set letter_body = 'texte'$$), 'refus');
select pg_temp.expect('§1 ni ne crée une origine',
  pg_temp.attempt($$insert into public.buyer_prospect_origins (agency_id, buyer_id, selection_item_id, prospect_id) values
    ('120aaaaa-0000-0000-0000-000000000000', '120aaaaa-1111-0000-0000-000000000000',
     '120aaaaa-3333-0000-0000-000000000001', '120aaaaa-4444-0000-0000-000000000000')$$), 'refus');
select pg_temp.expect('§1 ni ne retire une origine', pg_temp.attempt($$delete from public.buyer_prospect_origins$$), 'refus');
select pg_temp.act_as('12011111-0000-0000-0000-0000000000b1');
select pg_temp.expect('§1 une autre agence ne lit aucun bien démarché',
  (select count(*)::text from public.buyer_prospects), '0');
select pg_temp.expect('§1 ni aucune origine', (select count(*)::text from public.buyer_prospect_origins), '0');
select pg_temp.act_as('12011111-0000-0000-0000-0000000000a2');
select pg_temp.expect('§1 un membre retiré ne lit rien',
  (select count(*)::text from public.buyer_prospects) || '/' || (select count(*)::text from public.buyer_prospect_origins), '0/0');
reset role;
set local role anon;
select pg_temp.expect('§1 un invité (anon) ne lit rien',
  pg_temp.attempt($$select * from public.buyer_prospects$$) || '/' || pg_temp.attempt($$select * from public.buyer_prospect_origins$$), 'refus/refus');
reset role;

-- §2
select pg_temp.act_as_service();
select pg_temp.expect('§2 la même annonce deux fois dans l''agence : refusée',
  pg_temp.attempt($$insert into public.buyer_prospects (agency_id, listing_url, listing_key) values
    ('120aaaaa-0000-0000-0000-000000000000', 'https://exemple.invalid/a?x=1', 'exemple:a-120')$$), 'doublon');
select pg_temp.expect('§2 la même annonce dans une autre agence : sa propre carte',
  pg_temp.attempt($$insert into public.buyer_prospects (agency_id, listing_url, listing_key) values
    ('120bbbbb-0000-0000-0000-000000000000', 'https://exemple.invalid/a', 'exemple:a-120')$$), '1');
select pg_temp.expect('§2 une annonce qui n''est pas une adresse web : refusée',
  pg_temp.attempt($$insert into public.buyer_prospects (agency_id, listing_url, listing_key) values
    ('120aaaaa-0000-0000-0000-000000000000', 'javascript:alert(1)', 'exemple:c-120')$$), 'contrainte');
select pg_temp.expect('§2 une exclusivité hors liste : refusée',
  pg_temp.attempt($$update public.buyer_prospects set exclusivity = 'peut-être' where id = '120aaaaa-4444-0000-0000-000000000000'$$), 'contrainte');
select pg_temp.expect('§2 des faits qui ne sont pas un objet : refusés',
  pg_temp.attempt($$update public.buyer_prospects set facts = '[]'::jsonb where id = '120aaaaa-4444-0000-0000-000000000000'$$), 'contrainte');
select pg_temp.expect('§2 deux origines pour le même bien retenu : refusées',
  pg_temp.attempt($$insert into public.buyer_prospect_origins (agency_id, buyer_id, selection_item_id, prospect_id) values
    ('120aaaaa-0000-0000-0000-000000000000', '120aaaaa-1111-0000-0000-000000000000',
     '120aaaaa-3333-0000-0000-000000000001', '120aaaaa-4444-0000-0000-000000000000')$$), 'doublon');
select pg_temp.expect('§2 une origine sans carte : refusée',
  pg_temp.attempt($$update public.buyer_prospect_origins set prospect_id = null where id = '120aaaaa-7777-0000-0000-000000000001'$$), 'contrainte');
select pg_temp.expect('§2 une origine sur deux cartes : refusée',
  pg_temp.attempt($$update public.buyer_prospect_origins set comparable_id = '120aaaaa-6666-0000-0000-000000000000' where id = '120aaaaa-7777-0000-0000-000000000001'$$), 'contrainte');
select pg_temp.expect('§2 une version de courrier hors liste : refusée',
  pg_temp.attempt($$update public.buyer_prospect_origins set letter_version = 'vendeur' where id = '120aaaaa-7777-0000-0000-000000000001'$$), 'contrainte');
select pg_temp.expect('§2 une origine dont la fiche est d''une autre agence : refusée',
  pg_temp.attempt($$update public.buyer_prospect_origins set agency_id = '120bbbbb-0000-0000-0000-000000000000' where id = '120aaaaa-7777-0000-0000-000000000001'$$), 'contrainte');
insert into public.buyer_prospects (id, agency_id, listing_url, listing_key) values
  ('120bbbbb-4444-0000-0000-000000000000', '120bbbbb-0000-0000-0000-000000000000', 'https://exemple.invalid/b', 'exemple:b-120');
select pg_temp.expect('§2 une origine sur le bien démarché d''une autre agence : refusée',
  pg_temp.attempt($$update public.buyer_prospect_origins set prospect_id = '120bbbbb-4444-0000-0000-000000000000' where id = '120aaaaa-7777-0000-0000-000000000001'$$), 'contrainte');
select pg_temp.expect('§2 la clé service écrit un courrier',
  pg_temp.attempt($$update public.buyer_prospect_origins set letter_version = 'owner', letter_body = 'texte' where id = '120aaaaa-7777-0000-0000-000000000001'$$), '1');

-- §3
select pg_temp.expect('§3 la date de l''adresse est posée par la base',
  (select (locator_address_at is not null)::text from public.buyer_prospects where id = '120aaaaa-4444-0000-0000-000000000000'), 'true');
select pg_temp.expect('§3 la collaboration avant le contact : refusée',
  pg_temp.attempt($$update public.buyer_prospects set prospecting_collaboration_at = now() where id = '120aaaaa-4444-0000-0000-000000000000'$$), 'contrainte');
select pg_temp.expect('§3 après le contact : acceptée',
  pg_temp.attempt($$update public.buyer_prospects set prospecting_handed_at = now(), prospecting_collaboration_at = now() where id = '120aaaaa-4444-0000-0000-000000000000'$$), '1');
select pg_temp.expect('§3 obtenue et refusée à la fois : refusée',
  pg_temp.attempt($$update public.buyer_prospects set prospecting_collaboration_declined_at = now() where id = '120aaaaa-4444-0000-0000-000000000000'$$), 'contrainte');
update public.buyer_prospects set prospecting_handed_at = null, prospecting_collaboration_at = null
  where id = '120aaaaa-4444-0000-0000-000000000000';

-- §4
select pg_temp.expect('§4 le navigateur n''appelle pas la purge',
  (select has_function_privilege('authenticated', 'public.purge_stale_buyer_prospect_addresses()', 'execute')::text), 'false');
select pg_temp.expect('§4 une adresse récente reste', (select public.purge_stale_buyer_prospect_addresses()::text), '0');
reset role;
alter table public.buyer_prospects disable trigger buyer_prospects_stamp_locator_address_at;
update public.buyer_prospects set locator_address_at = now() - interval '3 years 1 day', updated_at = now() - interval '3 years 1 day'
  where id = '120aaaaa-4444-0000-0000-000000000000';
alter table public.buyer_prospects enable trigger buyer_prospects_stamp_locator_address_at;
-- Un refus de collaboration récent est un contact : l'adresse reste (« et elle seule »).
update public.buyer_prospects set prospecting_handed_at = now() - interval '4 years', prospecting_collaboration_declined_at = now() - interval '1 day'
  where id = '120aaaaa-4444-0000-0000-000000000000';
select pg_temp.expect('§4 un contact récent garde l''adresse', (select public.purge_stale_buyer_prospect_addresses()::text), '0');
update public.buyer_prospects set prospecting_handed_at = null, prospecting_collaboration_declined_at = null
  where id = '120aaaaa-4444-0000-0000-000000000000';
select pg_temp.expect('§4 trois ans sans contact : l''adresse est effacée', (select public.purge_stale_buyer_prospect_addresses()::text), '1');
select pg_temp.expect('§4 l''annonce et la carte restent, la purge datée',
  (select (locator_address is null and listing_url is not null and locator_purged_at is not null)::text
   from public.buyer_prospects where id = '120aaaaa-4444-0000-0000-000000000000'), 'true');

-- §5
select pg_temp.act_as_service();
delete from public.comparables where id = '120aaaaa-6666-0000-0000-000000000000';
select pg_temp.expect('§5 une origine part avec son concurrent',
  (select count(*)::text from public.buyer_prospect_origins where id = '120aaaaa-7777-0000-0000-000000000002'), '0');
delete from public.buyer_prospects where id = '120aaaaa-4444-0000-0000-000000000000';
select pg_temp.expect('§5 et avec son bien démarché',
  (select count(*)::text from public.buyer_prospect_origins), '0');
insert into public.buyer_prospects (id, agency_id, listing_url, listing_key) values
  ('120aaaaa-4444-0000-0000-000000000009', '120aaaaa-0000-0000-0000-000000000000', 'https://exemple.invalid/d', 'exemple:d-120');
insert into public.buyer_prospect_origins (agency_id, buyer_id, selection_item_id, prospect_id) values
  ('120aaaaa-0000-0000-0000-000000000000', '120aaaaa-1111-0000-0000-000000000000',
   '120aaaaa-3333-0000-0000-000000000001', '120aaaaa-4444-0000-0000-000000000009');
delete from public.buyer_selection_items where id = '120aaaaa-3333-0000-0000-000000000001';
select pg_temp.expect('§5 et avec son bien retenu', (select count(*)::text from public.buyer_prospect_origins), '0');
insert into public.buyer_prospect_origins (agency_id, buyer_id, selection_item_id, prospect_id) values
  ('120aaaaa-0000-0000-0000-000000000000', '120aaaaa-1111-0000-0000-000000000000',
   '120aaaaa-3333-0000-0000-000000000002', '120aaaaa-4444-0000-0000-000000000009');
delete from public.buyers where id = '120aaaaa-1111-0000-0000-000000000000';
select pg_temp.expect('§5 et avec sa fiche', (select count(*)::text from public.buyer_prospect_origins), '0');
select pg_temp.expect('§5 le bien démarché reste (son statut, son opposition éventuelle)',
  (select count(*)::text from public.buyer_prospects where id = '120aaaaa-4444-0000-0000-000000000009'), '1');

rollback;
