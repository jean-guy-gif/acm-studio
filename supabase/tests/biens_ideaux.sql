-- Mission 118 (partie B) — la sélection de biens idéaux, prouvée dans la base :
--   §1 l'agence lit la sélection et ses biens ; une autre agence et un membre retiré, rien ;
--   §2 le navigateur n'écrit rien ;
--   §3 contraintes : 3 positions au plus, source et catégorie dans la liste, deux biens à la même
--      position refusés ;
--   §4 une sélection part avec sa fiche (cascade), ses biens avec elle.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/biens_ideaux.sql

begin;

insert into auth.users (id, email) values
  ('11821111-0000-0000-0000-0000000000a1', 'ca@a118b.test'),
  ('11821111-0000-0000-0000-0000000000a2', 'ra@a118b.test'),
  ('11821111-0000-0000-0000-0000000000b1', 'cb@b118b.test');
insert into public.agencies (id, name) values
  ('118baaaa-0000-0000-0000-000000000000', 'Agence A 118B'),
  ('118bbbbb-0000-0000-0000-000000000000', 'Agence B 118B');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, removed_at) values
  ('11821111-0000-0000-0000-0000000000a1', '118baaaa-0000-0000-0000-000000000000', 'Carl', 'Conseiller', 'ca@a118b.test', 'advisor', null),
  ('11821111-0000-0000-0000-0000000000a2', '118baaaa-0000-0000-0000-000000000000', 'Rémi', 'Retiré', 'ra@a118b.test', 'advisor', now()),
  ('11821111-0000-0000-0000-0000000000b1', '118bbbbb-0000-0000-0000-000000000000', 'Boris', 'Conseiller', 'cb@b118b.test', 'advisor', null);
insert into public.buyers (id, agency_id, advisor_id, name, cities) values
  ('118baaaa-1111-0000-0000-000000000000', '118baaaa-0000-0000-0000-000000000000',
   '11821111-0000-0000-0000-0000000000a1', 'Famille Test', array['Mougins']);
insert into public.buyer_selections (id, agency_id, buyer_id, created_by) values
  ('118baaaa-2222-0000-0000-000000000000', '118baaaa-0000-0000-0000-000000000000',
   '118baaaa-1111-0000-0000-000000000000', '11821111-0000-0000-0000-0000000000a1');
insert into public.buyer_selection_items (agency_id, selection_id, position, source, reference, label, listed_price, category, gaps) values
  ('118baaaa-0000-0000-0000-000000000000', '118baaaa-2222-0000-0000-000000000000', 1, 'project', 'p1', 'Maison · 7 pièces · Mougins', 1639500, 'agency', '{}'),
  ('118baaaa-0000-0000-0000-000000000000', '118baaaa-2222-0000-0000-000000000000', 2, 'listing', 'https://exemple.invalid/a', 'Maison · 6 pièces · Mougins', 1500000, 'compromise', array['Pas de piscine']);

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
select pg_temp.act_as('11821111-0000-0000-0000-0000000000a1');
select pg_temp.expect('§1 le conseiller lit la sélection', (select count(*)::text from public.buyer_selections), '1');
select pg_temp.expect('§1 et ses deux biens', (select count(*)::text from public.buyer_selection_items), '2');
-- §2
select pg_temp.expect('§2 le navigateur ne crée pas une sélection',
  pg_temp.attempt($$insert into public.buyer_selections (agency_id, buyer_id) values
    ('118baaaa-0000-0000-0000-000000000000', '118baaaa-1111-0000-0000-000000000000')$$), 'refus');
select pg_temp.expect('§2 ni un bien',
  pg_temp.attempt($$insert into public.buyer_selection_items (agency_id, selection_id, position, source, reference, label) values
    ('118baaaa-0000-0000-0000-000000000000', '118baaaa-2222-0000-0000-000000000000', 3, 'listing', 'x', 'y')$$), 'refus');
select pg_temp.expect('§2 ni ne supprime',
  pg_temp.attempt($$delete from public.buyer_selections$$), 'refus');
select pg_temp.act_as('11821111-0000-0000-0000-0000000000b1');
select pg_temp.expect('§1 une autre agence ne lit rien', (select count(*)::text from public.buyer_selection_items), '0');
select pg_temp.act_as('11821111-0000-0000-0000-0000000000a2');
select pg_temp.expect('§1 un membre retiré ne lit rien', (select count(*)::text from public.buyer_selections), '0');

-- §3
select pg_temp.act_as_service();
select pg_temp.expect('§3 position 4 : refusée',
  pg_temp.attempt($$insert into public.buyer_selection_items (agency_id, selection_id, position, source, reference, label) values
    ('118baaaa-0000-0000-0000-000000000000', '118baaaa-2222-0000-0000-000000000000', 4, 'listing', 'x', 'y')$$), 'contrainte');
select pg_temp.expect('§3 source hors liste : refusée',
  pg_temp.attempt($$insert into public.buyer_selection_items (agency_id, selection_id, position, source, reference, label) values
    ('118baaaa-0000-0000-0000-000000000000', '118baaaa-2222-0000-0000-000000000000', 3, 'portal', 'x', 'y')$$), 'contrainte');
select pg_temp.expect('§3 catégorie hors liste : refusée',
  pg_temp.attempt($$insert into public.buyer_selection_items (agency_id, selection_id, position, source, reference, label, category) values
    ('118baaaa-0000-0000-0000-000000000000', '118baaaa-2222-0000-0000-000000000000', 3, 'listing', 'x', 'y', 'perfect')$$), 'contrainte');
select pg_temp.expect('§3 deux biens à la même position : refusés',
  pg_temp.attempt($$insert into public.buyer_selection_items (agency_id, selection_id, position, source, reference, label) values
    ('118baaaa-0000-0000-0000-000000000000', '118baaaa-2222-0000-0000-000000000000', 1, 'listing', 'x', 'y')$$), 'doublon');
select pg_temp.expect('§3 un troisième bien : accepté',
  pg_temp.attempt($$insert into public.buyer_selection_items (agency_id, selection_id, position, source, reference, label, category) values
    ('118baaaa-0000-0000-0000-000000000000', '118baaaa-2222-0000-0000-000000000000', 3, 'competitor', 'c1', 'Maison · Valbonne', 'explore')$$), '1');

-- §4
delete from public.buyers where id = '118baaaa-1111-0000-0000-000000000000';
select pg_temp.expect('§4 la sélection part avec sa fiche', (select count(*)::text from public.buyer_selections), '0');
select pg_temp.expect('§4 et ses biens avec elle', (select count(*)::text from public.buyer_selection_items), '0');

rollback;
