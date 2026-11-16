-- Mission 157 — le dossier Academia du bien vendeur et son lien « Vivre ici » créé par l'API,
-- prouvés dans la base :
--   §1 l'agence lit l'état, le lien et son expiration, jamais l'adresse envoyée ni l'identifiant
--      Academia ; une autre agence, un membre retiré et un visiteur non connecté, rien ; le
--      navigateur n'écrit, ne modifie ni ne supprime rien ;
--   §2 la clé de service écrit : un dossier Academia par dossier vendeur, de cette agence ; un
--      identifiant de forme fermée ; un état de la liste ; seulement un lien d'Academia, toujours
--      avec son expiration ; un auteur de l'agence ; l'heure de la demande posée par la base,
--      renouvelée avec un nouveau dossier ; le dossier et l'agence ne changent pas ;
--   §3 il part avec son dossier vendeur ; l'auteur supprimé le laisse.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/vivre_ici_un_clic.sql

begin;

insert into auth.users (id, email) values
  ('15711111-0000-0000-0000-0000000000a1', 'ca@a157.test'),
  ('15711111-0000-0000-0000-0000000000a2', 'ra@a157.test'),
  ('15711111-0000-0000-0000-0000000000a3', 'aa@a157.test'),
  ('15711111-0000-0000-0000-0000000000b1', 'cb@b157.test');
insert into public.agencies (id, name) values
  ('157aaaaa-0000-0000-0000-000000000000', 'Agence A 157'),
  ('157bbbbb-0000-0000-0000-000000000000', 'Agence B 157');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, removed_at) values
  ('15711111-0000-0000-0000-0000000000a1', '157aaaaa-0000-0000-0000-000000000000', 'Carl', 'Conseiller', 'ca@a157.test', 'advisor', null),
  ('15711111-0000-0000-0000-0000000000a2', '157aaaaa-0000-0000-0000-000000000000', 'Rémi', 'Retiré', 'ra@a157.test', 'advisor', now()),
  ('15711111-0000-0000-0000-0000000000a3', '157aaaaa-0000-0000-0000-000000000000', 'Annie', 'Auteure', 'aa@a157.test', 'advisor', null),
  ('15711111-0000-0000-0000-0000000000b1', '157bbbbb-0000-0000-0000-000000000000', 'Boris', 'Conseiller', 'cb@b157.test', 'advisor', null);
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('157aaaaa-1111-0000-0000-000000000000', '157aaaaa-0000-0000-0000-000000000000', '15711111-0000-0000-0000-0000000000a1', 'Vendeur A', 'draft'),
  ('157aaaaa-1111-0000-0000-000000000002', '157aaaaa-0000-0000-0000-000000000000', '15711111-0000-0000-0000-0000000000a1', 'Vendeur A bis', 'draft'),
  ('157bbbbb-1111-0000-0000-000000000000', '157bbbbb-0000-0000-0000-000000000000', '15711111-0000-0000-0000-0000000000b1', 'Vendeur B', 'draft');

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

-- §2 — la clé de service écrit.
select pg_temp.act_as_service();
select pg_temp.expect('§2 le dossier Academia du bien vendeur s''écrit, en préparation',
  pg_temp.attempt($q$insert into public.project_academia_dossiers (agency_id, project_id, academia_dossier_id, state, property_address, address_sent, requested_by, requested_at)
    values ('157aaaaa-0000-0000-0000-000000000000', '157aaaaa-1111-0000-0000-000000000000', 'dos_8f2c1a9e', 'en_cours', '4 chemin des Restanques Hautes, 06140 Vence', '4 chemin des Restanques Hautes, 06140 Vence', '15711111-0000-0000-0000-0000000000a3', now() - interval '3 days')$q$), '1');
select pg_temp.expect('§2 l''heure de la demande est celle de la base',
  (select (requested_at = now())::text from public.project_academia_dossiers where project_id = '157aaaaa-1111-0000-0000-000000000000'), 'true');
select pg_temp.expect('§2 un dossier Academia par dossier vendeur',
  pg_temp.attempt($q$insert into public.project_academia_dossiers (agency_id, project_id, academia_dossier_id, state, property_address, address_sent)
    values ('157aaaaa-0000-0000-0000-000000000000', '157aaaaa-1111-0000-0000-000000000000', 'dos_autre', 'en_cours', '4 chemin des Restanques Hautes, 06140 Vence', '4 chemin des Restanques Hautes, 06140 Vence')$q$), 'doublon');
select pg_temp.expect('§2 le dossier vendeur d''une autre agence : refusé',
  pg_temp.attempt($q$insert into public.project_academia_dossiers (agency_id, project_id, academia_dossier_id, state, property_address, address_sent)
    values ('157aaaaa-0000-0000-0000-000000000000', '157bbbbb-1111-0000-0000-000000000000', 'dos_x', 'en_cours', '1 rue de B, 06000 Nice', '1 rue de B, 06000 Nice')$q$), 'contrainte');
select pg_temp.expect('§2 un identifiant Academia de forme inconnue : refusé',
  pg_temp.attempt($q$insert into public.project_academia_dossiers (agency_id, project_id, academia_dossier_id, state, property_address, address_sent)
    values ('157aaaaa-0000-0000-0000-000000000000', '157aaaaa-1111-0000-0000-000000000002', 'dos/../x', 'en_cours', '2 rue de A, 06140 Vence', '2 rue de A, 06140 Vence')$q$), 'contrainte');
select pg_temp.expect('§2 un état hors liste : refusé',
  pg_temp.attempt($q$insert into public.project_academia_dossiers (agency_id, project_id, academia_dossier_id, state, property_address, address_sent)
    values ('157aaaaa-0000-0000-0000-000000000000', '157aaaaa-1111-0000-0000-000000000002', 'dos_y', 'reutilise', '2 rue de A, 06140 Vence', '2 rue de A, 06140 Vence')$q$), 'contrainte');
select pg_temp.expect('§2 un auteur d''une autre agence : refusé',
  pg_temp.attempt($q$insert into public.project_academia_dossiers (agency_id, project_id, academia_dossier_id, state, property_address, address_sent, requested_by)
    values ('157aaaaa-0000-0000-0000-000000000000', '157aaaaa-1111-0000-0000-000000000002', 'dos_y', 'en_cours', '2 rue de A, 06140 Vence', '2 rue de A, 06140 Vence', '15711111-0000-0000-0000-0000000000b1')$q$), 'contrainte');
select pg_temp.expect('§2 un lien sans son expiration : refusé',
  pg_temp.attempt($q$update public.project_academia_dossiers set state = 'pret', link_url = 'https://app.myacademia.ai/l/Vb4nT8wLp2'
    where project_id = '157aaaaa-1111-0000-0000-000000000000'$q$), 'contrainte');
select pg_temp.expect('§2 un lien qui n''est pas d''Academia : refusé',
  pg_temp.attempt($q$update public.project_academia_dossiers set state = 'pret', link_url = 'https://exemple.fr/l/x', link_expires_at = now() + interval '30 days'
    where project_id = '157aaaaa-1111-0000-0000-000000000000'$q$), 'contrainte');
select pg_temp.expect('§2 une adresse du bien trop courte : refusée',
  pg_temp.attempt($q$insert into public.project_academia_dossiers (agency_id, project_id, academia_dossier_id, state, property_address, address_sent)
    values ('157aaaaa-0000-0000-0000-000000000000', '157aaaaa-1111-0000-0000-000000000002', 'dos_w', 'en_cours', 'x', '2 rue de A, 06140 Vence')$q$), 'contrainte');
-- La demande vieillie de 2 jours (déclencheur coupé) : `now()` est figé dans la transaction.
reset role;
alter table public.project_academia_dossiers disable trigger project_academia_dossiers_check;
update public.project_academia_dossiers set requested_at = now() - interval '2 days'
  where project_id = '157aaaaa-1111-0000-0000-000000000000';
alter table public.project_academia_dossiers enable trigger project_academia_dossiers_check;
select pg_temp.act_as_service();
select pg_temp.expect('§2 le dossier prêt, le lien et son expiration (une heure de demande envoyée)',
  pg_temp.attempt($q$update public.project_academia_dossiers set state = 'pret', link_url = 'https://app.myacademia.ai/l/Vb4nT8wLp2', link_expires_at = now() + interval '30 days', requested_at = now()
    where project_id = '157aaaaa-1111-0000-0000-000000000000'$q$), '1');
select pg_temp.expect('§2 … l''heure de la demande ne bouge pas avec le même dossier',
  (select (requested_at = now() - interval '2 days')::text from public.project_academia_dossiers where project_id = '157aaaaa-1111-0000-0000-000000000000'), 'true');
select pg_temp.expect('§2 le dossier vendeur d''un dossier Academia ne change pas',
  pg_temp.attempt($q$update public.project_academia_dossiers set project_id = '157aaaaa-1111-0000-0000-000000000002'
    where project_id = '157aaaaa-1111-0000-0000-000000000000'$q$), 'contrainte');
select pg_temp.expect('§2 la fonction du déclencheur est fermée au navigateur',
  has_function_privilege('authenticated', 'public.check_project_academia_dossier()', 'execute')::text, 'false');
select pg_temp.expect('§2 un dossier dans l''autre agence, pour §1',
  pg_temp.attempt($q$insert into public.project_academia_dossiers (agency_id, project_id, academia_dossier_id, state, property_address, address_sent)
    values ('157bbbbb-0000-0000-0000-000000000000', '157bbbbb-1111-0000-0000-000000000000', 'dos_b', 'en_cours', '1 rue de B, 06000 Nice', '1 rue de B, 06000 Nice')$q$), '1');

-- §1 — lectures et écritures du navigateur.
select pg_temp.act_as('15711111-0000-0000-0000-0000000000a1');
select pg_temp.expect('§1 le conseiller lit l''état et le lien du dossier Academia de son agence',
  (select string_agg(state || ' ' || link_url, ',') from public.project_academia_dossiers), 'pret https://app.myacademia.ai/l/Vb4nT8wLp2');
select pg_temp.expect('§1 … jamais l''identifiant du dossier chez Academia',
  pg_temp.attempt($q$select academia_dossier_id from public.project_academia_dossiers$q$), 'refus');
select pg_temp.expect('§1 … l''adresse du bien, la sienne, se lit',
  (select property_address from public.project_academia_dossiers), '4 chemin des Restanques Hautes, 06140 Vence');
select pg_temp.expect('§1 … ni l''adresse envoyée',
  pg_temp.attempt($q$select address_sent from public.project_academia_dossiers$q$), 'refus');
select pg_temp.expect('§1 le navigateur n''écrit pas de dossier Academia',
  pg_temp.attempt($q$insert into public.project_academia_dossiers (agency_id, project_id, academia_dossier_id, state, property_address, address_sent)
    values ('157aaaaa-0000-0000-0000-000000000000', '157aaaaa-1111-0000-0000-000000000002', 'dos_z', 'en_cours', '2 rue de A, 06140 Vence', '2 rue de A, 06140 Vence')$q$), 'refus');
select pg_temp.expect('§1 ni n''en modifie (ni l''identifiant, ni le lien)',
  pg_temp.attempt($q$update public.project_academia_dossiers set academia_dossier_id = 'dos_b'$q$), 'refus');
select pg_temp.expect('§1 ni n''en supprime',
  pg_temp.attempt($q$delete from public.project_academia_dossiers$q$), 'refus');
select pg_temp.act_as('15711111-0000-0000-0000-0000000000a2');
select pg_temp.expect('§1 un membre retiré ne lit rien',
  (select count(*)::text from public.project_academia_dossiers), '0');
select pg_temp.act_as_anon();
select pg_temp.expect('§1 un visiteur non connecté ne lit rien',
  pg_temp.attempt($q$select 1 from public.project_academia_dossiers$q$), 'refus');

-- §2 — un nouveau dossier (l'adresse du bien a changé) : l'heure de la demande repart.
reset role;
alter table public.project_academia_dossiers disable trigger project_academia_dossiers_check;
update public.project_academia_dossiers set requested_at = now() - interval '5 days'
  where project_id = '157aaaaa-1111-0000-0000-000000000000';
alter table public.project_academia_dossiers enable trigger project_academia_dossiers_check;
select pg_temp.act_as_service();
select pg_temp.expect('§2 un nouveau dossier Academia',
  pg_temp.attempt($q$update public.project_academia_dossiers set academia_dossier_id = 'dos_neuf', state = 'en_cours', link_url = null, link_expires_at = null, property_address = '6 chemin des Restanques Hautes, 06140 Vence', address_sent = '6 chemin des Restanques Hautes, 06140 Vence'
    where project_id = '157aaaaa-1111-0000-0000-000000000000'$q$), '1');
select pg_temp.expect('§2 … l''heure de la demande repart du jour',
  (select (requested_at = now())::text from public.project_academia_dossiers where project_id = '157aaaaa-1111-0000-0000-000000000000'), 'true');

-- §3 — l'auteur supprimé le laisse ; il part avec son dossier vendeur.
reset role;
delete from public.profiles where id = '15711111-0000-0000-0000-0000000000a3';
select pg_temp.expect('§3 l''auteur supprimé laisse le dossier Academia, sans auteur',
  (select (requested_by is null)::text from public.project_academia_dossiers where project_id = '157aaaaa-1111-0000-0000-000000000000'), 'true');
delete from public.projects where id = '157aaaaa-1111-0000-0000-000000000000';
select pg_temp.expect('§3 il part avec son dossier vendeur',
  (select count(*)::text from public.project_academia_dossiers where project_id = '157aaaaa-1111-0000-0000-000000000000'), '0');

rollback;
