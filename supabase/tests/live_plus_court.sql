-- Mission 110, partie B — un Live plus court, à la SOURCE DE VÉRITÉ : un concurrent est montré par
-- défaut et reste retenu quand il est « hors Live » ; le choix n'est pas fait tant qu'il n'est pas
-- daté ; le conseiller de l'agence écrit la marque, une autre agence non.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/live_plus_court.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values
  ('11111111-1110-1111-1111-111111111111'),
  ('11133333-3333-3333-3333-333333333333');
insert into public.agencies (id, name) values
  ('111aaaaa-0000-0000-0000-000000000000', 'A111'),
  ('111bbbbb-0000-0000-0000-000000000000', 'B111');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('11111111-1110-1111-1111-111111111111', '111aaaaa-0000-0000-0000-000000000000', 'Ac', 'Tif', 'a111@t.l', 'advisor'),
  ('11133333-3333-3333-3333-333333333333', '111bbbbb-0000-0000-0000-000000000000', 'Au', 'Tre', 'b111@t.l', 'advisor');
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('111ccccc-0000-0000-0000-00000000000a', '111aaaaa-0000-0000-0000-000000000000',
   '11111111-1110-1111-1111-111111111111', 'dossier A', 'ready_for_meeting');
insert into public.comparables (id, agency_id, project_id, title, price, is_selected, display_order) values
  ('111dddd0-0000-0000-0000-00000000000a', '111aaaaa-0000-0000-0000-000000000000',
   '111ccccc-0000-0000-0000-00000000000a', 'c', 300000, true, 1);

create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}', p_uid), true);
  execute 'set local role authenticated';
end $$;
grant execute on function pg_temp.act_as(uuid) to authenticated;

do $$
begin
  if (select excluded_from_live from public.comparables where id = '111dddd0-0000-0000-0000-00000000000a') then
    raise exception 'FAIL 1: un concurrent n''est pas montré par défaut';
  end if;
  if (select live_shortlist_at from public.projects where id = '111ccccc-0000-0000-0000-00000000000a') is not null then
    raise exception 'FAIL 1: le choix est daté sans avoir été fait';
  end if;
end $$;

select pg_temp.act_as('11111111-1110-1111-1111-111111111111');
update public.comparables set excluded_from_live = true where id = '111dddd0-0000-0000-0000-00000000000a';
reset role;
do $$
begin
  if not (select excluded_from_live and is_selected from public.comparables where id = '111dddd0-0000-0000-0000-00000000000a') then
    raise exception 'FAIL 2: hors Live, le concurrent doit rester retenu';
  end if;
end $$;

select pg_temp.act_as('11133333-3333-3333-3333-333333333333');
update public.comparables set excluded_from_live = false where id = '111dddd0-0000-0000-0000-00000000000a';
reset role;
do $$
begin
  if not (select excluded_from_live from public.comparables where id = '111dddd0-0000-0000-0000-00000000000a') then
    raise exception 'FAIL 3: une autre agence a changé la marque';
  end if;
end $$;

do $$ begin raise notice 'live_plus_court : OK'; end $$;

rollback;
