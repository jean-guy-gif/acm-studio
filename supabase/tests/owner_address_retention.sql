-- Mission 102 — la durée de conservation des adresses de propriétaires, prouvée dans la base.
--   §1 l'adresse d'un concurrent est datée par la base quand elle apparaît ou change, jamais
--      quand autre chose change ; effacée, elle n'a plus de date ;
--   §2 la purge efface une adresse sans contact ni statut depuis plus de 3 ans — et elle seule :
--      une adresse plus récente, ou dont le dernier statut a moins de 3 ans, reste ;
--   §3 ce qui situe le bien part avec l'adresse, l'annonce reste, et le Localisateur n'est plus
--      interrogé (`locator_purged_at`) ;
--   §4 la liste « Ne plus solliciter » n'est pas purgée : l'opposition tient après l'effacement ;
--   §5 la purge est planifiée chaque nuit, et le navigateur ne la déclenche pas.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/owner_address_retention.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id, email) values
  ('a2000000-0000-0000-0000-0000000000c1', 'c1@a102.test');
insert into public.agencies (id, name) values
  ('a2aaaaaa-0000-0000-0000-000000000000', 'Agence A 102');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('a2000000-0000-0000-0000-0000000000c1', 'a2aaaaaa-0000-0000-0000-000000000000',
   'Carl', 'Un', 'c1@a102.test', 'advisor');
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('a2cccccc-0000-0000-0000-000000000001', 'a2aaaaaa-0000-0000-0000-000000000000',
   'a2000000-0000-0000-0000-0000000000c1', 'dossier 102', 'ready_for_meeting');

create function pg_temp.expect(p_label text, p_got text, p_want text) returns void
language plpgsql as $$
begin
  if p_got is distinct from p_want then
    raise exception 'FAIL % : attendu %, obtenu %', p_label, p_want, p_got;
  end if;
end $$;

-- Cinq concurrents, tous avec une adresse et une annonce.
insert into public.comparables
  (id, project_id, agency_id, price, display_order, is_selected, listing_url,
   locator_address, locator_confirmed, locator_source, locator_state, locator_label,
   locator_label_key, locator_latitude, locator_longitude, locator_property_id)
select ('a2dddddd-0000-0000-0000-00000000000' || n)::uuid,
       'a2cccccc-0000-0000-0000-000000000001', 'a2aaaaaa-0000-0000-0000-000000000000',
       300000, n, true, 'https://www.seloger.com/annonces/achat/maison/antibes-06/ANNONCE' || n,
       n || ' avenue Hochet, 06160 Antibes', true, 'dpe', 'pret', 'Adresse confirmée',
       'confirmee', 43.58, 7.12, 'bien-' || n
from generate_series(1, 5) as n;

-- =====================================================================
-- §1 — la date de l'adresse.
-- =====================================================================
select pg_temp.expect('§1 une adresse insérée est datée',
  (select count(*)::text from public.comparables
    where project_id = 'a2cccccc-0000-0000-0000-000000000001'
      and locator_address_at >= now() - interval '1 minute'), '5');

update public.comparables set locator_address_at = now() - interval '10 days'
where id = 'a2dddddd-0000-0000-0000-000000000001';
update public.comparables set price = 310000, locator_label = 'Autre étiquette'
where id = 'a2dddddd-0000-0000-0000-000000000001';
select pg_temp.expect('§1 une autre écriture ne redate pas l''adresse',
  (select (locator_address_at < now() - interval '9 days')::text from public.comparables
    where id = 'a2dddddd-0000-0000-0000-000000000001'), 'true');
update public.comparables set locator_address = '1 avenue Hochet, 06160 Antibes'
where id = 'a2dddddd-0000-0000-0000-000000000001';
select pg_temp.expect('§1 réécrire la même adresse ne la redate pas',
  (select (locator_address_at < now() - interval '9 days')::text from public.comparables
    where id = 'a2dddddd-0000-0000-0000-000000000001'), 'true');
update public.comparables set locator_address = '1 bis avenue Hochet, 06160 Antibes'
where id = 'a2dddddd-0000-0000-0000-000000000001';
select pg_temp.expect('§1 une adresse corrigée est redatée',
  (select (locator_address_at >= now() - interval '1 minute')::text from public.comparables
    where id = 'a2dddddd-0000-0000-0000-000000000001'), 'true');
update public.comparables set locator_address = null
where id = 'a2dddddd-0000-0000-0000-000000000001';
select pg_temp.expect('§1 une adresse effacée n''a plus de date',
  (select coalesce(locator_address_at::text, 'aucune') from public.comparables
    where id = 'a2dddddd-0000-0000-0000-000000000001'), 'aucune');

-- =====================================================================
-- §2 à §4 — la purge. Le propriétaire du n° 2 a demandé à ne plus être sollicité.
-- =====================================================================
insert into public.prospecting_oppositions (agency_id, address_key) values
  ('a2aaaaaa-0000-0000-0000-000000000000', '2 avenue hochet antibes');
insert into public.prospecting_oppositions (agency_id, listing_key) values
  ('a2aaaaaa-0000-0000-0000-000000000000', 'seloger:ANNONCE2');

-- n° 2 : adresse de 3 ans et un jour, aucun statut → purgée.
update public.comparables set locator_address_at = now() - interval '3 years 1 day'
where id = 'a2dddddd-0000-0000-0000-000000000002';
-- n° 3 : adresse de 2 ans et 11 mois, aucun statut → gardée.
update public.comparables set locator_address_at = now() - interval '2 years 11 months'
where id = 'a2dddddd-0000-0000-0000-000000000003';
-- n° 4 : adresse de 5 ans, dossier remis il y a 1 an → gardée (un statut de moins de 3 ans).
update public.comparables
set locator_address_at = now() - interval '5 years',
    prospecting_handed_at = now() - interval '1 year'
where id = 'a2dddddd-0000-0000-0000-000000000004';
-- n° 5 : adresse de 5 ans, « pas intéressé » il y a 4 ans → purgée (plus rien depuis 3 ans).
update public.comparables
set locator_address_at = now() - interval '5 years',
    prospecting_declined_at = now() - interval '4 years'
where id = 'a2dddddd-0000-0000-0000-000000000005';

select pg_temp.expect('§2 la purge efface les adresses sans contact depuis 3 ans, et elles seules',
  (select public.purge_stale_owner_addresses()::text), '2');
select pg_temp.expect('§2 les adresses gardées',
  (select string_agg(display_order::text, ',' order by display_order) from public.comparables
    where project_id = 'a2cccccc-0000-0000-0000-000000000001' and locator_address is not null),
  '3,4');
select pg_temp.expect('§2 une deuxième purge n''efface plus rien',
  (select public.purge_stale_owner_addresses()::text), '0');

select pg_temp.expect('§3 tout ce qui situe le bien est parti',
  (select count(*)::text from public.comparables
    where id in ('a2dddddd-0000-0000-0000-000000000002', 'a2dddddd-0000-0000-0000-000000000005')
      and num_nonnulls(locator_address, locator_latitude, locator_longitude, locator_property_id,
                       locator_label, locator_label_key, locator_source, locator_state,
                       locator_confirmed, locator_analyzed_at, locator_address_at) = 0), '2');
select pg_temp.expect('§3 l''annonce et le statut restent, le concurrent reste retenu',
  (select count(*)::text from public.comparables
    where id in ('a2dddddd-0000-0000-0000-000000000002', 'a2dddddd-0000-0000-0000-000000000005')
      and listing_url is not null and is_selected and price = 300000), '2');
select pg_temp.expect('§3 le statut d''un concurrent purgé n''est pas réécrit',
  (select (prospecting_declined_at is not null)::text from public.comparables
    where id = 'a2dddddd-0000-0000-0000-000000000005'), 'true');
select pg_temp.expect('§3 le Localisateur n''est plus interrogé pour eux, et pour eux seuls',
  (select string_agg(display_order::text, ',' order by display_order) from public.comparables
    where project_id = 'a2cccccc-0000-0000-0000-000000000001' and locator_purged_at is not null),
  '2,5');

select pg_temp.expect('§4 la liste « Ne plus solliciter » n''est pas purgée',
  (select count(*)::text from public.prospecting_oppositions
    where agency_id = 'a2aaaaaa-0000-0000-0000-000000000000'), '2');

-- =====================================================================
-- §5 — planifiée, et fermée au navigateur.
-- =====================================================================
select pg_temp.expect('§5 la purge est planifiée chaque nuit, une seule fois',
  (select string_agg(schedule || ' ' || command, ' ; ') from cron.job
    where jobname = 'purge-stale-owner-addresses' and active),
  '27 3 * * * select public.purge_stale_owner_addresses()');
select pg_temp.expect('§5 le navigateur ne déclenche pas la purge',
  (has_function_privilege('authenticated', 'public.purge_stale_owner_addresses()', 'execute')
   or has_function_privilege('anon', 'public.purge_stale_owner_addresses()', 'execute'))::text,
  'false');

rollback;
