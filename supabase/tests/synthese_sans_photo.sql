-- Mission 113 — « Sans photo » sur la synthèse, à la SOURCE DE VÉRITÉ :
--   §1 un concurrent montre sa photo par défaut ;
--   §2 le conseiller de l'agence la retire et la remet, Live commencé et dossier conclu compris
--      (la synthèse se prépare après le rendez-vous) ;
--   §3 un conseiller d'une autre agence n'y touche pas.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/synthese_sans_photo.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values
  ('11311111-1111-1111-1111-111111111111'),
  ('11322222-2222-2222-2222-222222222222');
insert into public.agencies (id, name) values
  ('113aaaaa-0000-0000-0000-000000000000', 'A113'),
  ('113bbbbb-0000-0000-0000-000000000000', 'B113');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('11311111-1111-1111-1111-111111111111', '113aaaaa-0000-0000-0000-000000000000',
   'Al', 'A', 'a113@t.l', 'advisor'),
  ('11322222-2222-2222-2222-222222222222', '113bbbbb-0000-0000-0000-000000000000',
   'Bo', 'B', 'b113@t.l', 'advisor');
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('113ccccc-0000-0000-0000-000000000001', '113aaaaa-0000-0000-0000-000000000000',
   '11311111-1111-1111-1111-111111111111', 'conclu', 'ready_for_meeting');
insert into public.comparables (id, agency_id, project_id, title, price, surface_area, is_selected, display_order) values
  ('113dddd0-0000-0000-0000-000000000001', '113aaaaa-0000-0000-0000-000000000000',
   '113ccccc-0000-0000-0000-000000000001', 'c1', 300000, 60, true, 0);
-- Le Live a eu lieu, puis le dossier est conclu.
update public.projects
  set live_started_at = '2026-10-21 09:00:00+00', live_ended_at = '2026-10-21 10:00:00+00',
      status = 'meeting_completed'
  where id = '113ccccc-0000-0000-0000-000000000001';

-- §1 — la photo figure par défaut.
do $$
begin
  if (select synthesis_hide_photo from public.comparables
        where id = '113dddd0-0000-0000-0000-000000000001') is distinct from false then
    raise exception 'FAIL 1: la photo est retirée par défaut';
  end if;
end $$;

-- §2 — le conseiller de l'agence la retire, puis la remet.
select set_config('request.jwt.claims',
  '{"sub":"11311111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
update public.comparables set synthesis_hide_photo = true
  where id = '113dddd0-0000-0000-0000-000000000001';
reset role;
do $$
begin
  if (select synthesis_hide_photo from public.comparables
        where id = '113dddd0-0000-0000-0000-000000000001') is not true then
    raise exception 'FAIL 2: le conseiller ne retire pas la photo d''un dossier conclu';
  end if;
end $$;
select set_config('request.jwt.claims',
  '{"sub":"11311111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
update public.comparables set synthesis_hide_photo = false
  where id = '113dddd0-0000-0000-0000-000000000001';
reset role;
do $$
begin
  if (select synthesis_hide_photo from public.comparables
        where id = '113dddd0-0000-0000-0000-000000000001') is not false then
    raise exception 'FAIL 2: le conseiller ne remet pas la photo';
  end if;
end $$;

-- §3 — une autre agence n'y touche pas.
select set_config('request.jwt.claims',
  '{"sub":"11322222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
update public.comparables set synthesis_hide_photo = true
  where id = '113dddd0-0000-0000-0000-000000000001';
reset role;
do $$
begin
  if (select synthesis_hide_photo from public.comparables
        where id = '113dddd0-0000-0000-0000-000000000001') is not false then
    raise exception 'FAIL 3: une autre agence retire la photo';
  end if;
  raise notice 'synthese_sans_photo : OK';
end $$;

rollback;
