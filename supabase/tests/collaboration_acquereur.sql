-- Mission 120 (partie B) — prouvé dans la base :
--   §1 `comparables.first_seen_on` : nulle par défaut, une date ; une autre agence n'y touche pas ;
--   §2 `detach_buyer_origins` est fermée au navigateur, refuse une autre agence, ne touche rien
--      d'un concurrent sans origine ;
--   §3 sans copie qui porte la carte, le bien redevient un bien démarché avec tous ses faits
--      (annonce, faits, adresse et provenance, remise, collaboration, vendeur, exclusivité), les
--      origines et leurs courriers passent sur lui ; la date de l'adresse est reposée par la base ;
--      le concurrent garde ses faits ; l'absorption repasse ensuite (miroir) ;
--   §4 avec une copie cible, les origines y passent et aucun bien démarché ne naît ;
--   §5 un concurrent sans annonce garde ses origines ; un bien démarché déjà présent pour l'annonce
--      est gardé tel quel (une carte par bien) ;
--   §6 détacher puis supprimer le concurrent : l'origine et son courrier restent.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/collaboration_acquereur.sql

begin;

insert into auth.users (id, email) values
  ('12b11111-0000-0000-0000-0000000000a1', 'ca@a120b.test'),
  ('12b11111-0000-0000-0000-0000000000b1', 'cb@b120b.test');
insert into public.agencies (id, name) values
  ('12baaaaa-0000-0000-0000-000000000000', 'Agence A 120 B'),
  ('12bbbbbb-0000-0000-0000-000000000000', 'Agence B 120 B');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('12b11111-0000-0000-0000-0000000000a1', '12baaaaa-0000-0000-0000-000000000000', 'Carl', 'Conseiller', 'ca@a120b.test', 'advisor'),
  ('12b11111-0000-0000-0000-0000000000b1', '12bbbbbb-0000-0000-0000-000000000000', 'Boris', 'Conseiller', 'cb@b120b.test', 'advisor');
insert into public.buyers (id, agency_id, advisor_id, name, cities) values
  ('12baaaaa-1111-0000-0000-000000000000', '12baaaaa-0000-0000-0000-000000000000', '12b11111-0000-0000-0000-0000000000a1', 'Famille Test', array['Mougins']);
insert into public.buyer_selections (id, agency_id, buyer_id) values
  ('12baaaaa-2222-0000-0000-000000000000', '12baaaaa-0000-0000-0000-000000000000', '12baaaaa-1111-0000-0000-000000000000');
insert into public.buyer_selection_items (id, agency_id, selection_id, position, source, reference, label) values
  ('12baaaaa-3333-0000-0000-000000000001', '12baaaaa-0000-0000-0000-000000000000', '12baaaaa-2222-0000-0000-000000000000', 1, 'listing', 'https://exemple.invalid/un', 'Maison · Mougins'),
  ('12baaaaa-3333-0000-0000-000000000002', '12baaaaa-0000-0000-0000-000000000000', '12baaaaa-2222-0000-0000-000000000000', 2, 'listing', 'https://exemple.invalid/deux', 'Maison · Mougins'),
  ('12baaaaa-3333-0000-0000-000000000003', '12baaaaa-0000-0000-0000-000000000000', '12baaaaa-2222-0000-0000-000000000000', 3, 'listing', 'https://exemple.invalid/trois', 'Maison · Mougins');
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('12baaaaa-5555-0000-0000-000000000001', '12baaaaa-0000-0000-0000-000000000000', '12b11111-0000-0000-0000-0000000000a1', 'Vendeur un', 'meeting_completed'),
  ('12baaaaa-5555-0000-0000-000000000002', '12baaaaa-0000-0000-0000-000000000000', '12b11111-0000-0000-0000-0000000000a1', 'Vendeur deux', 'meeting_completed');
-- Le concurrent « un » porte la carte : adresse confirmée, contacté, collaboration refusée, vendeur
-- et exclusivité avec leur provenance.
insert into public.comparables (id, agency_id, project_id, title, price, is_selected, display_order, listing_url,
  sold_by, sold_by_source, exclusivity, exclusivity_source, locator_address, locator_confirmed, locator_source,
  locator_label_key, prospecting_handed_at, prospecting_collaboration_declined_at) values
  ('12baaaaa-6666-0000-0000-000000000001', '12baaaaa-0000-0000-0000-000000000000', '12baaaaa-5555-0000-0000-000000000001',
   'Concurrent un', 300000, true, 1, 'https://exemple.invalid/un', 'agency', 'badge', 'yes', 'advisor',
   '1 rue de l''Un, 06250 Mougins', true, 'vous', 'vous', now() - interval '3 days', now() - interval '1 day'),
  ('12baaaaa-6666-0000-0000-000000000002', '12baaaaa-0000-0000-0000-000000000000', '12baaaaa-5555-0000-0000-000000000001',
   'Concurrent deux', 300000, true, 2, 'https://exemple.invalid/deux', null, null, null, null, null, null, null, null, null, null),
  -- La copie du même bien « deux », retenue dans un autre mandat (M98).
  ('12baaaaa-6666-0000-0000-000000000022', '12baaaaa-0000-0000-0000-000000000000', '12baaaaa-5555-0000-0000-000000000002',
   'Copie deux', 300000, true, 1, 'https://exemple.invalid/deux', null, null, null, null, null, null, null, null, null, null),
  ('12baaaaa-6666-0000-0000-000000000003', '12baaaaa-0000-0000-0000-000000000000', '12baaaaa-5555-0000-0000-000000000001',
   'Concurrent sans annonce', 300000, true, 3, null, null, null, null, null, null, null, null, null, null, null),
  ('12baaaaa-6666-0000-0000-000000000004', '12baaaaa-0000-0000-0000-000000000000', '12baaaaa-5555-0000-0000-000000000001',
   'Concurrent sans origine', 300000, true, 4, 'https://exemple.invalid/quatre', null, null, null, null, null, null, null, null, null, null);
insert into public.buyer_prospect_origins (id, agency_id, buyer_id, selection_item_id, comparable_id, letter_version, letter_body) values
  ('12baaaaa-7777-0000-0000-000000000001', '12baaaaa-0000-0000-0000-000000000000', '12baaaaa-1111-0000-0000-000000000000',
   '12baaaaa-3333-0000-0000-000000000001', '12baaaaa-6666-0000-0000-000000000001', 'colleague', 'Mon dossier.'),
  ('12baaaaa-7777-0000-0000-000000000002', '12baaaaa-0000-0000-0000-000000000000', '12baaaaa-1111-0000-0000-000000000000',
   '12baaaaa-3333-0000-0000-000000000002', '12baaaaa-6666-0000-0000-000000000002', null, null),
  ('12baaaaa-7777-0000-0000-000000000003', '12baaaaa-0000-0000-0000-000000000000', '12baaaaa-1111-0000-0000-000000000000',
   '12baaaaa-3333-0000-0000-000000000003', '12baaaaa-6666-0000-0000-000000000003', null, null);

create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
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
select pg_temp.expect('§1 first_seen_on est nulle par défaut',
  (select count(*)::text from public.comparables where agency_id = '12baaaaa-0000-0000-0000-000000000000' and first_seen_on is not null), '0');
select pg_temp.expect('§1 une date absurde est refusée',
  pg_temp.attempt($$update public.comparables set first_seen_on = date '1999-12-31' where id = '12baaaaa-6666-0000-0000-000000000004'$$), 'contrainte');
update public.comparables set first_seen_on = date '2026-10-18' where id = '12baaaaa-6666-0000-0000-000000000004';
select pg_temp.expect('§1 le serveur la pose',
  (select first_seen_on::text from public.comparables where id = '12baaaaa-6666-0000-0000-000000000004'), '2026-10-18');
select pg_temp.act_as('12b11111-0000-0000-0000-0000000000b1');
select pg_temp.expect('§1 une autre agence ne la change pas',
  pg_temp.attempt($$update public.comparables set first_seen_on = date '2026-10-01' where id = '12baaaaa-6666-0000-0000-000000000004'$$), '0');
reset role;
select pg_temp.expect('§1 et elle est restée',
  (select first_seen_on::text from public.comparables where id = '12baaaaa-6666-0000-0000-000000000004'), '2026-10-18');

-- §2
select pg_temp.expect('§2 le navigateur n''appelle pas le détachement',
  (select has_function_privilege('authenticated', 'public.detach_buyer_origins(uuid, uuid, text, jsonb, uuid)', 'execute')::text), 'false');
select pg_temp.expect('§2 ni anon',
  (select has_function_privilege('anon', 'public.detach_buyer_origins(uuid, uuid, text, jsonb, uuid)', 'execute')::text), 'false');
select pg_temp.expect('§2 la clé service l''appelle',
  (select has_function_privilege('service_role', 'public.detach_buyer_origins(uuid, uuid, text, jsonb, uuid)', 'execute')::text), 'true');
select pg_temp.expect('§2 un concurrent d''une autre agence : refusé',
  pg_temp.attempt($$select public.detach_buyer_origins('12bbbbbb-0000-0000-0000-000000000000', '12baaaaa-6666-0000-0000-000000000001', 'exemple:un', '{}'::jsonb)$$), 'contrainte');
select pg_temp.expect('§2 un concurrent sans origine : rien',
  (select public.detach_buyer_origins('12baaaaa-0000-0000-0000-000000000000', '12baaaaa-6666-0000-0000-000000000004', 'exemple:quatre', '{}'::jsonb)::text), '0');
select pg_temp.expect('§2 et aucun bien démarché ne naît',
  (select count(*)::text from public.buyer_prospects where agency_id = '12baaaaa-0000-0000-0000-000000000000'), '0');

-- §3
select pg_temp.expect('§3 des faits qui ne sont pas un objet : refusés',
  pg_temp.attempt($$select public.detach_buyer_origins('12baaaaa-0000-0000-0000-000000000000', '12baaaaa-6666-0000-0000-000000000001', 'exemple:un', '[]'::jsonb)$$), 'contrainte');
select pg_temp.expect('§3 le détachement : 1 origine',
  (select public.detach_buyer_origins('12baaaaa-0000-0000-0000-000000000000', '12baaaaa-6666-0000-0000-000000000001', 'exemple:un',
     '{"type":"Maison","surface":140}'::jsonb)::text), '1');
select pg_temp.expect('§3 le bien démarché reprend l''annonce, les faits, l''adresse et sa provenance',
  (select listing_url || '|' || listing_key || '|' || (facts->>'surface') || '|' || locator_address || '|' || locator_confirmed::text || '|' || locator_source
   from public.buyer_prospects where agency_id = '12baaaaa-0000-0000-0000-000000000000'),
  'https://exemple.invalid/un|exemple:un|140|1 rue de l''Un, 06250 Mougins|true|vous');
select pg_temp.expect('§3 et le contact, le refus de collaboration, le vendeur, l''exclusivité',
  (select (prospecting_handed_at is not null)::text || '|' || (prospecting_collaboration_declined_at is not null)::text || '|'
     || sold_by || '/' || sold_by_source || '|' || exclusivity || '/' || exclusivity_source
   from public.buyer_prospects where agency_id = '12baaaaa-0000-0000-0000-000000000000'),
  'true|true|agency/badge|yes/advisor');
select pg_temp.expect('§3 la date de l''adresse est posée par la base',
  (select (locator_address_at is not null)::text from public.buyer_prospects where agency_id = '12baaaaa-0000-0000-0000-000000000000'), 'true');
select pg_temp.expect('§3 l''origine et son courrier passent sur le bien démarché',
  (select (comparable_id is null)::text || '|' || (prospect_id is not null)::text || '|' || letter_version || '|' || letter_body
   from public.buyer_prospect_origins where id = '12baaaaa-7777-0000-0000-000000000001'),
  'true|true|colleague|Mon dossier.');
select pg_temp.expect('§3 le concurrent garde ses faits',
  (select locator_address || '|' || exclusivity from public.comparables where id = '12baaaaa-6666-0000-0000-000000000001'),
  '1 rue de l''Un, 06250 Mougins|yes');
select pg_temp.expect('§3 détacher de nouveau ne fait rien',
  (select public.detach_buyer_origins('12baaaaa-0000-0000-0000-000000000000', '12baaaaa-6666-0000-0000-000000000001', 'exemple:un', '{}'::jsonb)::text), '0');
select pg_temp.expect('§3 le miroir : l''absorption repasse',
  (select public.absorb_buyer_prospect('12baaaaa-0000-0000-0000-000000000000', '12baaaaa-6666-0000-0000-000000000001', 'exemple:un')::text), '1');
select pg_temp.expect('§3 et l''origine revient sur le concurrent, le bien démarché disparaît',
  (select comparable_id::text || '|' || (select count(*)::text from public.buyer_prospects where agency_id = '12baaaaa-0000-0000-0000-000000000000')
   from public.buyer_prospect_origins where id = '12baaaaa-7777-0000-0000-000000000001'),
  '12baaaaa-6666-0000-0000-000000000001|0');

-- §4
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('12baaaaa-5555-0000-0000-000000000003', '12baaaaa-0000-0000-0000-000000000000', '12b11111-0000-0000-0000-0000000000a1', 'Vendeur trois', 'meeting_completed'),
  ('12bbbbbb-5555-0000-0000-000000000001', '12bbbbbb-0000-0000-0000-000000000000', '12b11111-0000-0000-0000-0000000000b1', 'Vendeur B', 'meeting_completed');
insert into public.comparables (id, agency_id, project_id, title, price, is_selected, display_order, listing_url) values
  ('12bbbbbb-6666-0000-0000-000000000002', '12bbbbbb-0000-0000-0000-000000000000', '12bbbbbb-5555-0000-0000-000000000001',
   'Copie deux agence B', 300000, true, 1, 'https://exemple.invalid/deux'),
  ('12baaaaa-6666-0000-0000-000000000023', '12baaaaa-0000-0000-0000-000000000000', '12baaaaa-5555-0000-0000-000000000003',
   'Copie deux écartée', 300000, false, 2, 'https://exemple.invalid/deux'),
  ('12baaaaa-6666-0000-0000-000000000024', '12baaaaa-0000-0000-0000-000000000000', '12baaaaa-5555-0000-0000-000000000002',
   'Autre annonce', 300000, true, 3, 'https://exemple.invalid/autre');
select pg_temp.expect('§4 la copie cible : le concurrent lui-même, refusé',
  pg_temp.attempt($$select public.detach_buyer_origins('12baaaaa-0000-0000-0000-000000000000', '12baaaaa-6666-0000-0000-000000000002', 'exemple:deux', '{}'::jsonb, '12baaaaa-6666-0000-0000-000000000002')$$), 'contrainte');
select pg_temp.expect('§4 une copie d''une autre agence, refusée',
  pg_temp.attempt($$select public.detach_buyer_origins('12baaaaa-0000-0000-0000-000000000000', '12baaaaa-6666-0000-0000-000000000002', 'exemple:deux', '{}'::jsonb, '12bbbbbb-6666-0000-0000-000000000002')$$), 'contrainte');
select pg_temp.expect('§4 une copie écartée (elle ne porte pas de carte), refusée',
  pg_temp.attempt($$select public.detach_buyer_origins('12baaaaa-0000-0000-0000-000000000000', '12baaaaa-6666-0000-0000-000000000002', 'exemple:deux', '{}'::jsonb, '12baaaaa-6666-0000-0000-000000000023')$$), 'contrainte');
select pg_temp.expect('§4 un concurrent d''une autre annonce, refusé',
  pg_temp.attempt($$select public.detach_buyer_origins('12baaaaa-0000-0000-0000-000000000000', '12baaaaa-6666-0000-0000-000000000002', 'exemple:deux', '{}'::jsonb, '12baaaaa-6666-0000-0000-000000000024')$$), 'contrainte');
select pg_temp.expect('§4 vers la copie qui porte la carte : 1 origine',
  (select public.detach_buyer_origins('12baaaaa-0000-0000-0000-000000000000', '12baaaaa-6666-0000-0000-000000000002', 'exemple:deux', '{}'::jsonb, '12baaaaa-6666-0000-0000-000000000022')::text), '1');
select pg_temp.expect('§4 l''origine est sur la copie, aucun bien démarché',
  (select comparable_id::text || '|' || (select count(*)::text from public.buyer_prospects where agency_id = '12baaaaa-0000-0000-0000-000000000000')
   from public.buyer_prospect_origins where id = '12baaaaa-7777-0000-0000-000000000002'),
  '12baaaaa-6666-0000-0000-000000000022|0');

-- §5
select pg_temp.expect('§5 un concurrent sans annonce garde ses origines',
  pg_temp.attempt($$select public.detach_buyer_origins('12baaaaa-0000-0000-0000-000000000000', '12baaaaa-6666-0000-0000-000000000003', 'exemple:trois', '{}'::jsonb)$$), 'contrainte');
select pg_temp.expect('§5 et son origine n''a pas bougé',
  (select comparable_id::text from public.buyer_prospect_origins where id = '12baaaaa-7777-0000-0000-000000000003'), '12baaaaa-6666-0000-0000-000000000003');
insert into public.buyer_prospects (id, agency_id, listing_url, listing_key, locator_address) values
  ('12baaaaa-4444-0000-0000-000000000009', '12baaaaa-0000-0000-0000-000000000000', 'https://exemple.invalid/ailleurs', 'exemple:un', 'Ailleurs');
select pg_temp.expect('§5 une autre annonce sous la même clé : refusé',
  pg_temp.attempt($$select public.detach_buyer_origins('12baaaaa-0000-0000-0000-000000000000', '12baaaaa-6666-0000-0000-000000000001', 'exemple:un', '{}'::jsonb)$$), 'contrainte');
delete from public.buyer_prospects where id = '12baaaaa-4444-0000-0000-000000000009';
insert into public.buyer_prospects (id, agency_id, listing_url, listing_key, locator_address, exclusivity, exclusivity_source) values
  ('12baaaaa-4444-0000-0000-000000000001', '12baaaaa-0000-0000-0000-000000000000', 'https://exemple.invalid/un', 'exemple:un', 'Adresse déjà là', null, null);
select public.detach_buyer_origins('12baaaaa-0000-0000-0000-000000000000', '12baaaaa-6666-0000-0000-000000000001', 'exemple:un', '{}'::jsonb);
select pg_temp.expect('§5 un bien démarché déjà présent garde ce qu''il sait, reçoit ce qui lui manque et l''origine',
  (select p.locator_address || '|' || p.exclusivity || '/' || p.exclusivity_source || '|' || (p.prospecting_handed_at is not null)::text
     || '|' || (select count(*)::text from public.buyer_prospects where listing_key = 'exemple:un')
   from public.buyer_prospect_origins o join public.buyer_prospects p on p.id = o.prospect_id
   where o.id = '12baaaaa-7777-0000-0000-000000000001'),
  'Adresse déjà là|yes/advisor|true|1');

-- Une collaboration obtenue sur le bien démarché, un mandat rentré sur le concurrent : le
-- complément ne pose pas le mandat, le détachement passe (CHECK de M115).
insert into public.comparables (id, agency_id, project_id, title, price, is_selected, display_order, listing_url,
  prospecting_handed_at, prospecting_meeting_at, prospecting_mandate_at) values
  ('12baaaaa-6666-0000-0000-000000000005', '12baaaaa-0000-0000-0000-000000000000', '12baaaaa-5555-0000-0000-000000000001',
   'Concurrent cinq', 300000, true, 5, 'https://exemple.invalid/cinq', now() - interval '5 days', now() - interval '3 days', now() - interval '1 day');
insert into public.buyer_prospects (id, agency_id, listing_url, listing_key, prospecting_handed_at, prospecting_collaboration_at) values
  ('12baaaaa-4444-0000-0000-000000000005', '12baaaaa-0000-0000-0000-000000000000', 'https://exemple.invalid/cinq', 'exemple:cinq',
   now() - interval '4 days', now() - interval '2 days');
update public.buyer_prospect_origins set comparable_id = '12baaaaa-6666-0000-0000-000000000005', prospect_id = null
  where id = '12baaaaa-7777-0000-0000-000000000003';
select pg_temp.expect('§5 collaboration obtenue d''un côté, mandat de l''autre : le détachement passe',
  (select public.detach_buyer_origins('12baaaaa-0000-0000-0000-000000000000', '12baaaaa-6666-0000-0000-000000000005', 'exemple:cinq', '{}'::jsonb)::text), '1');
select pg_temp.expect('§5 et le bien démarché garde sa collaboration, sans mandat',
  (select (prospecting_collaboration_at is not null)::text || '|' || (prospecting_mandate_at is null)::text
   from public.buyer_prospects where id = '12baaaaa-4444-0000-0000-000000000005'), 'true|true');

-- §6
delete from public.comparables where id = '12baaaaa-6666-0000-0000-000000000001';
select pg_temp.expect('§6 le concurrent supprimé après détachement : l''origine et son courrier restent',
  (select letter_body from public.buyer_prospect_origins where id = '12baaaaa-7777-0000-0000-000000000001'), 'Mon dossier.');

rollback;
