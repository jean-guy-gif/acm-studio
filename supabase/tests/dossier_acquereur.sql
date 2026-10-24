-- Mission 119 (partie B) — le lien du dossier acquéreur et « Sans photo », prouvés dans la base :
--   §1 l'agence lit ses liens (date, expiration), jamais un lien d'une autre agence, un membre
--      retiré rien ; le navigateur n'écrit ni ne retire un lien, ni ne cache une photo ;
--   §2 un condensat doit être un sha256 ; un jeton ne s'inscrit qu'une fois ; 30 jours par défaut ;
--   §3 un lien part avec sa sélection (cascade) ; « Sans photo » est faux par défaut et se pose par
--      la clé service.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/dossier_acquereur.sql

begin;

insert into auth.users (id, email) values
  ('11931111-0000-0000-0000-0000000000a1', 'ca@a119b.test'),
  ('11931111-0000-0000-0000-0000000000a2', 'ra@a119b.test'),
  ('11931111-0000-0000-0000-0000000000b1', 'cb@b119b.test');
insert into public.agencies (id, name) values
  ('119baaaa-0000-0000-0000-000000000000', 'Agence A 119B'),
  ('119bbbbb-0000-0000-0000-000000000000', 'Agence B 119B');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, removed_at) values
  ('11931111-0000-0000-0000-0000000000a1', '119baaaa-0000-0000-0000-000000000000', 'Carl', 'Conseiller', 'ca@a119b.test', 'advisor', null),
  ('11931111-0000-0000-0000-0000000000a2', '119baaaa-0000-0000-0000-000000000000', 'Rémi', 'Retiré', 'ra@a119b.test', 'advisor', now()),
  ('11931111-0000-0000-0000-0000000000b1', '119bbbbb-0000-0000-0000-000000000000', 'Boris', 'Conseiller', 'cb@b119b.test', 'advisor', null);
insert into public.buyers (id, agency_id, advisor_id, name, cities) values
  ('119baaaa-1111-0000-0000-000000000000', '119baaaa-0000-0000-0000-000000000000', '11931111-0000-0000-0000-0000000000a1', 'Famille Test', array['Mougins']);
insert into public.buyer_selections (id, agency_id, buyer_id) values
  ('119baaaa-2222-0000-0000-000000000000', '119baaaa-0000-0000-0000-000000000000', '119baaaa-1111-0000-0000-000000000000');
insert into public.buyer_selection_items (id, agency_id, selection_id, position, source, reference, label) values
  ('119baaaa-3333-0000-0000-000000000000', '119baaaa-0000-0000-0000-000000000000', '119baaaa-2222-0000-0000-000000000000', 1, 'listing', 'https://exemple.invalid/a', 'Maison · Mougins');
insert into public.buyer_dossier_links (id, agency_id, buyer_id, selection_id, created_by, token_hash) values
  ('119baaaa-4444-0000-0000-000000000000', '119baaaa-0000-0000-0000-000000000000', '119baaaa-1111-0000-0000-000000000000',
   '119baaaa-2222-0000-0000-000000000000', '11931111-0000-0000-0000-0000000000a1', repeat('a', 64));

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
select pg_temp.act_as('11931111-0000-0000-0000-0000000000a1');
select pg_temp.expect('§1 le conseiller lit le lien de son agence', (select count(*)::text from public.buyer_dossier_links), '1');
select pg_temp.expect('§1 le navigateur ne crée pas un lien',
  pg_temp.attempt($$insert into public.buyer_dossier_links (agency_id, buyer_id, selection_id, token_hash) values
    ('119baaaa-0000-0000-0000-000000000000', '119baaaa-1111-0000-0000-000000000000', '119baaaa-2222-0000-0000-000000000000', repeat('b', 64))$$), 'refus');
select pg_temp.expect('§1 ni ne le retire', pg_temp.attempt($$delete from public.buyer_dossier_links$$), 'refus');
select pg_temp.expect('§1 ni ne cache une photo',
  pg_temp.attempt($$update public.buyer_selection_items set dossier_hide_photo = true$$), 'refus');
select pg_temp.act_as('11931111-0000-0000-0000-0000000000b1');
select pg_temp.expect('§1 une autre agence ne lit rien', (select count(*)::text from public.buyer_dossier_links), '0');
select pg_temp.act_as('11931111-0000-0000-0000-0000000000a2');
select pg_temp.expect('§1 un membre retiré ne lit rien', (select count(*)::text from public.buyer_dossier_links), '0');

-- §2
select pg_temp.act_as_service();
select pg_temp.expect('§2 un condensat qui n''est pas un sha256 : refusé',
  pg_temp.attempt($$insert into public.buyer_dossier_links (agency_id, buyer_id, selection_id, token_hash) values
    ('119baaaa-0000-0000-0000-000000000000', '119baaaa-1111-0000-0000-000000000000', '119baaaa-2222-0000-0000-000000000000', 'pas-un-condensat')$$), 'contrainte');
select pg_temp.expect('§2 le même jeton deux fois : refusé',
  pg_temp.attempt($$insert into public.buyer_dossier_links (agency_id, buyer_id, selection_id, token_hash) values
    ('119baaaa-0000-0000-0000-000000000000', '119baaaa-1111-0000-0000-000000000000', '119baaaa-2222-0000-0000-000000000000', repeat('a', 64))$$), 'doublon');
select pg_temp.expect('§2 trente jours par défaut',
  (select (expires_at between now() + interval '29 days' and now() + interval '31 days')::text
   from public.buyer_dossier_links where id = '119baaaa-4444-0000-0000-000000000000'), 'true');

-- §3
select pg_temp.expect('§3 « Sans photo » est faux par défaut',
  (select dossier_hide_photo::text from public.buyer_selection_items where id = '119baaaa-3333-0000-0000-000000000000'), 'false');
select pg_temp.expect('§3 la clé service le pose',
  pg_temp.attempt($$update public.buyer_selection_items set dossier_hide_photo = true where id = '119baaaa-3333-0000-0000-000000000000'$$), '1');
delete from public.buyer_selections where id = '119baaaa-2222-0000-0000-000000000000';
select pg_temp.expect('§3 le lien part avec sa sélection', (select count(*)::text from public.buyer_dossier_links), '0');

rollback;
