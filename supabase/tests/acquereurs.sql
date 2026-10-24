-- Mission 117 — la fiche acquéreur, prouvée dans la base :
--   §1 un conseiller lit les acquéreurs de son agence, ceux d'un collègue compris ;
--   §2 une autre agence ne lit rien ; un membre retiré ne lit rien ;
--   §3 le navigateur n'écrit ni ne retire rien (privilèges), manager compris ;
--   §4 les contraintes : nom et commune obligatoires, budgets cohérents, pièces ≥ chambres,
--      statut, type, critère indispensable hors liste ;
--   §5 la clé service écrit, archive (suppression douce) et date le statut.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/acquereurs.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id, email) values
  ('11711111-0000-0000-0000-0000000000a0', 'ma@a117.test'),
  ('11711111-0000-0000-0000-0000000000a1', 'ca@a117.test'),
  ('11711111-0000-0000-0000-0000000000a2', 'ra@a117.test'),
  ('11711111-0000-0000-0000-0000000000b1', 'cb@b117.test');
insert into public.agencies (id, name) values
  ('117aaaaa-0000-0000-0000-000000000000', 'Agence A 117'),
  ('117bbbbb-0000-0000-0000-000000000000', 'Agence B 117');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, removed_at) values
  ('11711111-0000-0000-0000-0000000000a0', '117aaaaa-0000-0000-0000-000000000000',
   'Marie', 'Manager', 'ma@a117.test', 'manager', null),
  ('11711111-0000-0000-0000-0000000000a1', '117aaaaa-0000-0000-0000-000000000000',
   'Carl', 'Conseiller', 'ca@a117.test', 'advisor', null),
  ('11711111-0000-0000-0000-0000000000a2', '117aaaaa-0000-0000-0000-000000000000',
   'Rémi', 'Retiré', 'ra@a117.test', 'advisor', now()),
  ('11711111-0000-0000-0000-0000000000b1', '117bbbbb-0000-0000-0000-000000000000',
   'Boris', 'Conseiller', 'cb@b117.test', 'advisor', null);

-- Deux acquéreurs de l'agence A : un de la manager, un du conseiller.
insert into public.buyers (id, agency_id, advisor_id, name, cities, property_types, budget_max) values
  ('117aaaaa-1111-0000-0000-000000000000', '117aaaaa-0000-0000-0000-000000000000',
   '11711111-0000-0000-0000-0000000000a0', 'M. Durand', array['Antibes'], array['apartment'], 430000),
  ('117aaaaa-2222-0000-0000-000000000000', '117aaaaa-0000-0000-0000-000000000000',
   '11711111-0000-0000-0000-0000000000a1', 'Mme Petit', array['Mougins', 'Valbonne'], array['house'], 900000);

create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
grant execute on function pg_temp.act_as(uuid) to authenticated;

create function pg_temp.act_as_service() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform set_config('role', 'service_role', true);
end $$;

-- Refusée par les PRIVILÈGES : 42501 → 'refus' ; par une CONTRAINTE : 23514 → 'contrainte' ;
-- par une POLITIQUE : aucune ligne touchée. Sinon le nombre de lignes touchées.
create function pg_temp.attempt(p_sql text) returns text language plpgsql as $$
declare v_rows int;
begin
  execute p_sql;
  get diagnostics v_rows = row_count;
  return v_rows::text;
exception
  when insufficient_privilege then return 'refus';
  when check_violation then return 'contrainte';
  when not_null_violation then return 'contrainte';
end $$;
grant execute on function pg_temp.attempt(text) to authenticated;

create function pg_temp.expect(p_label text, p_got text, p_want text) returns void
language plpgsql as $$
begin
  if p_got is distinct from p_want then
    raise exception 'FAIL % : attendu %, obtenu %', p_label, p_want, p_got;
  end if;
  raise notice 'ok — %', p_label;
end $$;
grant execute on function pg_temp.expect(text, text, text) to authenticated;

-- §1 — le conseiller lit les deux acquéreurs de son agence.
select pg_temp.act_as('11711111-0000-0000-0000-0000000000a1');
select pg_temp.expect('§1 le conseiller lit les acquéreurs de l''agence, celui de la manager compris',
  (select count(*)::text from public.buyers), '2');
select pg_temp.act_as('11711111-0000-0000-0000-0000000000a0');
select pg_temp.expect('§1 la manager aussi', (select count(*)::text from public.buyers), '2');

-- §3 — le navigateur n'écrit rien, manager compris.
select pg_temp.expect('§3 le manager ne crée pas un acquéreur depuis le navigateur',
  pg_temp.attempt($$insert into public.buyers (agency_id, advisor_id, name, cities)
    values ('117aaaaa-0000-0000-0000-000000000000', '11711111-0000-0000-0000-0000000000a0',
            'Intrus', array['Nice'])$$), 'refus');
select pg_temp.expect('§3 le manager ne modifie pas un acquéreur depuis le navigateur',
  pg_temp.attempt($$update public.buyers set name = 'Changé' where id = '117aaaaa-1111-0000-0000-000000000000'$$), 'refus');
select pg_temp.expect('§3 le manager n''archive pas depuis le navigateur',
  pg_temp.attempt($$update public.buyers set archived_at = now() where id = '117aaaaa-1111-0000-0000-000000000000'$$), 'refus');
select pg_temp.expect('§3 le manager ne supprime pas depuis le navigateur',
  pg_temp.attempt($$delete from public.buyers where id = '117aaaaa-1111-0000-0000-000000000000'$$), 'refus');

-- §2 — une autre agence et un membre retiré ne lisent rien.
select pg_temp.act_as('11711111-0000-0000-0000-0000000000b1');
select pg_temp.expect('§2 une autre agence ne lit rien', (select count(*)::text from public.buyers), '0');
select pg_temp.act_as('11711111-0000-0000-0000-0000000000a2');
select pg_temp.expect('§2 un membre retiré ne lit rien', (select count(*)::text from public.buyers), '0');

-- §4 et §5 — la clé service écrit, dans les contraintes.
select pg_temp.act_as_service();
select pg_temp.expect('§4 sans nom : refusé',
  pg_temp.attempt($$insert into public.buyers (agency_id, advisor_id, name, cities)
    values ('117aaaaa-0000-0000-0000-000000000000', '11711111-0000-0000-0000-0000000000a1', '  ', array['Nice'])$$), 'contrainte');
select pg_temp.expect('§4 sans commune : refusé',
  pg_temp.attempt($$insert into public.buyers (agency_id, advisor_id, name, cities)
    values ('117aaaaa-0000-0000-0000-000000000000', '11711111-0000-0000-0000-0000000000a1', 'Sans commune', '{}')$$), 'contrainte');
select pg_temp.expect('§4 budget idéal au-dessus du plafond : refusé',
  pg_temp.attempt($$insert into public.buyers (agency_id, advisor_id, name, cities, budget_ideal, budget_max)
    values ('117aaaaa-0000-0000-0000-000000000000', '11711111-0000-0000-0000-0000000000a1', 'Budget', array['Nice'], 500000, 400000)$$), 'contrainte');
select pg_temp.expect('§4 plus de chambres que de pièces : refusé',
  pg_temp.attempt($$insert into public.buyers (agency_id, advisor_id, name, cities, rooms_min, bedrooms_min)
    values ('117aaaaa-0000-0000-0000-000000000000', '11711111-0000-0000-0000-0000000000a1', 'Pièces', array['Nice'], 2, 3)$$), 'contrainte');
select pg_temp.expect('§4 statut hors liste : refusé',
  pg_temp.attempt($$insert into public.buyers (agency_id, advisor_id, name, cities, status)
    values ('117aaaaa-0000-0000-0000-000000000000', '11711111-0000-0000-0000-0000000000a1', 'Statut', array['Nice'], 'signed')$$), 'contrainte');
select pg_temp.expect('§4 type de bien hors liste : refusé',
  pg_temp.attempt($$insert into public.buyers (agency_id, advisor_id, name, cities, property_types)
    values ('117aaaaa-0000-0000-0000-000000000000', '11711111-0000-0000-0000-0000000000a1', 'Type', array['Nice'], array['land'])$$), 'contrainte');
select pg_temp.expect('§4 critère indispensable hors liste : refusé',
  pg_temp.attempt($$insert into public.buyers (agency_id, advisor_id, name, cities, must_have)
    values ('117aaaaa-0000-0000-0000-000000000000', '11711111-0000-0000-0000-0000000000a1', 'Critère', array['Nice'], array['price'])$$), 'contrainte');

select pg_temp.expect('§5 la clé service crée un acquéreur complet',
  pg_temp.attempt($$insert into public.buyers (id, agency_id, advisor_id, name, cities, property_types,
      budget_ideal, budget_max, rooms_min, bedrooms_min, surface_min, outdoor, must_have)
    values ('117aaaaa-3333-0000-0000-000000000000', '117aaaaa-0000-0000-0000-000000000000',
            '11711111-0000-0000-0000-0000000000a1', 'M. Leroy', array['Antibes', 'Juan-les-Pins'],
            array['apartment'], 400000, 430000, 3, 2, 65, true, array['outdoor'])$$), '1');
select pg_temp.expect('§5 en recherche par défaut',
  (select status from public.buyers where id = '117aaaaa-3333-0000-0000-000000000000'), 'searching');
select pg_temp.expect('§5 le statut passe en visite, daté',
  pg_temp.attempt($$update public.buyers set status = 'visiting', status_changed_at = now() + interval '1 minute'
    where id = '117aaaaa-3333-0000-0000-000000000000'$$), '1');
select pg_temp.expect('§5 la date du statut a bougé',
  (select (status_changed_at > created_at)::text from public.buyers where id = '117aaaaa-3333-0000-0000-000000000000'), 'true');
select pg_temp.expect('§5 l''archivage est une suppression douce',
  pg_temp.attempt($$update public.buyers set archived_at = now() where id = '117aaaaa-3333-0000-0000-000000000000'$$), '1');
select pg_temp.expect('§5 la ligne archivée existe encore',
  (select count(*)::text from public.buyers where id = '117aaaaa-3333-0000-0000-000000000000' and archived_at is not null), '1');

rollback;
