-- Mission 110, partie C — les experts, à la SOURCE DE VÉRITÉ :
--   • une recherche nommée ne garde jamais un prix, des pièces ni une surface ;
--   • chacun ne lit que SES recherches, dans son agence ; un membre retiré, plus rien ; le
--     navigateur ne les écrit pas ;
--   • le mode expert n'est pas modifiable par le navigateur (M88) ;
--   • l'ordre des concurrents se réordonne d'un coup, par la liste exacte des retenus, et ne bouge
--     plus une fois le Live commencé — ni par la fonction, ni par une écriture directe ;
--   • ce verrou ne bloque aucune suppression (leçon de la migration 20261028) : un concurrent, un
--     dossier (effacement A), l'effacement B, un compte, et le nettoyage de l'agence de test.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/les_experts.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values
  ('11011111-1111-1111-1111-111111111111'),
  ('11022222-2222-2222-2222-222222222222'),
  ('11033333-3333-3333-3333-333333333333'),
  ('11044444-4444-4444-4444-444444444444');
insert into public.agencies (id, name) values
  ('110aaaaa-0000-0000-0000-000000000000', 'A110'),
  ('110bbbbb-0000-0000-0000-000000000000', 'B110');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, removed_at) values
  ('11011111-1111-1111-1111-111111111111', '110aaaaa-0000-0000-0000-000000000000', 'Ex', 'Pert', 'a110@t.l', 'advisor', null),
  ('11022222-2222-2222-2222-222222222222', '110aaaaa-0000-0000-0000-000000000000', 'Col', 'Lègue', 'c110@t.l', 'advisor', null),
  ('11033333-3333-3333-3333-333333333333', '110bbbbb-0000-0000-0000-000000000000', 'Au', 'Tre', 'b110@t.l', 'advisor', null),
  ('11044444-4444-4444-4444-444444444444', '110aaaaa-0000-0000-0000-000000000000', 'Re', 'Tiré', 'r110@t.l', 'advisor', now());
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('110ccccc-0000-0000-0000-00000000000a', '110aaaaa-0000-0000-0000-000000000000',
   '11011111-1111-1111-1111-111111111111', 'dossier A', 'ready_for_meeting');
insert into public.comparables (id, agency_id, project_id, title, price, is_selected, display_order) values
  ('110dddd0-0000-0000-0000-000000000001', '110aaaaa-0000-0000-0000-000000000000',
   '110ccccc-0000-0000-0000-00000000000a', 'un', 300000, true, 1),
  ('110dddd0-0000-0000-0000-000000000002', '110aaaaa-0000-0000-0000-000000000000',
   '110ccccc-0000-0000-0000-00000000000a', 'écarté', 310000, false, 2),
  ('110dddd0-0000-0000-0000-000000000003', '110aaaaa-0000-0000-0000-000000000000',
   '110ccccc-0000-0000-0000-00000000000a', 'trois', 320000, true, 3),
  ('110dddd0-0000-0000-0000-000000000004', '110aaaaa-0000-0000-0000-000000000000',
   '110ccccc-0000-0000-0000-00000000000a', 'quatre', 330000, true, 4);

create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}', p_uid), true);
  execute 'set local role authenticated';
end $$;
grant execute on function pg_temp.act_as(uuid) to authenticated;

-- 1. Jamais un prix, des pièces ni une surface dans une recherche nommée.
do $$
declare v_key text;
begin
  foreach v_key in array array['price', 'rooms', 'surface'] loop
    begin
      insert into public.saved_searches (agency_id, owner_id, name, settings) values
        ('110aaaaa-0000-0000-0000-000000000000', '11011111-1111-1111-1111-111111111111',
         'piège ' || v_key, jsonb_build_object('autoWiden', true, v_key, '{"min":1,"max":2}'::jsonb));
      raise exception 'FAIL 1: une recherche nommée a gardé %', v_key;
    exception when check_violation then null;
    end;
  end loop;
end $$;

insert into public.saved_searches (agency_id, owner_id, name, settings) values
  ('110aaaaa-0000-0000-0000-000000000000', '11011111-1111-1111-1111-111111111111', 'Villas Vence',
   '{"sector":{"kind":"radius","km":5},"autoWiden":false,"filters":{"dpe":null,"minFloor":null,"outdoor":null,"minLand":1000,"pool":true}}'),
  ('110aaaaa-0000-0000-0000-000000000000', '11044444-4444-4444-4444-444444444444', 'du retiré',
   '{"sector":null,"autoWiden":true}'),
  ('110bbbbb-0000-0000-0000-000000000000', '11033333-3333-3333-3333-333333333333', 'autre agence',
   '{"sector":null,"autoWiden":true}');

-- Un même nom, à la casse près, ne s'enregistre qu'une fois par conseiller.
do $$
begin
  insert into public.saved_searches (agency_id, owner_id, name, settings) values
    ('110aaaaa-0000-0000-0000-000000000000', '11011111-1111-1111-1111-111111111111',
     'villas vence ', '{"sector":null,"autoWiden":true}');
  raise exception 'FAIL 1b: deux recherches du même nom';
exception when unique_violation then null;
end $$;

-- 2. Chacun ne lit que les siennes, dans son agence ; un membre retiré, plus rien.
select pg_temp.act_as('11011111-1111-1111-1111-111111111111');
do $$
begin
  if (select count(*) from public.saved_searches) <> 1 then
    raise exception 'FAIL 2: le conseiller lit d''autres recherches que les siennes';
  end if;
end $$;
reset role;

select pg_temp.act_as('11022222-2222-2222-2222-222222222222');
do $$
begin
  if (select count(*) from public.saved_searches) <> 0 then
    raise exception 'FAIL 2b: un collègue lit les recherches d''un autre';
  end if;
end $$;
reset role;

select pg_temp.act_as('11044444-4444-4444-4444-444444444444');
do $$
begin
  if (select count(*) from public.saved_searches) <> 0 then
    raise exception 'FAIL 2c: un membre retiré lit encore ses recherches';
  end if;
end $$;
reset role;

-- 3. Le navigateur n'écrit ni ne retire une recherche.
select pg_temp.act_as('11011111-1111-1111-1111-111111111111');
do $$
begin
  begin
    insert into public.saved_searches (agency_id, owner_id, name, settings) values
      ('110aaaaa-0000-0000-0000-000000000000', '11011111-1111-1111-1111-111111111111',
       'du navigateur', '{"sector":null,"autoWiden":true}');
    raise exception 'FAIL 3: le navigateur a écrit une recherche';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.saved_searches;
    raise exception 'FAIL 3b: le navigateur a retiré une recherche';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- 4. Le mode expert ne se modifie pas depuis le navigateur (liste des colonnes, M88).
select pg_temp.act_as('11011111-1111-1111-1111-111111111111');
do $$
begin
  begin
    update public.profiles set expert_mode = true where id = '11011111-1111-1111-1111-111111111111';
  exception when insufficient_privilege or check_violation or raise_exception then null;
  end;
end $$;
reset role;
do $$
begin
  if (select expert_mode from public.profiles where id = '11011111-1111-1111-1111-111111111111') then
    raise exception 'FAIL 4: le navigateur a allumé le mode expert';
  end if;
end $$;

-- 5. Réordonner : la liste exacte des retenus, d'un coup ; les écartés ne bougent pas.
select pg_temp.act_as('11011111-1111-1111-1111-111111111111');
select public.reorder_retained_comparables('110ccccc-0000-0000-0000-00000000000a',
  array['110dddd0-0000-0000-0000-000000000004', '110dddd0-0000-0000-0000-000000000001',
        '110dddd0-0000-0000-0000-000000000003']::uuid[]);
do $$
begin
  begin
    perform public.reorder_retained_comparables('110ccccc-0000-0000-0000-00000000000a',
      array['110dddd0-0000-0000-0000-000000000004', '110dddd0-0000-0000-0000-000000000001']::uuid[]);
    raise exception 'FAIL 5: une liste incomplète a été acceptée';
  exception when raise_exception then
    if sqlerrm not like '%not_the_retained_list%' then raise; end if;
  end;
end $$;
reset role;
do $$
begin
  if (select array_agg(title order by display_order) from public.comparables
      where project_id = '110ccccc-0000-0000-0000-00000000000a') <> array['quatre', 'écarté', 'un', 'trois'] then
    raise exception 'FAIL 5b: ordre inattendu : %', (select array_agg(title order by display_order)
      from public.comparables where project_id = '110ccccc-0000-0000-0000-00000000000a');
  end if;
end $$;

-- Une autre agence ne réordonne rien (elle ne voit aucun retenu).
select pg_temp.act_as('11033333-3333-3333-3333-333333333333');
do $$
begin
  begin
    perform public.reorder_retained_comparables('110ccccc-0000-0000-0000-00000000000a',
      array['110dddd0-0000-0000-0000-000000000001', '110dddd0-0000-0000-0000-000000000003',
            '110dddd0-0000-0000-0000-000000000004']::uuid[]);
    raise exception 'FAIL 5c: une autre agence a réordonné le dossier';
  exception when raise_exception then
    if sqlerrm not like '%not_the_retained_list%' then raise; end if;
  end;
end $$;
reset role;

-- 6. Live commencé : la fonction refuse, et une écriture directe ne bouge rien.
update public.projects set live_started_at = now() where id = '110ccccc-0000-0000-0000-00000000000a';
select pg_temp.act_as('11011111-1111-1111-1111-111111111111');
do $$
begin
  begin
    perform public.reorder_retained_comparables('110ccccc-0000-0000-0000-00000000000a',
      array['110dddd0-0000-0000-0000-000000000001', '110dddd0-0000-0000-0000-000000000003',
            '110dddd0-0000-0000-0000-000000000004']::uuid[]);
    raise exception 'FAIL 6: réordonné après le début du Live';
  exception when raise_exception then
    if sqlerrm not like '%live_started%' then raise; end if;
  end;
end $$;
update public.comparables set display_order = 9
  where id = '110dddd0-0000-0000-0000-000000000004';
reset role;
do $$
begin
  if (select display_order from public.comparables where id = '110dddd0-0000-0000-0000-000000000004') <> 1 then
    raise exception 'FAIL 6b: l''ordre a bougé après le début du Live';
  end if;
end $$;

-- 7. Leçon de la migration 20261028 : le verrou de l'ordre ne bloque AUCUNE suppression ni
--    aucun effacement sur un dossier dont le Live a commencé. Le dossier A a commencé (§6), et
--    porte une réponse du vendeur.
insert into public.live_seller_responses (agency_id, project_id, comparable_id, seller_estimated_listing_price) values
  ('110aaaaa-0000-0000-0000-000000000000', '110ccccc-0000-0000-0000-00000000000a',
   '110dddd0-0000-0000-0000-000000000001', 290000);

-- 7a. Supprimer un concurrent, depuis le navigateur du conseiller.
select pg_temp.act_as('11011111-1111-1111-1111-111111111111');
delete from public.comparables where id = '110dddd0-0000-0000-0000-000000000003';
reset role;
do $$
begin
  if exists (select 1 from public.comparables where id = '110dddd0-0000-0000-0000-000000000003') then
    raise exception 'FAIL 7a: un concurrent n''a pas pu être supprimé après le début du Live';
  end if;
end $$;

-- 7b. Effacement B (PROCEDURE_EFFACEMENT.md) : le concurrent sort des retenus, son adresse part.
update public.comparables set
  address = null, locator_address = null, locator_confirmed = null, locator_source = null,
  is_selected = false, updated_at = now()
where id = '110dddd0-0000-0000-0000-000000000004';
do $$
begin
  if (select is_selected from public.comparables where id = '110dddd0-0000-0000-0000-000000000004') then
    raise exception 'FAIL 7b: l''effacement B n''a pas sorti le concurrent des retenus';
  end if;
end $$;

-- 7c. Effacement A : le dossier entier, dans l'ordre de la procédure.
delete from public.seller_synthesis_links where project_id = '110ccccc-0000-0000-0000-00000000000a';
delete from public.comparables where project_id = '110ccccc-0000-0000-0000-00000000000a';
delete from public.subject_properties where project_id = '110ccccc-0000-0000-0000-00000000000a';
delete from public.projects where id = '110ccccc-0000-0000-0000-00000000000a';
do $$
begin
  if exists (select 1 from public.projects where id = '110ccccc-0000-0000-0000-00000000000a')
     or exists (select 1 from public.live_seller_responses where project_id = '110ccccc-0000-0000-0000-00000000000a') then
    raise exception 'FAIL 7c: le dossier commencé n''a pas été effacé entièrement';
  end if;
end $$;

-- 7d. Un compte supprimé (RGPD) : ses recherches nommées partent avec lui.
delete from public.profiles where id = '11044444-4444-4444-4444-444444444444';
do $$
begin
  if exists (select 1 from public.saved_searches where owner_id = '11044444-4444-4444-4444-444444444444') then
    raise exception 'FAIL 7d: les recherches d''un compte supprimé sont restées';
  end if;
end $$;

-- 7e. npm run nettoyer:test : le même bloc que le script, sur une agence de test dont un Live a
--     commencé, avec une réponse du vendeur et une recherche nommée.
insert into auth.users (id) values ('11055555-5555-5555-5555-555555555555');
insert into public.agencies (id, name) values
  ('110eeeee-0000-0000-0000-000000000000', 'TEST AUTOMATIQUE 110');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('11055555-5555-5555-5555-555555555555', '110eeeee-0000-0000-0000-000000000000', 'Te', 'St', 't110@t.l', 'advisor');
insert into public.projects (id, agency_id, advisor_id, seller_name, status, live_started_at) values
  ('110ccccc-0000-0000-0000-00000000000e', '110eeeee-0000-0000-0000-000000000000',
   '11055555-5555-5555-5555-555555555555', 'TEST', 'ready_for_meeting', now());
insert into public.comparables (id, agency_id, project_id, title, price, is_selected, display_order) values
  ('110dddd0-0000-0000-0000-00000000000e', '110eeeee-0000-0000-0000-000000000000',
   '110ccccc-0000-0000-0000-00000000000e', 'c', 300000, true, 1);
insert into public.live_seller_responses (agency_id, project_id, comparable_id, seller_estimated_listing_price) values
  ('110eeeee-0000-0000-0000-000000000000', '110ccccc-0000-0000-0000-00000000000e',
   '110dddd0-0000-0000-0000-00000000000e', 290000);
insert into public.saved_searches (agency_id, owner_id, name, settings) values
  ('110eeeee-0000-0000-0000-000000000000', '11055555-5555-5555-5555-555555555555', 'test',
   '{"sector":null,"autoWiden":true}');
do $$
declare
  v_agency constant uuid := '110eeeee-0000-0000-0000-000000000000';
begin
  delete from public.live_reopenings where agency_id = v_agency;
  delete from public.stream_estate_results where agency_id = v_agency;
  delete from public.comparables where agency_id = v_agency;
  delete from public.subject_properties where agency_id = v_agency;
  delete from public.projects where agency_id = v_agency;
  delete from public.listing_observations where agency_id = v_agency;
  delete from public.prospecting_oppositions where agency_id = v_agency;
  delete from public.saved_searches where agency_id = v_agency;
  if exists (select 1 from public.projects where agency_id = v_agency)
     or exists (select 1 from public.comparables where agency_id = v_agency)
     or exists (select 1 from public.live_seller_responses where agency_id = v_agency)
     or exists (select 1 from public.saved_searches where agency_id = v_agency) then
    raise exception 'FAIL 7e: le nettoyage de l''agence de test a laissé des lignes';
  end if;
end $$;

-- 8. Un manager ne lit pas les recherches de ses conseillers : chacune reste à son conseiller.
insert into auth.users (id) values ('11066666-6666-6666-6666-666666666666');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('11066666-6666-6666-6666-666666666666', '110aaaaa-0000-0000-0000-000000000000', 'Ma', 'Nager', 'm110@t.l', 'manager');
select pg_temp.act_as('11066666-6666-6666-6666-666666666666');
do $$
begin
  if (select count(*) from public.saved_searches) <> 0 then
    raise exception 'FAIL 8: un manager lit les recherches d''un conseiller';
  end if;
end $$;
reset role;

do $$ begin raise notice 'les_experts : OK'; end $$;

rollback;
