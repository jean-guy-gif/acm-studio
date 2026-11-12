-- Mission 151 (partie B) — les citations de la veille suivent la purge à 3 ans (M152 B), prouvé
-- dans la base :
--   §1 un passage de plus de 3 ans perd ses citations (`quote`, `counterQuote` deviennent vides) ;
--      le jugement, le bien et le reste du passage restent ;
--   §2 un passage récent garde ses citations ; un passage ancien sans jugement n'est ni touché ni
--      compté ;
--   §3 une seconde passe ne compte plus rien ; la fiche supprimée emporte ses passages ; la fonction
--      reste fermée au navigateur.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/purge_citations_veille.sql

begin;

insert into auth.users (id, email) values
  ('151b1111-0000-0000-0000-0000000000a1', 'ca@b151.test');
insert into public.agencies (id, name) values
  ('151baaaa-0000-0000-0000-000000000000', 'Agence 151 B');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('151b1111-0000-0000-0000-0000000000a1', '151baaaa-0000-0000-0000-000000000000', 'Carl', 'Conseiller', 'ca@b151.test', 'advisor');
insert into public.buyers (id, agency_id, advisor_id, name, cities) values
  ('151baaaa-3333-0000-0000-000000000000', '151baaaa-0000-0000-0000-000000000000',
   '151b1111-0000-0000-0000-0000000000a1', 'M. et Mme Lambert', array['Vence']);

create function pg_temp.expect(p_label text, p_got text, p_want text) returns void language plpgsql as $$
begin
  if p_got is distinct from p_want then
    raise exception 'FAIL % : attendu %, obtenu %', p_label, p_want, p_got;
  end if;
  raise notice 'ok — %', p_label;
end $$;

-- Un bien gardé par la veille, avec le jugement de ce qui compte pour lui.
create function pg_temp.find(p_url text, p_soft boolean) returns jsonb language sql as $$
  select jsonb_build_object('url', p_url, 'price', 740000)
    || case when p_soft then jsonb_build_object('soft', jsonb_build_object('judgments', jsonb_build_array(
         jsonb_build_object('key', 'calme', 'verdict', 'reserve', 'quote', 'Quartier calme',
                            'counterQuote', 'à deux pas de la route', 'toVerify', false),
         jsonb_build_object('key', 'vue', 'verdict', 'nothing', 'quote', null,
                            'counterQuote', null, 'toVerify', false),
         -- Un jugement sans clé `counterQuote` (une forme plus ancienne ou partielle).
         jsonb_build_object('key', 'plain_pied', 'verdict', 'clearly', 'quote', 'Entièrement de plain-pied',
                            'toVerify', false))))
       else '{}'::jsonb end
$$;
-- Un bien en classement simplifié : les seuls mots trouvés, jamais touchés par la purge.
create function pg_temp.mentions(p_url text) returns jsonb language sql as $$
  select jsonb_build_object('url', p_url, 'price', 729000,
    'soft', jsonb_build_object('mentions', jsonb_build_array('calme')))
$$;

insert into public.buyer_watch_runs (id, agency_id, buyer_id, ran_at, status, seen_since, adverts, found_count, finds) values
  ('151bbbbb-0000-0000-0000-000000000001', '151baaaa-0000-0000-0000-000000000000',
   '151baaaa-3333-0000-0000-000000000000', '2021-06-01 02:17:00+00', 'done',
   '2021-05-25 02:17:00+00', 20, 3,
   jsonb_build_array(pg_temp.find('https://a.fr/1', true), pg_temp.find('https://a.fr/2', false),
                     pg_temp.mentions('https://a.fr/5'))),
  ('151bbbbb-0000-0000-0000-000000000002', '151baaaa-0000-0000-0000-000000000000',
   '151baaaa-3333-0000-0000-000000000000', now() - interval '1 year', 'done',
   now() - interval '1 year 7 days', 0, 0, jsonb_build_array(pg_temp.find('https://a.fr/3', true))),
  ('151bbbbb-0000-0000-0000-000000000003', '151baaaa-0000-0000-0000-000000000000',
   '151baaaa-3333-0000-0000-000000000000', now() - interval '5 years', 'done',
   now() - interval '5 years 7 days', 0, 0, jsonb_build_array(pg_temp.find('https://a.fr/4', false)));

-- Le premier appel compte au moins ce passage ; le second, plus rien (§3).
create temp table counted as select public.purge_stale_listing_texts() as first_pass;
select pg_temp.expect('§1 le premier appel compte le passage ancien',
  (select (first_pass >= 1)::text from counted), 'true');

-- §1 — le passage ancien perd ses citations ; le jugement et le reste restent.
select pg_temp.expect('§1 citation vidée',
  (select finds #>> '{0,soft,judgments,0,quote}' from public.buyer_watch_runs
    where id = '151bbbbb-0000-0000-0000-000000000001'), null);
select pg_temp.expect('§1 contre-citation vidée',
  (select finds #>> '{0,soft,judgments,0,counterQuote}' from public.buyer_watch_runs
    where id = '151bbbbb-0000-0000-0000-000000000001'), null);
select pg_temp.expect('§1 le jugement reste',
  (select finds #>> '{0,soft,judgments,0,verdict}' from public.buyer_watch_runs
    where id = '151bbbbb-0000-0000-0000-000000000001'), 'reserve');
select pg_temp.expect('§1 le bien et l''ordre restent',
  (select string_agg(f ->> 'url', ',' order by o) from public.buyer_watch_runs w,
     jsonb_array_elements(w.finds) with ordinality as e(f, o)
    where w.id = '151bbbbb-0000-0000-0000-000000000001'), 'https://a.fr/1,https://a.fr/2,https://a.fr/5');
select pg_temp.expect('§1 le jugement sans contre-citation : citation vidée, verdict gardé',
  (select (finds #>> '{0,soft,judgments,2,quote}') is null
          and finds #>> '{0,soft,judgments,2,verdict}' = 'clearly'
     from public.buyer_watch_runs where id = '151bbbbb-0000-0000-0000-000000000001')::text, 'true');
select pg_temp.expect('§1 le bien sans jugement reste à l''identique',
  (select (finds -> 1)::text from public.buyer_watch_runs
    where id = '151bbbbb-0000-0000-0000-000000000001'), pg_temp.find('https://a.fr/2', false)::text);
select pg_temp.expect('§1 les mots trouvés restent à l''identique',
  (select (finds -> 2)::text from public.buyer_watch_runs
    where id = '151bbbbb-0000-0000-0000-000000000001'), pg_temp.mentions('https://a.fr/5')::text);
select pg_temp.expect('§1 le reste du passage ne bouge pas',
  (select concat_ws('|', ran_at, seen_since, status, adverts, found_count) from public.buyer_watch_runs
    where id = '151bbbbb-0000-0000-0000-000000000001'),
  concat_ws('|', '2021-06-01 02:17:00+00'::timestamptz, '2021-05-25 02:17:00+00'::timestamptz,
            'done', 20, 3));

-- §2 — le passage récent garde ses citations ; l'ancien sans jugement n'est pas touché.
select pg_temp.expect('§2 citation récente gardée',
  (select finds #>> '{0,soft,judgments,0,quote}' from public.buyer_watch_runs
    where id = '151bbbbb-0000-0000-0000-000000000002'), 'Quartier calme');
select pg_temp.expect('§2 passage ancien sans jugement intact',
  (select finds::text from public.buyer_watch_runs where id = '151bbbbb-0000-0000-0000-000000000003'),
  jsonb_build_array(pg_temp.find('https://a.fr/4', false))::text);

-- §3 — une seconde passe ne compte plus ce passage ; la fiche supprimée emporte ses passages ;
-- la fonction reste fermée au navigateur.
select pg_temp.expect('§3 une seconde passe ne compte plus rien',
  public.purge_stale_listing_texts()::text, '0');
select pg_temp.expect('§3 fermée au navigateur',
  has_function_privilege('authenticated', 'public.purge_stale_listing_texts()', 'execute')::text,
  'false');
select pg_temp.expect('§3 fermée à anon',
  has_function_privilege('anon', 'public.purge_stale_listing_texts()', 'execute')::text, 'false');
delete from public.buyers where id = '151baaaa-3333-0000-0000-000000000000';
select pg_temp.expect('§3 la fiche supprimée emporte ses passages',
  (select count(*)::text from public.buyer_watch_runs
    where buyer_id = '151baaaa-3333-0000-0000-000000000000'), '0');

rollback;
