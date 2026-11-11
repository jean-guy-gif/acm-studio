-- Mission 152 (partie B) — la purge à 3 ans du texte des annonces, prouvée dans la base :
--   §1 un bien d'une sélection d'acquéreur de plus de 3 ans perd la description, le titre, l'adresse
--      lue et les photos d'origine ; il garde son libellé, son prix, ses photos de la recherche ;
--      une sélection présentée est purgée sans que son déroulé figé change ; un bien récent reste
--      intact ; un bien ancien sans texte (un mandat) n'est ni touché ni compté ;
--   §2 un résultat payé gardé depuis plus de 3 ans part, un récent reste ;
--   §3 le texte d'un concurrent sans aucun fait depuis 3 ans est vidé (et sa pastille « À vérifier »),
--      dossier dont le Live a commencé, conclu ou archivé, compris ; celui d'un concurrent récent ou
--      démarché il y a un an reste ; le concurrent lui-même reste ;
--   §4 une seconde passe ne fait rien ; planifiée chaque nuit, une seule fois ; fermée au navigateur.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/purge_texte_annonces.sql

begin;

insert into auth.users (id, email) values
  ('15b11111-0000-0000-0000-0000000000a1', 'ca@b152.test');
insert into public.agencies (id, name) values
  ('15baaaaa-0000-0000-0000-000000000000', 'Agence 152 B');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('15b11111-0000-0000-0000-0000000000a1', '15baaaaa-0000-0000-0000-000000000000', 'Carl', 'Conseiller', 'ca@b152.test', 'advisor');
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('15baaaaa-1111-0000-0000-000000000001', '15baaaaa-0000-0000-0000-000000000000', '15b11111-0000-0000-0000-0000000000a1', 'Vendeur ancien', 'draft'),
  ('15baaaaa-1111-0000-0000-000000000002', '15baaaaa-0000-0000-0000-000000000000', '15b11111-0000-0000-0000-0000000000a1', 'Vendeur récent', 'draft'),
  ('15baaaaa-1111-0000-0000-000000000003', '15baaaaa-0000-0000-0000-000000000000', '15b11111-0000-0000-0000-0000000000a1', 'Vendeur conclu', 'draft'),
  ('15baaaaa-1111-0000-0000-000000000004', '15baaaaa-0000-0000-0000-000000000000', '15b11111-0000-0000-0000-0000000000a1', 'Vendeur archivé', 'draft');
insert into public.buyers (id, agency_id, advisor_id, name, cities) values
  ('15baaaaa-3333-0000-0000-000000000000', '15baaaaa-0000-0000-0000-000000000000',
   '15b11111-0000-0000-0000-0000000000a1', 'Famille Test', array['Vence']);
insert into public.buyer_selections (id, agency_id, buyer_id, created_by, created_at, presented_at, presented_deck) values
  ('15baaaaa-4444-0000-0000-000000000001', '15baaaaa-0000-0000-0000-000000000000',
   '15baaaaa-3333-0000-0000-000000000000', '15b11111-0000-0000-0000-0000000000a1',
   now() - interval '4 years', now() - interval '4 years', '{"items": [{"label": "Maison · Vence"}]}'),
  ('15baaaaa-4444-0000-0000-000000000002', '15baaaaa-0000-0000-0000-000000000000',
   '15baaaaa-3333-0000-0000-000000000000', '15b11111-0000-0000-0000-0000000000a1',
   now() - interval '1 year', null, null);

create function pg_temp.expect(p_label text, p_got text, p_want text) returns void language plpgsql as $$
begin
  if p_got is distinct from p_want then
    raise exception 'FAIL % : attendu %, obtenu %', p_label, p_want, p_got;
  end if;
  raise notice 'ok — %', p_label;
end $$;

-- Le texte d'une annonce, tel que la recherche et l'import le gardent.
create function pg_temp.snapshot() returns jsonb language sql as $$
  select jsonb_build_object(
    'url', 'https://www.seloger.com/annonces/achat/maison/vence-06/1.htm',
    'title', 'EXCLUSIVITÉ Agence Dupont',
    'photoUrls', jsonb_build_array('https://pictures.notif.immo/1.jpg'),
    'streamEstate', jsonb_build_object(
      'propertyId', 'se-1',
      'description', 'Visites : Paul, 12 rue des Lilas',
      'originalPhotos', jsonb_build_array('https://mms.seloger.com/1.jpg')))
$$;
create function pg_temp.imported() returns jsonb language sql as $$
  select jsonb_build_object(
    'title', 'EXCLUSIVITÉ Agence Dupont',
    'address', '12 rue des Lilas',
    'listingDescription', 'Visites : Paul, 12 rue des Lilas',
    'surfaceArea', 150,
    'photoUrls', jsonb_build_array('https://mms.seloger.com/1.jpg'))
$$;

insert into public.buyer_selection_items (id, agency_id, selection_id, position, source, reference, label, listed_price, category, gaps, snapshot, imported, created_at) values
  ('15baaaaa-5555-0000-0000-000000000001', '15baaaaa-0000-0000-0000-000000000000', '15baaaaa-4444-0000-0000-000000000001',
   1, 'listing', 'https://www.seloger.com/annonces/achat/maison/vence-06/1.htm', 'Maison · Vence', 735000, 'strong', '{}',
   pg_temp.snapshot(), pg_temp.imported(), now() - interval '3 years 1 day'),
  ('15baaaaa-5555-0000-0000-000000000002', '15baaaaa-0000-0000-0000-000000000000', '15baaaaa-4444-0000-0000-000000000002',
   1, 'listing', 'https://www.seloger.com/annonces/achat/maison/vence-06/1.htm', 'Maison · Vence', 735000, 'strong', '{}',
   pg_temp.snapshot(), pg_temp.imported(), now() - interval '1 year'),
  ('15baaaaa-5555-0000-0000-000000000003', '15baaaaa-0000-0000-0000-000000000000', '15baaaaa-4444-0000-0000-000000000001',
   2, 'project', '15baaaaa-1111-0000-0000-000000000002', 'Maison · Vence (mandat)', 713000, 'agency', '{}',
   null, null, now() - interval '4 years');

insert into public.stream_estate_results (agency_id, project_id, saved_by, fingerprint, result, updated_at) values
  ('15baaaaa-0000-0000-0000-000000000000', '15baaaaa-1111-0000-0000-000000000001', '15b11111-0000-0000-0000-0000000000a1',
   'ancienne', '{"portal": {}, "note": {}}', now() - interval '3 years 1 day'),
  ('15baaaaa-0000-0000-0000-000000000000', '15baaaaa-1111-0000-0000-000000000002', '15b11111-0000-0000-0000-0000000000a1',
   'récente', '{"portal": {}, "note": {}}', now() - interval '2 years');

insert into public.comparables (id, agency_id, project_id, title, price, surface_area, is_selected, display_order, listing_description, created_at, prospecting_handed_at, fields_to_verify) values
  ('15baaaaa-2222-0000-0000-000000000001', '15baaaaa-0000-0000-0000-000000000000', '15baaaaa-1111-0000-0000-000000000001', 'Ancien', 600000, 120, true, 1, 'Texte ancien', now() - interval '4 years', null, array['price', 'listing_description']),
  ('15baaaaa-2222-0000-0000-000000000002', '15baaaaa-0000-0000-0000-000000000000', '15baaaaa-1111-0000-0000-000000000001', 'Ancien démarché', 610000, 121, true, 2, 'Texte démarché', now() - interval '4 years', now() - interval '1 year', '{}'),
  ('15baaaaa-2222-0000-0000-000000000003', '15baaaaa-0000-0000-0000-000000000000', '15baaaaa-1111-0000-0000-000000000002', 'Récent', 620000, 122, true, 1, 'Texte récent', now() - interval '2 years', null, '{}'),
  ('15baaaaa-2222-0000-0000-000000000004', '15baaaaa-0000-0000-0000-000000000000', '15baaaaa-1111-0000-0000-000000000003', 'Live conclu', 630000, 123, true, 1, 'Texte conclu', now() - interval '4 years', null, '{}'),
  ('15baaaaa-2222-0000-0000-000000000005', '15baaaaa-0000-0000-0000-000000000000', '15baaaaa-1111-0000-0000-000000000004', 'Live archivé', 640000, 124, true, 1, 'Texte archivé', now() - interval '4 years', null, '{}');
-- Deux dossiers dont le Live a commencé (l'ordre et le choix des concurrents figés, M110, M112),
-- l'un conclu, l'autre archivé : la purge passe quand même (leçon de la migration 20261028).
update public.projects set live_started_at = now() - interval '4 years', live_ended_at = now() - interval '4 years',
  status = 'meeting_completed' where id = '15baaaaa-1111-0000-0000-000000000003';
update public.projects set live_started_at = now() - interval '4 years', status = 'archived'
  where id = '15baaaaa-1111-0000-0000-000000000004';

-- La purge, jouée comme la tâche de nuit (rôle de la base) : 1 bien de sélection, 1 résultat,
-- 3 concurrents (dont ceux d'un Live conclu et d'un Live archivé).
select pg_temp.expect('§1-3 la purge touche cinq lignes',
  (select public.purge_stale_listing_texts()::text), '5');

-- §1
select pg_temp.expect('§1 le bien ancien n''a plus ni texte, ni titre, ni adresse, ni photos d''origine',
  (select (snapshot #> '{streamEstate,description}' is null
           and snapshot #> '{streamEstate,originalPhotos}' is null
           and not snapshot ? 'title'
           and not imported ? 'listingDescription'
           and not imported ? 'title'
           and not imported ? 'address')::text
     from public.buyer_selection_items where id = '15baaaaa-5555-0000-0000-000000000001'), 'true');
select pg_temp.expect('§1 … et garde son libellé, son prix, ses photos de la recherche, sa surface',
  (select concat_ws('|', label, listed_price::int, snapshot #>> '{photoUrls,0}',
                    snapshot #>> '{streamEstate,propertyId}', imported ->> 'surfaceArea')
     from public.buyer_selection_items where id = '15baaaaa-5555-0000-0000-000000000001'),
  'Maison · Vence|735000|https://pictures.notif.immo/1.jpg|se-1|150');
select pg_temp.expect('§1 la sélection présentée garde son déroulé figé, à l''identique',
  (select presented_deck::text from public.buyer_selections where id = '15baaaaa-4444-0000-0000-000000000001'),
  '{"items": [{"label": "Maison · Vence"}]}');
select pg_temp.expect('§1 un bien ancien sans texte (un mandat) n''est ni touché ni compté',
  (select (snapshot is null and imported is null and label = 'Maison · Vence (mandat)')::text
     from public.buyer_selection_items where id = '15baaaaa-5555-0000-0000-000000000003'), 'true');
select pg_temp.expect('§1 le bien récent reste intact',
  (select (snapshot = pg_temp.snapshot() and imported = pg_temp.imported())::text
     from public.buyer_selection_items where id = '15baaaaa-5555-0000-0000-000000000002'), 'true');

-- §2
select pg_temp.expect('§2 seul le résultat récent reste',
  (select string_agg(fingerprint, ',') from public.stream_estate_results
    where agency_id = '15baaaaa-0000-0000-0000-000000000000'), 'récente');

-- §3
select pg_temp.expect('§3 seul le texte du concurrent sans fait depuis 3 ans est vidé',
  (select string_agg(title || '=' || coalesce(listing_description, 'vide'), ',' order by title)
     from public.comparables where agency_id = '15baaaaa-0000-0000-0000-000000000000'),
  'Ancien=vide,Ancien démarché=Texte démarché,Live archivé=vide,Live conclu=vide,Récent=Texte récent');
select pg_temp.expect('§3 le texte vidé perd sa pastille « À vérifier », le reste la garde',
  (select array_to_string(fields_to_verify, ',') from public.comparables
    where id = '15baaaaa-2222-0000-0000-000000000001'), 'price');
select pg_temp.expect('§3 les concurrents purgés restent, Live commencé compris',
  (select count(*)::text from public.comparables where agency_id = '15baaaaa-0000-0000-0000-000000000000'), '5');

-- §4
select pg_temp.expect('§4 une seconde passe ne fait rien',
  (select public.purge_stale_listing_texts()::text), '0');
select pg_temp.expect('§4 la purge est planifiée chaque nuit, une seule fois',
  (select string_agg(schedule || ' ' || command, ' ; ') from cron.job
    where jobname = 'purge-stale-listing-texts' and active),
  '30 3 * * * select public.purge_stale_listing_texts()');
select pg_temp.expect('§4 le navigateur ne déclenche pas la purge',
  (has_function_privilege('authenticated', 'public.purge_stale_listing_texts()', 'execute')
   or has_function_privilege('anon', 'public.purge_stale_listing_texts()', 'execute'))::text,
  'false');

rollback;
