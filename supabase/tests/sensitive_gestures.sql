-- Mission 100 — les gestes sensibles, prouvés dans la base, vus comme les voit le navigateur
-- (rôle `authenticated`, identité du jeton). Ce test complète ceux qui existent (conclusion,
-- réponses figées, opposition, relance) sur ce qu'ils ne prouvaient pas.
--   §1 conclure, changer l'issue et enregistrer le prix de commercialisation ne s'appellent PAS
--      depuis le navigateur : seules les actions serveur, après leurs gardes, y ont droit ;
--   §2 archiver : un conseiller archive un dossier de SON agence ; un membre retiré n'archive rien ;
--   §3 invitations : lues par l'agence seule, jamais écrites depuis le navigateur, manager compris ;
--   §4 réglages de recherche : un objet ou rien ; ceux d'une autre agence ne se modifient pas ;
--   §5 consommation Stream Estate : chacun lit celle de son agence, personne ne l'écrit ni ne
--      l'efface depuis le navigateur ; la somme du mois ne mélange pas les agences ;
--   §6 plafond : lu par l'agence, réglé par personne depuis le navigateur — pas même son manager ;
--   §8 (mission 101) « retenu, import en attente » : enregistré par l'agence sur ses dossiers, une
--      fois par bien, invisible aux autres agences ; le journal admet l'origine « import » ;
--   §7 journal des erreurs : ni lu ni écrit depuis le navigateur ; les bornes de la base tiennent ;
--      il se vide seul au-delà de 90 jours, chaque nuit, et le navigateur ne déclenche pas la purge.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/sensitive_gestures.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

-- Agence A (manager MA, conseiller CA, R retiré), agence B (conseiller CB).
insert into auth.users (id, email) values
  ('10100000-0000-0000-0000-0000000000a0', 'ma@a101.test'),
  ('10100000-0000-0000-0000-0000000000a1', 'ca@a101.test'),
  ('10100000-0000-0000-0000-0000000000d1', 'retire@a101.test'),
  ('10100000-0000-0000-0000-0000000000b1', 'cb@b101.test');
insert into public.agencies (id, name) values
  ('101aaaaa-0000-0000-0000-000000000000', 'Agence A 101'),
  ('101bbbbb-0000-0000-0000-000000000000', 'Agence B 101');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, removed_at) values
  ('10100000-0000-0000-0000-0000000000a0', '101aaaaa-0000-0000-0000-000000000000', 'Marie', 'Manager', 'ma@a101.test', 'manager', null),
  ('10100000-0000-0000-0000-0000000000a1', '101aaaaa-0000-0000-0000-000000000000', 'Carl', 'A', 'ca@a101.test', 'advisor', null),
  ('10100000-0000-0000-0000-0000000000d1', '101aaaaa-0000-0000-0000-000000000000', 'Rémi', 'Retiré', 'retire@a101.test', 'advisor', now()),
  ('10100000-0000-0000-0000-0000000000b1', '101bbbbb-0000-0000-0000-000000000000', 'Boris', 'B', 'cb@b101.test', 'advisor', null);
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('101ccccc-0000-0000-0000-000000000001', '101aaaaa-0000-0000-0000-000000000000',
   '10100000-0000-0000-0000-0000000000a1', 'dossier A1', 'draft'),
  ('101ccccc-0000-0000-0000-000000000002', '101aaaaa-0000-0000-0000-000000000000',
   '10100000-0000-0000-0000-0000000000a1', 'dossier A2', 'draft'),
  ('101ccccc-0000-0000-0000-0000000000b1', '101bbbbb-0000-0000-0000-000000000000',
   '10100000-0000-0000-0000-0000000000b1', 'dossier B1', 'draft');
insert into public.agency_invitations (agency_id, email, role, invited_by) values
  ('101aaaaa-0000-0000-0000-000000000000', 'invite@a101.test', 'advisor', '10100000-0000-0000-0000-0000000000a0'),
  ('101bbbbb-0000-0000-0000-000000000000', 'invite@b101.test', 'advisor', '10100000-0000-0000-0000-0000000000b1');
-- Ce que le serveur a compté (clé service) : 40 + 25 annonces ce mois-ci pour A, 12 le mois
-- dernier ; 700 pour B. Un plafond réglé pour A : 10 €.
insert into public.stream_estate_usage (agency_id, project_id, user_id, adverts, created_at) values
  ('101aaaaa-0000-0000-0000-000000000000', '101ccccc-0000-0000-0000-000000000001', '10100000-0000-0000-0000-0000000000a1', 40, now()),
  ('101aaaaa-0000-0000-0000-000000000000', '101ccccc-0000-0000-0000-000000000002', '10100000-0000-0000-0000-0000000000a1', 25, now()),
  ('101aaaaa-0000-0000-0000-000000000000', null, null, 12, now() - interval '40 days'),
  ('101bbbbb-0000-0000-0000-000000000000', '101ccccc-0000-0000-0000-0000000000b1', '10100000-0000-0000-0000-0000000000b1', 700, now());
insert into public.agency_search_budgets (agency_id, monthly_cap_cents) values
  ('101aaaaa-0000-0000-0000-000000000000', 1000);
insert into public.app_errors (agency_id, source, page, message) values
  ('101aaaaa-0000-0000-0000-000000000000', 'server', '/builder', 'fetch failed');

create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
grant execute on function pg_temp.act_as(uuid) to authenticated;

-- 'refus' : privilège ou politique (42501) ; 'invalide' : contrainte ; sinon les lignes touchées.
create function pg_temp.attempt(p_sql text) returns text language plpgsql as $$
declare v_rows int;
begin
  execute p_sql;
  get diagnostics v_rows = row_count;
  return v_rows::text;
exception
  when insufficient_privilege then return 'refus';
  when check_violation then return 'invalide';
  when unique_violation then return 'doublon';
end $$;
grant execute on function pg_temp.attempt(text) to authenticated;

create function pg_temp.read_count(p_sql text) returns text language plpgsql as $$
declare v_count bigint;
begin
  execute p_sql into v_count;
  return v_count::text;
exception when insufficient_privilege then return 'refus';
end $$;
grant execute on function pg_temp.read_count(text) to authenticated;

create function pg_temp.expect(p_label text, p_got text, p_want text) returns void
language plpgsql as $$
begin
  if p_got is distinct from p_want then
    raise exception 'FAIL % : attendu %, obtenu %', p_label, p_want, p_got;
  end if;
end $$;
grant execute on function pg_temp.expect(text, text, text) to authenticated;

-- =====================================================================
-- §1 — les fonctions de conclusion : fermées au navigateur, ouvertes au serveur. Toutes les
--      signatures de chaque nom (les anciennes restent pour le code précédent).
-- =====================================================================
do $$
declare
  f record;
  v_seen int := 0;
begin
  for f in
    select p.oid, p.proname, p.prosecdef
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('conclude_meeting', 'change_meeting_outcome', 'save_commercialization_price')
  loop
    v_seen := v_seen + 1;
    if has_function_privilege('authenticated', f.oid, 'execute')
       or has_function_privilege('anon', f.oid, 'execute') then
      raise exception 'FAIL §1 % : appelable depuis le navigateur', f.proname;
    end if;
    if not has_function_privilege('service_role', f.oid, 'execute') then
      raise exception 'FAIL §1 % : le serveur ne peut plus l''appeler', f.proname;
    end if;
  end loop;
  if v_seen < 3 then
    raise exception 'FAIL §1 : % fonction(s) de conclusion trouvée(s), 3 attendues au moins', v_seen;
  end if;
end $$;

-- =====================================================================
-- §2 — archiver (le conseiller CA de l'agence A).
-- =====================================================================
select pg_temp.act_as('10100000-0000-0000-0000-0000000000a1');

select pg_temp.expect('§2 archiver un dossier de son agence',
  pg_temp.attempt($$update public.projects set status = 'archived'
                    where id = '101ccccc-0000-0000-0000-000000000001'$$), '1');
select pg_temp.expect('§2 archiver le dossier d''une autre agence',
  pg_temp.attempt($$update public.projects set status = 'archived'
                    where id = '101ccccc-0000-0000-0000-0000000000b1'$$), '0');
select pg_temp.expect('§2 donner son dossier à une autre agence',
  pg_temp.attempt($$update public.projects set agency_id = '101bbbbb-0000-0000-0000-000000000000'
                    where id = '101ccccc-0000-0000-0000-000000000002'$$), 'refus');

-- §4 — réglages de recherche (toujours CA).
select pg_temp.expect('§4 enregistrer des réglages sur son dossier',
  pg_temp.attempt($$update public.projects set search_settings = '{"expand":false}'::jsonb
                    where id = '101ccccc-0000-0000-0000-000000000002'$$), '1');
select pg_temp.expect('§4 des réglages qui ne sont pas un objet',
  pg_temp.attempt($$update public.projects set search_settings = '[1,2]'::jsonb
                    where id = '101ccccc-0000-0000-0000-000000000002'$$), 'invalide');
select pg_temp.expect('§4 revenir à l''automatique (rien)',
  pg_temp.attempt($$update public.projects set search_settings = null
                    where id = '101ccccc-0000-0000-0000-000000000002'$$), '1');
select pg_temp.expect('§4 régler la recherche d''une autre agence',
  pg_temp.attempt($$update public.projects set search_settings = '{"expand":false}'::jsonb
                    where id = '101ccccc-0000-0000-0000-0000000000b1'$$), '0');

-- §3 — invitations : le conseiller lit celles de son agence, n'en écrit aucune.
select pg_temp.expect('§3 lire les invitations de son agence',
  pg_temp.read_count($$select count(*) from public.agency_invitations$$), '1');
select pg_temp.expect('§3 un conseiller s''invite lui-même manager',
  pg_temp.attempt($$insert into public.agency_invitations (agency_id, email, role, invited_by)
                    values ('101aaaaa-0000-0000-0000-000000000000', 'pirate@a101.test', 'manager',
                            '10100000-0000-0000-0000-0000000000a1')$$), 'refus');
select pg_temp.expect('§3 un conseiller change le rôle d''une invitation',
  pg_temp.attempt($$update public.agency_invitations set role = 'manager'$$), 'refus');
select pg_temp.expect('§3 un conseiller annule une invitation',
  pg_temp.attempt($$delete from public.agency_invitations$$), 'refus');

-- §5 — consommation : lue, jamais écrite.
select pg_temp.expect('§5 lire la consommation de son agence (3 lignes)',
  pg_temp.read_count($$select count(*) from public.stream_estate_usage$$), '3');
select pg_temp.expect('§5 la somme du mois est celle de SON agence : 40 + 25',
  (select string_agg(agency_id::text || '=' || adverts::text, ',')
     from public.stream_estate_usage_since(date_trunc('month', now()))),
  '101aaaaa-0000-0000-0000-000000000000=65');
select pg_temp.expect('§5 ajouter une ligne de consommation',
  pg_temp.attempt($$insert into public.stream_estate_usage (agency_id, adverts)
                    values ('101aaaaa-0000-0000-0000-000000000000', 1)$$), 'refus');
select pg_temp.expect('§5 effacer sa consommation',
  pg_temp.attempt($$delete from public.stream_estate_usage$$), 'refus');
select pg_temp.expect('§5 réduire sa consommation',
  pg_temp.attempt($$update public.stream_estate_usage set adverts = 1$$), 'refus');

-- §6 — plafond : lu, jamais réglé.
select pg_temp.expect('§6 lire le plafond de son agence',
  (select monthly_cap_cents::text from public.agency_search_budgets), '1000');
select pg_temp.expect('§6 un conseiller relève le plafond',
  pg_temp.attempt($$update public.agency_search_budgets set monthly_cap_cents = 100000$$), 'refus');

-- §7 — journal des erreurs : fermé.
select pg_temp.expect('§7 lire le journal des erreurs',
  pg_temp.read_count($$select count(*) from public.app_errors$$), 'refus');
select pg_temp.expect('§7 écrire dans le journal des erreurs',
  pg_temp.attempt($$insert into public.app_errors (source, page, message)
                    values ('browser', '/x', 'faux')$$), 'refus');

-- =====================================================================
-- Le manager MA de l'agence A : pas plus de droits sur les invitations ni sur le plafond.
-- =====================================================================
select pg_temp.act_as('10100000-0000-0000-0000-0000000000a0');

select pg_temp.expect('§3 un manager invite depuis le navigateur',
  pg_temp.attempt($$insert into public.agency_invitations (agency_id, email, role, invited_by)
                    values ('101aaaaa-0000-0000-0000-000000000000', 'direct@a101.test', 'advisor',
                            '10100000-0000-0000-0000-0000000000a0')$$), 'refus');
select pg_temp.expect('§3 un manager annule depuis le navigateur',
  pg_temp.attempt($$delete from public.agency_invitations$$), 'refus');
select pg_temp.expect('§6 un manager relève le plafond de son agence',
  pg_temp.attempt($$update public.agency_search_budgets set monthly_cap_cents = 100000$$), 'refus');
select pg_temp.expect('§6 un manager supprime le plafond (retour à 30 €)',
  pg_temp.attempt($$delete from public.agency_search_budgets$$), 'refus');
select pg_temp.expect('§6 un manager se crée un plafond',
  pg_temp.attempt($$insert into public.agency_search_budgets (agency_id, monthly_cap_cents)
                    values ('101aaaaa-0000-0000-0000-000000000000', 100000)$$), 'refus');
select pg_temp.expect('§5 un manager efface la consommation',
  pg_temp.attempt($$delete from public.stream_estate_usage$$), 'refus');
select pg_temp.expect('§7 un manager lit le journal des erreurs',
  pg_temp.read_count($$select count(*) from public.app_errors$$), 'refus');

-- =====================================================================
-- Le conseiller CB de l'agence B : rien de A.
-- =====================================================================
select pg_temp.act_as('10100000-0000-0000-0000-0000000000b1');

select pg_temp.expect('§3 lire les invitations d''une autre agence',
  pg_temp.read_count($$select count(*) from public.agency_invitations
                        where agency_id = '101aaaaa-0000-0000-0000-000000000000'$$), '0');
select pg_temp.expect('§5 lire la consommation d''une autre agence',
  pg_temp.read_count($$select count(*) from public.stream_estate_usage
                        where agency_id = '101aaaaa-0000-0000-0000-000000000000'$$), '0');
select pg_temp.expect('§5 la somme du mois de B ne compte que B',
  (select string_agg(agency_id::text || '=' || adverts::text, ',')
     from public.stream_estate_usage_since(date_trunc('month', now()))),
  '101bbbbb-0000-0000-0000-000000000000=700');
select pg_temp.expect('§6 lire le plafond d''une autre agence',
  pg_temp.read_count($$select count(*) from public.agency_search_budgets$$), '0');

-- =====================================================================
-- Le membre retiré R : n'archive rien, ne lit ni consommation ni plafond.
-- =====================================================================
select pg_temp.act_as('10100000-0000-0000-0000-0000000000d1');

select pg_temp.expect('§2 un membre retiré archive un dossier',
  pg_temp.attempt($$update public.projects set status = 'archived'
                    where id = '101ccccc-0000-0000-0000-000000000002'$$), '0');
select pg_temp.expect('§5 un membre retiré lit la consommation',
  pg_temp.read_count($$select count(*) from public.stream_estate_usage$$), '0');
select pg_temp.expect('§6 un membre retiré lit le plafond',
  pg_temp.read_count($$select count(*) from public.agency_search_budgets$$), '0');

-- =====================================================================
-- Le serveur (clé service) : voit toutes les agences, et les bornes de la base tiennent.
-- =====================================================================
reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;

select pg_temp.expect('§5 le serveur lit la consommation du mois de toutes les agences',
  (select string_agg(adverts::text, ',' order by adverts)
     from public.stream_estate_usage_since(date_trunc('month', now()))
    where agency_id in ('101aaaaa-0000-0000-0000-000000000000', '101bbbbb-0000-0000-0000-000000000000')),
  '65,700');
select pg_temp.expect('§7 le serveur lit le journal',
  (select count(*)::text from public.app_errors
    where agency_id = '101aaaaa-0000-0000-0000-000000000000'), '1');

reset role;
grant execute on function pg_temp.attempt(text) to service_role;
select pg_temp.expect('§5 une recherche à 0 annonce ne s''écrit pas',
  pg_temp.attempt($$insert into public.stream_estate_usage (agency_id, adverts)
                    values ('101aaaaa-0000-0000-0000-000000000000', 0)$$), 'invalide');
select pg_temp.expect('§6 un plafond négatif',
  pg_temp.attempt($$update public.agency_search_budgets set monthly_cap_cents = -1$$), 'invalide');
select pg_temp.expect('§6 un plafond au-delà de 1 000 €',
  pg_temp.attempt($$update public.agency_search_budgets set monthly_cap_cents = 100001$$), 'invalide');
select pg_temp.expect('§7 un message de plus de 300 caractères',
  pg_temp.attempt(format($$insert into public.app_errors (source, page, message)
                           values ('server', '/x', %L)$$, repeat('a', 301))), 'invalide');
select pg_temp.expect('§7 une origine hors liste',
  pg_temp.attempt($$insert into public.app_errors (source, page, message)
                    values ('ailleurs', '/x', 'a')$$), 'invalide');

-- §7 — conservation : 90 jours. Une ligne de 91 jours part, une de 89 jours reste.
insert into public.app_errors (agency_id, source, page, message, created_at) values
  ('101aaaaa-0000-0000-0000-000000000000', 'server', '/x', 'vieille de 91 jours', now() - interval '91 days'),
  ('101aaaaa-0000-0000-0000-000000000000', 'server', '/x', 'vieille de 89 jours', now() - interval '89 days');
select pg_temp.expect('§7 la purge supprime ce qui a plus de 90 jours, et cela seul',
  (select public.purge_old_app_errors()::text), '1');
select pg_temp.expect('§7 ce qui reste après la purge',
  (select string_agg(message, ' | ' order by message) from public.app_errors
    where agency_id = '101aaaaa-0000-0000-0000-000000000000'),
  'fetch failed | vieille de 89 jours');
select pg_temp.expect('§7 la purge est planifiée chaque nuit, une seule fois',
  (select string_agg(schedule || ' ' || command, ' ; ') from cron.job
    where jobname = 'purge-app-errors' and active),
  '17 3 * * * select public.purge_old_app_errors()');
select pg_temp.expect('§7 le navigateur ne déclenche pas la purge',
  (has_function_privilege('authenticated', 'public.purge_old_app_errors()', 'execute')
   or has_function_privilege('anon', 'public.purge_old_app_errors()', 'execute'))::text, 'false');

-- Supprimer un dossier (le nettoyage de l'agence de test) garde la consommation, sans dossier.
delete from public.projects where id = '101ccccc-0000-0000-0000-000000000001';
select pg_temp.expect('§5 la consommation survit au dossier',
  (select count(*)::text || ' ligne(s), dont ' || count(project_id)::text || ' avec dossier'
     from public.stream_estate_usage
    where agency_id = '101aaaaa-0000-0000-0000-000000000000'),
  '3 ligne(s), dont 1 avec dossier');

-- =====================================================================
-- §8 (mission 101) — « retenu, import en attente » et l'origine « import » du journal.
-- =====================================================================
select pg_temp.act_as('10100000-0000-0000-0000-0000000000a1');

select pg_temp.expect('§8 enregistrer un bien retenu sur un dossier de son agence',
  pg_temp.attempt($$insert into public.pending_competitor_imports
                      (agency_id, project_id, listing_url, listing_host, snapshot)
                    values ('101aaaaa-0000-0000-0000-000000000000', '101ccccc-0000-0000-0000-000000000002',
                            'https://www.seloger.com/annonces/1.htm', 'www.seloger.com', '{"source":"portal"}')$$), '1');
select pg_temp.expect('§8 le même bien deux fois sur le même dossier',
  pg_temp.attempt($$insert into public.pending_competitor_imports
                      (agency_id, project_id, listing_url, listing_host, snapshot)
                    values ('101aaaaa-0000-0000-0000-000000000000', '101ccccc-0000-0000-0000-000000000002',
                            'https://www.seloger.com/annonces/1.htm', 'www.seloger.com', '{}')$$), 'doublon');
select pg_temp.expect('§8 rattacher son bien en attente au dossier d''une autre agence',
  pg_temp.attempt($$insert into public.pending_competitor_imports
                      (agency_id, project_id, listing_url, listing_host, snapshot)
                    values ('101aaaaa-0000-0000-0000-000000000000', '101ccccc-0000-0000-0000-0000000000b1',
                            'https://www.seloger.com/annonces/2.htm', 'www.seloger.com', '{}')$$), 'refus');
select pg_temp.expect('§8 une cause hors liste',
  pg_temp.attempt($$update public.pending_competitor_imports set last_cause = 'inventee'$$), 'invalide');
select pg_temp.expect('§8 des données qui ne sont pas un objet',
  pg_temp.attempt($$update public.pending_competitor_imports set snapshot = '[1]'$$), 'invalide');
select pg_temp.expect('§8 noter la cause du dernier essai',
  pg_temp.attempt($$update public.pending_competitor_imports set last_cause = 'robots', attempts = 1$$), '1');

select pg_temp.act_as('10100000-0000-0000-0000-0000000000b1');
select pg_temp.expect('§8 une autre agence ne lit pas les biens en attente',
  pg_temp.read_count($$select count(*) from public.pending_competitor_imports$$), '0');
select pg_temp.expect('§8 une autre agence ne les retire pas',
  pg_temp.attempt($$delete from public.pending_competitor_imports$$), '0');

select pg_temp.act_as('10100000-0000-0000-0000-0000000000a1');
select pg_temp.expect('§8 y renoncer retire la ligne',
  pg_temp.attempt($$delete from public.pending_competitor_imports$$), '1');

reset role;
select pg_temp.expect('§8 le journal admet l''origine « import »',
  pg_temp.attempt($$insert into public.app_errors (source, page, message)
                    values ('import', '/builder/[id]/comparables/find', 'seloger.com · robots')$$), '1');
-- Supprimer le dossier emporte ses biens en attente.
insert into public.pending_competitor_imports (agency_id, project_id, listing_url, listing_host, snapshot)
values ('101aaaaa-0000-0000-0000-000000000000', '101ccccc-0000-0000-0000-000000000002',
        'https://www.seloger.com/annonces/3.htm', 'www.seloger.com', '{}');
delete from public.projects where id = '101ccccc-0000-0000-0000-000000000002';
select pg_temp.expect('§8 les biens en attente partent avec leur dossier',
  (select count(*)::text from public.pending_competitor_imports
    where agency_id = '101aaaaa-0000-0000-0000-000000000000'), '0');

select 'sensitive_gestures : OK' as resultat;

rollback;
