-- Mission 98 — la liste « Ne plus solliciter », prouvée dans la base, vue comme la voit le
-- navigateur (rôle `authenticated`, identité du jeton).
--   §1 un conseiller ajoute une adresse à la liste de SON agence, et la relit ;
--   §2 une agence ne lit pas la liste d'une autre, et n'y écrit pas ;
--   §3 la même adresse ne s'ajoute qu'une fois par agence — deux agences ont chacune la leur ;
--   §4 personne ne modifie ni ne retire une ligne depuis le navigateur ;
--   §5 l'ajout ne choisit ni la date ni l'origine, et ne signe pas à la place d'un collègue ;
--   §6 un membre retiré ne lit plus la liste et n'y ajoute rien ;
--   §7 une clé qui n'est pas une adresse normalisée est refusée ;
--   §8 (mission 102) l'opposition suit le bien : une ligne porte la clé d'adresse OU l'identité
--      de l'annonce, jamais les deux ni aucune ; une annonce ne s'inscrit qu'une fois par agence.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/prospecting_oppositions.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

-- Agence A (conseillers C1, C2 et R, retiré), agence B (conseiller CB).
insert into auth.users (id, email) values
  ('98000000-0000-0000-0000-0000000000c1', 'c1@a98.test'),
  ('98000000-0000-0000-0000-0000000000c2', 'c2@a98.test'),
  ('98000000-0000-0000-0000-0000000000d1', 'retire@a98.test'),
  ('98000000-0000-0000-0000-0000000000b1', 'c@b98.test');
insert into public.agencies (id, name) values
  ('98aaaaaa-0000-0000-0000-000000000000', 'Agence A 98'),
  ('98bbbbbb-0000-0000-0000-000000000000', 'Agence B 98');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, removed_at) values
  ('98000000-0000-0000-0000-0000000000c1', '98aaaaaa-0000-0000-0000-000000000000', 'Carl', 'Un', 'c1@a98.test', 'advisor', null),
  ('98000000-0000-0000-0000-0000000000c2', '98aaaaaa-0000-0000-0000-000000000000', 'Cora', 'Deux', 'c2@a98.test', 'advisor', null),
  ('98000000-0000-0000-0000-0000000000d1', '98aaaaaa-0000-0000-0000-000000000000', 'Rémi', 'Retiré', 'retire@a98.test', 'advisor', now()),
  ('98000000-0000-0000-0000-0000000000b1', '98bbbbbb-0000-0000-0000-000000000000', 'Boris', 'Autre', 'c@b98.test', 'advisor', null);

-- Une ligne posée par la procédure d'effacement (hors navigateur) dans l'agence B.
insert into public.prospecting_oppositions (agency_id, address_key, source) values
  ('98bbbbbb-0000-0000-0000-000000000000', '3 rue haute 06140 vence', 'erasure');

-- Se présenter comme le navigateur d'un utilisateur : rôle `authenticated` + identité du jeton.
create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
grant execute on function pg_temp.act_as(uuid) to authenticated;

-- Refus par les PRIVILÈGES (42501, dont une politique d'insertion non satisfaite) : 'refus' ;
-- doublon : 'doublon' ; contrainte : 'invalide' ; sinon le nombre de lignes touchées.
create function pg_temp.attempt(p_sql text) returns text language plpgsql as $$
declare v_rows int;
begin
  execute p_sql;
  get diagnostics v_rows = row_count;
  return v_rows::text;
exception
  when insufficient_privilege then return 'refus';
  when unique_violation then return 'doublon';
  when check_violation then return 'invalide';
end $$;
grant execute on function pg_temp.attempt(text) to authenticated;

create function pg_temp.expect(p_label text, p_got text, p_want text) returns void
language plpgsql as $$
begin
  if p_got is distinct from p_want then
    raise exception 'FAIL % : attendu %, obtenu %', p_label, p_want, p_got;
  end if;
end $$;
grant execute on function pg_temp.expect(text, text, text) to authenticated;

create function pg_temp.visible() returns text language sql as $$
  select coalesce(string_agg(address_key, ' | ' order by address_key), '')
  from public.prospecting_oppositions
$$;
grant execute on function pg_temp.visible() to authenticated;

-- =====================================================================
-- §1 — le conseiller C1 de l'agence A.
-- =====================================================================
select pg_temp.act_as('98000000-0000-0000-0000-0000000000c1');

select pg_temp.expect('§1 ajouter une adresse à sa liste',
  pg_temp.attempt($$insert into public.prospecting_oppositions (agency_id, address_key, created_by)
                    values ('98aaaaaa-0000-0000-0000-000000000000',
                            '8 avenue du docteur hochet 06160 antibes',
                            '98000000-0000-0000-0000-0000000000c1')$$), '1');
select pg_temp.expect('§1 relire sa liste', pg_temp.visible(),
  '8 avenue du docteur hochet 06160 antibes');

-- §2 — la liste de l'agence B lui est invisible, et fermée.
select pg_temp.expect('§2 lire la liste d''une autre agence',
  (select count(*)::text from public.prospecting_oppositions
    where agency_id = '98bbbbbb-0000-0000-0000-000000000000'), '0');
select pg_temp.expect('§2 écrire dans la liste d''une autre agence',
  pg_temp.attempt($$insert into public.prospecting_oppositions (agency_id, address_key, created_by)
                    values ('98bbbbbb-0000-0000-0000-000000000000', '1 rue du port 06160 antibes',
                            '98000000-0000-0000-0000-0000000000c1')$$), 'refus');

-- §3 — une fois par agence.
select pg_temp.expect('§3 la même adresse deux fois',
  pg_temp.attempt($$insert into public.prospecting_oppositions (agency_id, address_key, created_by)
                    values ('98aaaaaa-0000-0000-0000-000000000000',
                            '8 avenue du docteur hochet 06160 antibes',
                            '98000000-0000-0000-0000-0000000000c1')$$), 'doublon');

-- §4 — ni modification, ni retrait.
select pg_temp.expect('§4 modifier une ligne',
  pg_temp.attempt($$update public.prospecting_oppositions set address_key = '1 rue du port'$$),
  'refus');
select pg_temp.expect('§4 retirer une ligne',
  pg_temp.attempt($$delete from public.prospecting_oppositions$$), 'refus');

-- §5 — ni date, ni origine, ni signature d'un collègue.
select pg_temp.expect('§5 choisir la date de la demande',
  pg_temp.attempt($$insert into public.prospecting_oppositions
                      (agency_id, address_key, created_by, requested_at)
                    values ('98aaaaaa-0000-0000-0000-000000000000', '2 rue du port 06160 antibes',
                            '98000000-0000-0000-0000-0000000000c1', '2020-01-01')$$), 'refus');
select pg_temp.expect('§5 choisir l''origine',
  pg_temp.attempt($$insert into public.prospecting_oppositions
                      (agency_id, address_key, created_by, source)
                    values ('98aaaaaa-0000-0000-0000-000000000000', '2 rue du port 06160 antibes',
                            '98000000-0000-0000-0000-0000000000c1', 'erasure')$$), 'refus');
select pg_temp.expect('§5 signer à la place d''un collègue',
  pg_temp.attempt($$insert into public.prospecting_oppositions (agency_id, address_key, created_by)
                    values ('98aaaaaa-0000-0000-0000-000000000000', '2 rue du port 06160 antibes',
                            '98000000-0000-0000-0000-0000000000c2')$$), 'refus');

-- §7 — la clé est une adresse normalisée : minuscules, chiffres, espaces simples.
select pg_temp.expect('§7 une clé non normalisée',
  pg_temp.attempt($$insert into public.prospecting_oppositions (agency_id, address_key, created_by)
                    values ('98aaaaaa-0000-0000-0000-000000000000', '8, Avenue du Dr Hochet',
                            '98000000-0000-0000-0000-0000000000c1')$$), 'invalide');

-- §8 — mission 102 : l'identité de l'annonce (portail:numéro).
select pg_temp.expect('§8 inscrire une annonce',
  pg_temp.attempt($$insert into public.prospecting_oppositions (agency_id, listing_key, created_by)
                    values ('98aaaaaa-0000-0000-0000-000000000000', 'seloger:26ZEJMLWB13Y',
                            '98000000-0000-0000-0000-0000000000c1')$$), '1');
select pg_temp.expect('§8 la même annonce deux fois',
  pg_temp.attempt($$insert into public.prospecting_oppositions (agency_id, listing_key, created_by)
                    values ('98aaaaaa-0000-0000-0000-000000000000', 'seloger:26ZEJMLWB13Y',
                            '98000000-0000-0000-0000-0000000000c1')$$), 'doublon');
select pg_temp.expect('§8 une ligne ne porte pas les deux clés',
  pg_temp.attempt($$insert into public.prospecting_oppositions
                      (agency_id, address_key, listing_key, created_by)
                    values ('98aaaaaa-0000-0000-0000-000000000000', '9 rue du port antibes',
                            'bienici:apimo-85508663', '98000000-0000-0000-0000-0000000000c1')$$),
  'invalide');
select pg_temp.expect('§8 une ligne porte au moins une clé',
  pg_temp.attempt($$insert into public.prospecting_oppositions (agency_id, created_by)
                    values ('98aaaaaa-0000-0000-0000-000000000000',
                            '98000000-0000-0000-0000-0000000000c1')$$), 'invalide');
select pg_temp.expect('§8 une annonce sans portail est refusée',
  pg_temp.attempt($$insert into public.prospecting_oppositions (agency_id, listing_key, created_by)
                    values ('98aaaaaa-0000-0000-0000-000000000000', '26ZEJMLWB13Y',
                            '98000000-0000-0000-0000-0000000000c1')$$), 'invalide');
select pg_temp.expect('§8 l''annonce d''une autre agence est refusée',
  pg_temp.attempt($$insert into public.prospecting_oppositions (agency_id, listing_key, created_by)
                    values ('98bbbbbb-0000-0000-0000-000000000000', 'seloger:26ZEJMLWB13Y',
                            '98000000-0000-0000-0000-0000000000c1')$$), 'refus');

-- =====================================================================
-- Le collègue C2 lit la même liste : elle vaut pour toute l'agence.
-- =====================================================================
select pg_temp.act_as('98000000-0000-0000-0000-0000000000c2');
select pg_temp.expect('§1 un collègue lit la liste de l''agence', pg_temp.visible(),
  '8 avenue du docteur hochet 06160 antibes');

-- =====================================================================
-- §2 et §3 — le conseiller CB de l'agence B : sa liste, et elle seule.
-- =====================================================================
select pg_temp.act_as('98000000-0000-0000-0000-0000000000b1');
select pg_temp.expect('§2 B ne lit pas la liste de A', pg_temp.visible(),
  '3 rue haute 06140 vence');
select pg_temp.expect('§3 la même adresse, dans une autre agence',
  pg_temp.attempt($$insert into public.prospecting_oppositions (agency_id, address_key, created_by)
                    values ('98bbbbbb-0000-0000-0000-000000000000',
                            '8 avenue du docteur hochet 06160 antibes',
                            '98000000-0000-0000-0000-0000000000b1')$$), '1');

-- =====================================================================
-- §6 — le membre retiré de l'agence A.
-- =====================================================================
select pg_temp.act_as('98000000-0000-0000-0000-0000000000d1');
select pg_temp.expect('§6 un membre retiré ne lit plus la liste', pg_temp.visible(), '');
select pg_temp.expect('§6 un membre retiré n''ajoute rien',
  pg_temp.attempt($$insert into public.prospecting_oppositions (agency_id, address_key, created_by)
                    values ('98aaaaaa-0000-0000-0000-000000000000', '5 rue du port 06160 antibes',
                            '98000000-0000-0000-0000-0000000000d1')$$), 'refus');

reset role;
rollback;
