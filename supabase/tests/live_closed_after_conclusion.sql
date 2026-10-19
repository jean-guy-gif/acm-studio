-- Mission 109 — un dossier conclu ou archivé ne change plus par le Live, à la SOURCE DE VÉRITÉ :
--   le navigateur du conseiller comme une fonction ne peuvent plus écrire une réponse ni le résumé
--   d'un dossier conclu ou archivé ; pendant le Live, tout s'écrit ; supprimer reste possible.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/live_closed_after_conclusion.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values ('10911111-1111-1111-1111-111111111111');
insert into public.agencies (id, name) values ('109aaaaa-0000-0000-0000-000000000000', 'A109');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('10911111-1111-1111-1111-111111111111', '109aaaaa-0000-0000-0000-000000000000', 'Ac', 'Tif', 'a109@t.l', 'advisor');
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('109ccccc-0000-0000-0000-00000000000a', '109aaaaa-0000-0000-0000-000000000000',
   '10911111-1111-1111-1111-111111111111', 'conclu', 'ready_for_meeting'),
  ('109ccccc-0000-0000-0000-00000000000b', '109aaaaa-0000-0000-0000-000000000000',
   '10911111-1111-1111-1111-111111111111', 'archivé', 'ready_for_meeting');
insert into public.comparables (id, agency_id, project_id, title, price, display_order) values
  ('109dddd0-0000-0000-0000-00000000000a', '109aaaaa-0000-0000-0000-000000000000',
   '109ccccc-0000-0000-0000-00000000000a', 'c', 300000, 1),
  ('109dddd0-0000-0000-0000-00000000000b', '109aaaaa-0000-0000-0000-000000000000',
   '109ccccc-0000-0000-0000-00000000000b', 'c', 300000, 1);

create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}', p_uid), true);
  execute 'set local role authenticated';
end $$;
grant execute on function pg_temp.act_as(uuid) to authenticated;

-- Pendant le Live : la réponse et le résumé s'écrivent.
select pg_temp.act_as('10911111-1111-1111-1111-111111111111');
insert into public.live_seller_responses (project_id, comparable_id, agency_id, seller_serious_competitor)
  values ('109ccccc-0000-0000-0000-00000000000a', '109dddd0-0000-0000-0000-00000000000a',
          '109aaaaa-0000-0000-0000-000000000000', 'yes');
insert into public.live_seller_summary (project_id, agency_id, seller_perceived_property_price)
  values ('109ccccc-0000-0000-0000-00000000000a', '109aaaaa-0000-0000-0000-000000000000', 350000);
reset role;

-- Conclu, et l'autre archivé.
select public.conclude_meeting(
  p_project_id => '109ccccc-0000-0000-0000-00000000000a',
  p_agency_id => '109aaaaa-0000-0000-0000-000000000000',
  p_outcome => 'signed', p_reason => null, p_price => 320000,
  p_market_computed => null, p_advisor_analysis => null, p_advisor_price => null);
update public.projects set status = 'archived' where id = '109ccccc-0000-0000-0000-00000000000b';

select pg_temp.act_as('10911111-1111-1111-1111-111111111111');
do $$
begin
  begin
    update public.live_seller_responses set seller_serious_competitor = 'no'
      where project_id = '109ccccc-0000-0000-0000-00000000000a';
    raise exception 'FAIL 1: une réponse d''un dossier conclu a changé';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.live_seller_summary set seller_most_dangerous_reason = 'price'
      where project_id = '109ccccc-0000-0000-0000-00000000000a';
    raise exception 'FAIL 1: le résumé d''un dossier conclu a changé';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.live_seller_responses (project_id, comparable_id, agency_id, seller_serious_competitor)
      values ('109ccccc-0000-0000-0000-00000000000b', '109dddd0-0000-0000-0000-00000000000b',
              '109aaaaa-0000-0000-0000-000000000000', 'yes');
    raise exception 'FAIL 2: une réponse s''écrit sur un dossier archivé';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Même une fonction ou la clé de service ne réécrit pas un Live conclu.
do $$
begin
  begin
    update public.live_seller_responses set seller_serious_competitor = 'no'
      where project_id = '109ccccc-0000-0000-0000-00000000000a';
    raise exception 'FAIL 3: le serveur réécrit une réponse d''un dossier conclu';
  exception when insufficient_privilege then null;
  end;
  if (select seller_serious_competitor from public.live_seller_responses
      where project_id = '109ccccc-0000-0000-0000-00000000000a') is distinct from 'yes' then
    raise exception 'FAIL 3: la réponse a changé';
  end if;
  -- Supprimer un concurrent emporte toujours ses réponses (M92).
  delete from public.comparables where id = '109dddd0-0000-0000-0000-00000000000a';
  if exists (select 1 from public.live_seller_responses
             where project_id = '109ccccc-0000-0000-0000-00000000000a') then
    raise exception 'FAIL 4: la suppression du concurrent n''a pas emporté sa réponse';
  end if;
end $$;

do $$ begin raise notice 'live_closed_after_conclusion : OK'; end $$;

rollback;
