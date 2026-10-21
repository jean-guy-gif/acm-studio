-- Mission 112, partie A — le Live et ce qu'il montre, à la SOURCE DE VÉRITÉ :
--   • le choix des concurrents montrés se fait en une opération, refusée une fois le Live commencé ;
--   • une fois commencé, `excluded_from_live` et l'ordre ne bougent plus, quel que soit le chemin ;
--   • un concurrent retenu ou ajouté retenu en plein Live est hors Live, à la fin de l'ordre ;
--   • une réponse du Live sur un concurrent hors Live est refusée ;
--   • les suppressions restent permises (leçon de la migration 20261028).
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/live_controle.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values ('11211111-1111-1111-1111-111111111111');
insert into public.agencies (id, name) values ('112aaaaa-0000-0000-0000-000000000000', 'A112');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('11211111-1111-1111-1111-111111111111', '112aaaaa-0000-0000-0000-000000000000', 'Co', 'Nseil', 'a112@t.l', 'advisor');
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('112ccccc-0000-0000-0000-00000000000a', '112aaaaa-0000-0000-0000-000000000000',
   '11211111-1111-1111-1111-111111111111', 'dossier A', 'ready_for_meeting');
insert into public.comparables (id, agency_id, project_id, title, price, is_selected, display_order) values
  ('112dddd0-0000-0000-0000-000000000001', '112aaaaa-0000-0000-0000-000000000000', '112ccccc-0000-0000-0000-00000000000a', 'un', 300000, true, 1),
  ('112dddd0-0000-0000-0000-000000000002', '112aaaaa-0000-0000-0000-000000000000', '112ccccc-0000-0000-0000-00000000000a', 'deux', 310000, true, 2),
  ('112dddd0-0000-0000-0000-000000000003', '112aaaaa-0000-0000-0000-000000000000', '112ccccc-0000-0000-0000-00000000000a', 'trois', 320000, true, 3),
  ('112dddd0-0000-0000-0000-000000000004', '112aaaaa-0000-0000-0000-000000000000', '112ccccc-0000-0000-0000-00000000000a', 'écarté', 330000, false, 4);

create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}', p_uid), true);
  execute 'set local role authenticated';
end $$;
grant execute on function pg_temp.act_as(uuid) to authenticated;

-- 1. Avant le Live : le choix se fait en une opération, depuis le navigateur du conseiller.
select pg_temp.act_as('11211111-1111-1111-1111-111111111111');
select public.save_live_shortlist('112ccccc-0000-0000-0000-00000000000a',
  array['112dddd0-0000-0000-0000-000000000001', '112dddd0-0000-0000-0000-000000000002',
        '112dddd0-0000-0000-0000-000000000004']::uuid[]);
do $$
begin
  begin
    perform public.save_live_shortlist('112ccccc-0000-0000-0000-00000000000a',
      array['112dddd0-0000-0000-0000-000000000004']::uuid[]);
    raise exception 'FAIL 1a: un choix sans aucun concurrent retenu a été accepté';
  exception when raise_exception then
    if sqlerrm not like '%empty_shortlist%' then raise; end if;
  end;
end $$;
reset role;
do $$
begin
  if (select array_agg(title order by display_order) from public.comparables
      where project_id = '112ccccc-0000-0000-0000-00000000000a' and is_selected and not excluded_from_live)
     <> array['un', 'deux'] then
    raise exception 'FAIL 1b: choix des concurrents montrés inattendu';
  end if;
  if (select live_shortlist_at from public.projects where id = '112ccccc-0000-0000-0000-00000000000a') is null then
    raise exception 'FAIL 1c: le choix n''est pas daté';
  end if;
end $$;

-- 2. Le Live commence (une réponse du vendeur sur un concurrent montré : acceptée).
insert into public.live_seller_responses (agency_id, project_id, comparable_id, seller_serious_competitor) values
  ('112aaaaa-0000-0000-0000-000000000000', '112ccccc-0000-0000-0000-00000000000a',
   '112dddd0-0000-0000-0000-000000000001', 'yes');

-- 2a. Le choix ne se refait plus, ni par l'opération, ni par une écriture directe.
select pg_temp.act_as('11211111-1111-1111-1111-111111111111');
do $$
begin
  begin
    perform public.save_live_shortlist('112ccccc-0000-0000-0000-00000000000a',
      array['112dddd0-0000-0000-0000-000000000003']::uuid[]);
    raise exception 'FAIL 2a: choix refait après le début du Live';
  exception when raise_exception then
    if sqlerrm not like '%live_started%' then raise; end if;
  end;
end $$;
update public.comparables set excluded_from_live = false
  where id = '112dddd0-0000-0000-0000-000000000003';
update public.comparables set excluded_from_live = true
  where id = '112dddd0-0000-0000-0000-000000000002';
reset role;
do $$
begin
  if (select excluded_from_live from public.comparables where id = '112dddd0-0000-0000-0000-000000000003') is not true
     or (select excluded_from_live from public.comparables where id = '112dddd0-0000-0000-0000-000000000002') is not false then
    raise exception 'FAIL 2b: les concurrents montrés ont bougé après le début du Live';
  end if;
end $$;

-- 3. Retenu en plein Live : hors Live, à la fin de l'ordre ; ajouté retenu : hors Live.
select pg_temp.act_as('11211111-1111-1111-1111-111111111111');
update public.comparables set is_selected = true where id = '112dddd0-0000-0000-0000-000000000004';
insert into public.comparables (id, agency_id, project_id, title, price, is_selected, display_order) values
  ('112dddd0-0000-0000-0000-000000000005', '112aaaaa-0000-0000-0000-000000000000',
   '112ccccc-0000-0000-0000-00000000000a', 'nouveau', 340000, true, 9);
reset role;
do $$
declare r record;
begin
  select excluded_from_live, display_order into r from public.comparables
    where id = '112dddd0-0000-0000-0000-000000000004';
  if not r.excluded_from_live then
    raise exception 'FAIL 3a: un concurrent retenu en plein Live est montré';
  end if;
  if r.display_order <> (select max(display_order) from public.comparables
                          where project_id = '112ccccc-0000-0000-0000-00000000000a'
                            and id <> '112dddd0-0000-0000-0000-000000000005') then
    raise exception 'FAIL 3b: le concurrent retenu en plein Live n''est pas à la fin de l''ordre (%)', r.display_order;
  end if;
  if not (select excluded_from_live from public.comparables where id = '112dddd0-0000-0000-0000-000000000005') then
    raise exception 'FAIL 3c: un concurrent ajouté retenu en plein Live est montré';
  end if;
end $$;

-- 4. Une réponse sur un concurrent hors Live est refusée.
do $$
begin
  begin
    insert into public.live_seller_responses (agency_id, project_id, comparable_id, seller_serious_competitor) values
      ('112aaaaa-0000-0000-0000-000000000000', '112ccccc-0000-0000-0000-00000000000a',
       '112dddd0-0000-0000-0000-000000000003', 'yes');
    raise exception 'FAIL 4: réponse acceptée sur un concurrent hors Live';
  exception when raise_exception then
    if sqlerrm not like '%competitor_not_in_live%' then raise; end if;
  end;
end $$;

-- 5. Les suppressions restent permises : un concurrent, puis le dossier entier (effacement A).
select pg_temp.act_as('11211111-1111-1111-1111-111111111111');
delete from public.comparables where id = '112dddd0-0000-0000-0000-000000000003';
reset role;
delete from public.comparables where project_id = '112ccccc-0000-0000-0000-00000000000a';
delete from public.projects where id = '112ccccc-0000-0000-0000-00000000000a';
do $$
begin
  if exists (select 1 from public.projects where id = '112ccccc-0000-0000-0000-00000000000a')
     or exists (select 1 from public.live_seller_responses where project_id = '112ccccc-0000-0000-0000-00000000000a') then
    raise exception 'FAIL 5: le dossier commencé n''a pas été supprimé entièrement';
  end if;
end $$;

-- 6. La trace de la confirmation : deux colonnes, vides par défaut.
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_name = 'projects' and column_name = 'live_confirmed_at')
     or not exists (select 1 from information_schema.columns
                    where table_name = 'projects' and column_name = 'live_confirmed_by') then
    raise exception 'FAIL 6: la trace de la confirmation manque';
  end if;
end $$;

do $$ begin raise notice 'live_controle : OK'; end $$;

rollback;
