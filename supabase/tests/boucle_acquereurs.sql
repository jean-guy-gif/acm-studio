-- Mission 133 — les acquéreurs montrés au vendeur pendant le Live, à la SOURCE DE VÉRITÉ :
--   §1 un résumé neuf n'a rien de montré ;
--   §2 le moment et le compte vont ensemble ; le compte vaut 5 au moins ;
--   §3 la première présentation est gardée : ni réécrite, ni vidée ; l'heure est celle de la base,
--      à l'insertion comme à la mise à jour ; le reste du résumé change comme avant ;
--   §4 sur un dossier conclu, rien ne s'écrit (le verrou de M109) ; supprimer le concurrent le plus
--      dangereux ou le plus proche passe, et ce qui a été montré reste ;
--   §5 depuis le navigateur du conseiller de l'agence : posé sur son dossier ; une autre agence
--      et un membre retiré ne le voient pas et ne l'écrivent pas.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/boucle_acquereurs.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values
  ('13311111-1111-1111-1111-111111111111'),
  ('13322222-2222-2222-2222-222222222222'),
  ('13333333-3333-3333-3333-333333333333');
insert into public.agencies (id, name) values
  ('133aaaaa-0000-0000-0000-000000000000', 'A133'),
  ('133bbbbb-0000-0000-0000-000000000000', 'B133');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('13311111-1111-1111-1111-111111111111', '133aaaaa-0000-0000-0000-000000000000',
   'Al', 'A', 'a133@t.l', 'advisor'),
  ('13322222-2222-2222-2222-222222222222', '133bbbbb-0000-0000-0000-000000000000',
   'Bo', 'B', 'b133@t.l', 'advisor');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, removed_at) values
  ('13333333-3333-3333-3333-333333333333', '133aaaaa-0000-0000-0000-000000000000',
   'Ré', 'R', 'r133@t.l', 'advisor', now());
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('133ccccc-0000-0000-0000-000000000001', '133aaaaa-0000-0000-0000-000000000000',
   '13311111-1111-1111-1111-111111111111', 'boucle', 'ready_for_meeting'),
  ('133ccccc-0000-0000-0000-000000000002', '133aaaaa-0000-0000-0000-000000000000',
   '13311111-1111-1111-1111-111111111111', 'navigateur', 'ready_for_meeting'),
  ('133ccccc-0000-0000-0000-000000000003', '133aaaaa-0000-0000-0000-000000000000',
   '13311111-1111-1111-1111-111111111111', 'conclu', 'ready_for_meeting');
insert into public.comparables (id, agency_id, project_id, title, price, surface_area, is_selected, display_order) values
  ('133dddd0-0000-0000-0000-000000000001', '133aaaaa-0000-0000-0000-000000000000',
   '133ccccc-0000-0000-0000-000000000003', 'dangereux', 300000, 60, true, 0),
  ('133dddd0-0000-0000-0000-000000000002', '133aaaaa-0000-0000-0000-000000000000',
   '133ccccc-0000-0000-0000-000000000003', 'proche', 320000, 62, true, 1);

-- §1 — rien de montré par défaut.
insert into public.live_seller_summary (agency_id, project_id)
  values ('133aaaaa-0000-0000-0000-000000000000', '133ccccc-0000-0000-0000-000000000001');
do $$
begin
  if exists (select 1 from public.live_seller_summary
             where project_id = '133ccccc-0000-0000-0000-000000000001'
               and (buyers_shown_at is not null or buyers_shown_count is not null)) then
    raise exception 'FAIL 1: un résumé neuf a des acquéreurs montrés';
  end if;
end $$;

-- §2 — ensemble, et 5 au moins.
do $$
begin
  begin
    update public.live_seller_summary set buyers_shown_at = now()
      where project_id = '133ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 2: le moment accepté sans le compte';
  exception when check_violation then null;
  end;
  begin
    update public.live_seller_summary set buyers_shown_count = 7
      where project_id = '133ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 2: le compte accepté sans le moment';
  exception when check_violation then null;
  end;
  begin
    update public.live_seller_summary set buyers_shown_at = now(), buyers_shown_count = 4
      where project_id = '133ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 2: un compte sous 5 accepté';
  exception when check_violation then null;
  end;
end $$;

-- §3 — la première présentation est gardée.
update public.live_seller_summary
  set buyers_shown_at = '2026-11-06 10:00:00+00', buyers_shown_count = 7
  where project_id = '133ccccc-0000-0000-0000-000000000001';
update public.live_seller_summary
  set buyers_shown_at = '2026-11-06 10:30:00+00', buyers_shown_count = 9,
      seller_property_comment = 'Le reste change'
  where project_id = '133ccccc-0000-0000-0000-000000000001';
update public.live_seller_summary
  set buyers_shown_at = null, buyers_shown_count = null
  where project_id = '133ccccc-0000-0000-0000-000000000001';
do $$
declare
  r record;
begin
  select buyers_shown_at, buyers_shown_count, seller_property_comment into r
    from public.live_seller_summary where project_id = '133ccccc-0000-0000-0000-000000000001';
  if r.buyers_shown_at <> now() or r.buyers_shown_count <> 7 then
    raise exception 'FAIL 3: la première présentation a été réécrite ou vidée (%, %)',
      r.buyers_shown_at, r.buyers_shown_count;
  end if;
  if r.seller_property_comment is distinct from 'Le reste change' then
    raise exception 'FAIL 3: le reste du résumé ne change plus';
  end if;
end $$;
-- À l'insertion aussi, l'heure envoyée est remplacée par celle de la base.
insert into public.live_seller_summary (agency_id, project_id, buyers_shown_at, buyers_shown_count)
  values ('133aaaaa-0000-0000-0000-000000000000', '133ccccc-0000-0000-0000-000000000003',
          '2020-01-01 00:00:00+00', 6);
do $$
begin
  if (select buyers_shown_at from public.live_seller_summary
      where project_id = '133ccccc-0000-0000-0000-000000000003') <> now() then
    raise exception 'FAIL 3: l''heure envoyée à l''insertion n''est pas remplacée';
  end if;
end $$;

-- §4 — dossier conclu : refusé (M109).
insert into public.live_seller_summary (agency_id, project_id)
  values ('133aaaaa-0000-0000-0000-000000000000', '133ccccc-0000-0000-0000-000000000002');
update public.projects set status = 'meeting_completed'
  where id = '133ccccc-0000-0000-0000-000000000002';
do $$
begin
  begin
    update public.live_seller_summary set buyers_shown_at = now(), buyers_shown_count = 6
      where project_id = '133ccccc-0000-0000-0000-000000000002';
    raise exception 'FAIL 4: acquéreurs montrés écrits sur un dossier conclu';
  exception when sqlstate '42501' then null;
  end;
end $$;
update public.projects set status = 'ready_for_meeting'
  where id = '133ccccc-0000-0000-0000-000000000002';
-- Dossier conclu, acquéreurs montrés : supprimer le plus dangereux et le plus proche passe.
update public.live_seller_summary
  set seller_most_dangerous_comparable_id = '133dddd0-0000-0000-0000-000000000001',
      advisor_closest_comparable_id = '133dddd0-0000-0000-0000-000000000002'
  where project_id = '133ccccc-0000-0000-0000-000000000003';
update public.projects set status = 'meeting_completed'
  where id = '133ccccc-0000-0000-0000-000000000003';
delete from public.comparables where id = '133dddd0-0000-0000-0000-000000000001';
delete from public.comparables where id = '133dddd0-0000-0000-0000-000000000002';
do $$
declare
  r record;
begin
  select * into r from public.live_seller_summary
    where project_id = '133ccccc-0000-0000-0000-000000000003';
  if r.seller_most_dangerous_comparable_id is not null
     or r.advisor_closest_comparable_id is not null then
    raise exception 'FAIL 4: les concurrents supprimés ne sont pas vidés';
  end if;
  if r.buyers_shown_count is distinct from 6 or r.buyers_shown_at is null then
    raise exception 'FAIL 4: les acquéreurs montrés ont bougé avec la suppression';
  end if;
end $$;

-- §5 — le navigateur du conseiller de l'agence ; une autre agence n'y touche pas.
select set_config('request.jwt.claims',
  '{"sub":"13311111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
update public.live_seller_summary set buyers_shown_at = now(), buyers_shown_count = 5
  where project_id = '133ccccc-0000-0000-0000-000000000002';
do $$
begin
  if (select buyers_shown_count from public.live_seller_summary
      where project_id = '133ccccc-0000-0000-0000-000000000002') is distinct from 5 then
    raise exception 'FAIL 5: le conseiller de l''agence ne note pas les acquéreurs montrés';
  end if;
end $$;
reset role;
select set_config('request.jwt.claims',
  '{"sub":"13322222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
do $$
declare
  n integer;
begin
  if exists (select 1 from public.live_seller_summary
             where agency_id = '133aaaaa-0000-0000-0000-000000000000') then
    raise exception 'FAIL 5: une autre agence lit les acquéreurs montrés';
  end if;
  update public.live_seller_summary set buyers_shown_at = now(), buyers_shown_count = 8
    where project_id = '133ccccc-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FAIL 5: une autre agence écrit les acquéreurs montrés';
  end if;
end $$;
reset role;
select set_config('request.jwt.claims',
  '{"sub":"13333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;
do $$
declare
  n integer;
begin
  if exists (select 1 from public.live_seller_summary) then
    raise exception 'FAIL 5: un membre retiré lit les acquéreurs montrés';
  end if;
  update public.live_seller_summary set buyers_shown_at = now(), buyers_shown_count = 8
    where project_id = '133ccccc-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FAIL 5: un membre retiré écrit les acquéreurs montrés';
  end if;
end $$;
reset role;

rollback;
