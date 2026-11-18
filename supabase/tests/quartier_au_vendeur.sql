-- Mission 159 — l'instantané du quartier montré au vendeur, prouvé dans la base : écrit par le
-- serveur seul, les seules clés des six blocs (jamais la valeur indicative ni le DPE), l'heure posée
-- par la base, jamais modifié (clé de service comprise), refusé une fois le Live commencé ou sur un
-- dossier conclu ou archivé, rouvert par la réouverture d'un Live, lu par l'agence seule, parti avec
-- son dossier.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/quartier_au_vendeur.sql

begin;

insert into auth.users (id, email) values
  ('15911111-0000-0000-0000-0000000000a1', 'ca@a159.test'),
  ('15911111-0000-0000-0000-0000000000a2', 'ra@a159.test'),
  ('15911111-0000-0000-0000-0000000000a3', 'ma@a159.test'),
  ('15911111-0000-0000-0000-0000000000b1', 'cb@b159.test');
insert into public.agencies (id, name) values
  ('159aaaaa-0000-0000-0000-000000000000', 'Agence A 159'),
  ('159bbbbb-0000-0000-0000-000000000000', 'Agence B 159');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, removed_at) values
  ('15911111-0000-0000-0000-0000000000a1', '159aaaaa-0000-0000-0000-000000000000', 'Carl', 'Conseiller', 'ca@a159.test', 'advisor', null),
  ('15911111-0000-0000-0000-0000000000a2', '159aaaaa-0000-0000-0000-000000000000', 'Rémi', 'Retiré', 'ra@a159.test', 'advisor', now()),
  ('15911111-0000-0000-0000-0000000000a3', '159aaaaa-0000-0000-0000-000000000000', 'Mia', 'Manager', 'ma@a159.test', 'manager', null),
  ('15911111-0000-0000-0000-0000000000b1', '159bbbbb-0000-0000-0000-000000000000', 'Boris', 'Conseiller', 'cb@b159.test', 'advisor', null);
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('159aaaaa-1111-0000-0000-000000000000', '159aaaaa-0000-0000-0000-000000000000', '15911111-0000-0000-0000-0000000000a1', 'Vendeur A', 'draft'),
  ('159bbbbb-1111-0000-0000-000000000000', '159bbbbb-0000-0000-0000-000000000000', '15911111-0000-0000-0000-0000000000b1', 'Vendeur B', 'draft');

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



insert into public.comparables (id, agency_id, project_id, title, price, is_selected, display_order) values
  ('159aaaaa-2222-0000-0000-000000000001', '159aaaaa-0000-0000-0000-000000000000',
   '159aaaaa-1111-0000-0000-000000000000', 'un', 300000, true, 1);

-- Une écriture d'instantané, dans le rôle courant : rend le nombre de lignes, « refus » ou « contrainte ».
create function pg_temp.snap(p_project text, p_agency text, p_blocks text, p_author text) returns text
language plpgsql as $$
begin
  return pg_temp.attempt(format(
    'insert into public.project_neighbourhood_snapshots '
    '(project_id, agency_id, blocks, property_address, property_type, property_rooms, property_surface, computed_on, created_by) '
    'values (%L, %L, %L::jsonb, %L, %L, 5, 135, %L, %L)',
    p_project, p_agency, p_blocks, '4 chemin des Restanques Hautes, 06140 Vence', 'maison', '2026-11-17', p_author));
end $$;
grant execute on function pg_temp.snap(text, text, text, text) to authenticated, anon;

-- ─── 1. Le serveur écrit les seuls blocs cochés ───────────────────────────────────────────────────
select pg_temp.act_as_service();
select pg_temp.expect('serveur : un instantané de deux blocs',
  pg_temp.snap('159aaaaa-1111-0000-0000-000000000000', '159aaaaa-0000-0000-0000-000000000000',
    '{"risques":{"argiles":"moyen"},"ventes":{"liste":[]}}', '15911111-0000-0000-0000-0000000000a3'), '1');
select pg_temp.expect('serveur : rien de coché, un objet vide',
  pg_temp.snap('159aaaaa-1111-0000-0000-000000000000', '159aaaaa-0000-0000-0000-000000000000',
    '{}', '15911111-0000-0000-0000-0000000000a1'), '1');
select pg_temp.expect('serveur : la valeur indicative refusée',
  pg_temp.snap('159aaaaa-1111-0000-0000-000000000000', '159aaaaa-0000-0000-0000-000000000000',
    '{"ventes":{},"estimation":{"milieu":980000}}', null), 'contrainte');
select pg_temp.expect('serveur : le DPE refusé',
  pg_temp.snap('159aaaaa-1111-0000-0000-000000000000', '159aaaaa-0000-0000-0000-000000000000',
    '{"dpe":{"etiquette":"E"}}', null), 'contrainte');
select pg_temp.expect('serveur : la valeur indicative glissée dans un bloc refusée',
  pg_temp.snap('159aaaaa-1111-0000-0000-000000000000', '159aaaaa-0000-0000-0000-000000000000',
    '{"ventes":{"liste":[{"estimation":{"milieu":980000}}]}}', null), 'contrainte');
select pg_temp.expect('serveur : le DPE glissé dans un bloc refusé',
  pg_temp.snap('159aaaaa-1111-0000-0000-000000000000', '159aaaaa-0000-0000-0000-000000000000',
    '{"risques":{"dpe":"E"}}', null), 'contrainte');
select pg_temp.expect('serveur : un tableau refusé',
  pg_temp.snap('159aaaaa-1111-0000-0000-000000000000', '159aaaaa-0000-0000-0000-000000000000',
    '[]', null), 'contrainte');
select pg_temp.expect('serveur : un type de bien hors liste refusé',
  pg_temp.attempt($q$insert into public.project_neighbourhood_snapshots
    (project_id, agency_id, blocks, property_address, property_type, property_rooms, property_surface)
    values ('159aaaaa-1111-0000-0000-000000000000', '159aaaaa-0000-0000-0000-000000000000', '{}',
            '4 chemin des Restanques Hautes, 06140 Vence', 'terrain', 5, 135)$q$), 'contrainte');
select pg_temp.expect('serveur : le dossier d''une autre agence refusé',
  pg_temp.snap('159bbbbb-1111-0000-0000-000000000000', '159aaaaa-0000-0000-0000-000000000000',
    '{}', null), 'contrainte');
select pg_temp.expect('serveur : un auteur d''une autre agence refusé',
  pg_temp.snap('159aaaaa-1111-0000-0000-000000000000', '159aaaaa-0000-0000-0000-000000000000',
    '{}', '15911111-0000-0000-0000-0000000000b1'), 'contrainte');
select pg_temp.expect('serveur : l''heure choisie par l''appelant est remplacée par celle de la base',
  pg_temp.attempt($q$insert into public.project_neighbourhood_snapshots
    (project_id, agency_id, blocks, property_address, property_type, property_rooms, property_surface, taken_at, created_at)
    values ('159aaaaa-1111-0000-0000-000000000000', '159aaaaa-0000-0000-0000-000000000000', '{}',
            '4 chemin des Restanques Hautes, 06140 Vence', 'appartement', 3, 70, '2020-01-01', '2020-01-01')$q$), '1');
reset role;
select pg_temp.expect('l''heure posée par la base',
  (select count(*)::text from public.project_neighbourhood_snapshots
    where taken_at < now() - interval '1 minute' or created_at < now() - interval '1 minute'), '0');
select pg_temp.expect('trois instantanés écrits',
  (select count(*)::text from public.project_neighbourhood_snapshots), '3');

-- ─── 2. Un instantané ne se modifie jamais ────────────────────────────────────────────────────────
select pg_temp.act_as_service();
select pg_temp.expect('serveur : modifier refusé',
  pg_temp.attempt($q$update public.project_neighbourhood_snapshots set blocks = '{}'$q$), 'refus');
reset role;
select pg_temp.expect('postgres : modifier refusé',
  pg_temp.attempt($q$update public.project_neighbourhood_snapshots set computed_on = null$q$), 'refus');
select pg_temp.expect('vider l''auteur à la main en changeant autre chose : refusé',
  pg_temp.attempt($q$update public.project_neighbourhood_snapshots set created_by = null, blocks = '{}'
    where created_by is not null$q$), 'refus');

-- ─── 3. Le navigateur lit son agence, n'écrit rien ────────────────────────────────────────────────
select pg_temp.act_as('15911111-0000-0000-0000-0000000000a1');
select pg_temp.expect('conseiller : lit les instantanés de son agence',
  (select count(*)::text from public.project_neighbourhood_snapshots), '3');
select pg_temp.expect('conseiller : écrire refusé',
  pg_temp.snap('159aaaaa-1111-0000-0000-000000000000', '159aaaaa-0000-0000-0000-000000000000',
    '{}', '15911111-0000-0000-0000-0000000000a1'), 'refus');
select pg_temp.expect('conseiller : modifier refusé',
  pg_temp.attempt($q$update public.project_neighbourhood_snapshots set blocks = '{}'$q$), 'refus');
select pg_temp.expect('conseiller : supprimer refusé',
  pg_temp.attempt($q$delete from public.project_neighbourhood_snapshots$q$), 'refus');
reset role;
select pg_temp.act_as('15911111-0000-0000-0000-0000000000a2');
select pg_temp.expect('membre retiré : ne lit rien',
  (select count(*)::text from public.project_neighbourhood_snapshots), '0');
reset role;
select pg_temp.act_as('15911111-0000-0000-0000-0000000000b1');
select pg_temp.expect('autre agence : ne lit rien',
  (select count(*)::text from public.project_neighbourhood_snapshots), '0');
reset role;
select pg_temp.expect('anonyme : aucun droit de lecture',
  has_table_privilege('anon', 'public.project_neighbourhood_snapshots', 'select')::text, 'false');
select pg_temp.expect('navigateur : aucun droit d''écriture',
  (has_table_privilege('authenticated', 'public.project_neighbourhood_snapshots', 'insert')
   or has_table_privilege('authenticated', 'public.project_neighbourhood_snapshots', 'update')
   or has_table_privilege('authenticated', 'public.project_neighbourhood_snapshots', 'delete'))::text, 'false');
select pg_temp.expect('fonctions des déclencheurs fermées au navigateur',
  (has_function_privilege('authenticated', 'public.check_project_neighbourhood_snapshot()', 'execute')
   or has_function_privilege('authenticated', 'public.refuse_project_neighbourhood_snapshot_update()', 'execute'))::text,
  'false');

-- ─── 4. Ce qui a été montré reste ─────────────────────────────────────────────────────────────────
update public.projects set live_started_at = now() where id = '159aaaaa-1111-0000-0000-000000000000';
select pg_temp.act_as_service();
select pg_temp.expect('Live commencé (heure de début) : nouveau choix refusé',
  pg_temp.snap('159aaaaa-1111-0000-0000-000000000000', '159aaaaa-0000-0000-0000-000000000000',
    '{}', null), 'refus');
reset role;
-- Le premier écran relève aussi l'heure de début (M95) ; elle ne se vide que par la réouverture.
insert into public.live_seller_responses (agency_id, project_id, comparable_id, seller_serious_competitor) values
  ('159aaaaa-0000-0000-0000-000000000000', '159aaaaa-1111-0000-0000-000000000000',
   '159aaaaa-2222-0000-0000-000000000001', 'yes');
select pg_temp.act_as_service();
select pg_temp.expect('Live commencé (une réponse du vendeur) : nouveau choix refusé',
  pg_temp.snap('159aaaaa-1111-0000-0000-000000000000', '159aaaaa-0000-0000-0000-000000000000',
    '{}', null), 'refus');
-- La réouverture d'un Live par un opérateur (M104) efface ses réponses et son heure de début :
-- le choix se rouvre.
select public.reopen_live('159aaaaa-1111-0000-0000-000000000000', '15911111-0000-0000-0000-0000000000a1',
  'op@a159.test', 'Live lancé par erreur');
reset role;
select pg_temp.act_as_service();
select pg_temp.expect('Live rouvert : un nouveau choix accepté',
  pg_temp.snap('159aaaaa-1111-0000-0000-000000000000', '159aaaaa-0000-0000-0000-000000000000',
    '{"population":{}}', null), '1');
reset role;
update public.projects set status = 'archived' where id = '159aaaaa-1111-0000-0000-000000000000';
select pg_temp.act_as_service();
select pg_temp.expect('dossier archivé : nouveau choix refusé',
  pg_temp.snap('159aaaaa-1111-0000-0000-000000000000', '159aaaaa-0000-0000-0000-000000000000',
    '{}', null), 'refus');
reset role;
update public.projects set status = 'meeting_completed' where id = '159aaaaa-1111-0000-0000-000000000000';
select pg_temp.act_as_service();
select pg_temp.expect('dossier conclu : nouveau choix refusé',
  pg_temp.snap('159aaaaa-1111-0000-0000-000000000000', '159aaaaa-0000-0000-0000-000000000000',
    '{}', null), 'refus');
reset role;

-- ─── 5. Un compte auteur se supprime ; l'instantané garde ses blocs ──────────────────────────────
delete from public.profiles where id = '15911111-0000-0000-0000-0000000000a3';
select pg_temp.expect('auteur supprimé : son instantané reste, sans auteur, ses blocs intacts',
  (select count(*)::text from public.project_neighbourhood_snapshots
    where created_by is null and blocks ? 'risques' and blocks ? 'ventes'), '1');

-- ─── 6. L'instantané part avec son dossier ────────────────────────────────────────────────────────
delete from public.comparables where project_id = '159aaaaa-1111-0000-0000-000000000000';
delete from public.projects where id = '159aaaaa-1111-0000-0000-000000000000';
select pg_temp.expect('dossier supprimé : ses instantanés partent avec lui',
  (select count(*)::text from public.project_neighbourhood_snapshots), '0');

rollback;
