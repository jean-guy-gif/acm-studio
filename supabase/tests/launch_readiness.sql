-- Mission 85 — la note « prêt à lancer » (1 à 10), testée à la SOURCE DE VÉRITÉ.
--   §1 la première note ne se réécrit jamais, la dernière suit le vendeur ;
--   §2 une note hors de 1 à 10 est refusée ;
--   §3 la conclusion fige la première, la dernière et la réponse ;
--   §4 modifier le résumé après, ou conclure à nouveau, ne change rien de figé ;
--   §5 sans note, rien n'est inventé.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/launch_readiness.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111');
insert into public.agencies (id, name) values ('aaaaaaaa-0000-0000-0000-000000000000', 'A');
insert into public.profiles (id, agency_id, first_name, last_name, email, role)
  values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000000',
          'Al', 'A', 'a@t.l', 'manager');
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111', 'avec note', 'ready_for_meeting'),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111', 'sans note', 'ready_for_meeting');

-- §1 — 7 d'abord, puis 10 : la première reste 7, même si le navigateur renvoie autre chose.
do $$
declare r public.live_seller_summary%rowtype;
begin
  insert into public.live_seller_summary (project_id, agency_id, seller_launch_readiness_last)
    values ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 7);
  select * into r from public.live_seller_summary
    where project_id = 'cccccccc-0000-0000-0000-000000000001';
  if r.seller_launch_readiness_first is distinct from 7 then
    raise exception 'FAIL 1: première note non posée (%)', r.seller_launch_readiness_first;
  end if;

  update public.live_seller_summary
    set seller_launch_readiness_first = 10, seller_launch_readiness_last = 10,
        seller_launch_readiness_missing = 'le délai'
    where project_id = 'cccccccc-0000-0000-0000-000000000001';
  select * into r from public.live_seller_summary
    where project_id = 'cccccccc-0000-0000-0000-000000000001';
  if r.seller_launch_readiness_first is distinct from 7
     or r.seller_launch_readiness_last is distinct from 10 then
    raise exception 'FAIL 1: attendu 7 → 10, obtenu % → %',
      r.seller_launch_readiness_first, r.seller_launch_readiness_last;
  end if;

  -- Une écriture qui ne parle pas de la note (une autre réponse du Live) n'y touche pas.
  update public.live_seller_summary set seller_perceived_property_price = 400000
    where project_id = 'cccccccc-0000-0000-0000-000000000001';
  select * into r from public.live_seller_summary
    where project_id = 'cccccccc-0000-0000-0000-000000000001';
  if r.seller_launch_readiness_first is distinct from 7
     or r.seller_launch_readiness_last is distinct from 10 then
    raise exception 'FAIL 1: note modifiée par une autre écriture';
  end if;
end $$;

-- §2 — hors de 1 à 10 : refusé.
do $$
begin
  begin
    update public.live_seller_summary set seller_launch_readiness_last = 11
      where project_id = 'cccccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 2: 11 accepté';
  exception when check_violation then null;
  end;
  begin
    update public.live_seller_summary set seller_launch_readiness_last = 0
      where project_id = 'cccccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 2: 0 accepté';
  exception when check_violation then null;
  end;
end $$;

-- §3 — la conclusion fige les trois faits (appel à 12 arguments, celui de `main`).
do $$
declare r public.project_meeting_conclusions%rowtype;
begin
  perform public.conclude_meeting(
    'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000',
    'signed', null, 512000, 500000, 372000, 498765, 555000, 400000, 5, 3);
  select * into r from public.project_meeting_conclusions
    where project_id = 'cccccccc-0000-0000-0000-000000000001';
  if r.frozen_launch_readiness_first is distinct from 7
     or r.frozen_launch_readiness_last is distinct from 10
     or r.frozen_launch_readiness_missing is distinct from 'le délai' then
    raise exception 'FAIL 3: non figé (%, %, %)', r.frozen_launch_readiness_first,
      r.frozen_launch_readiness_last, r.frozen_launch_readiness_missing;
  end if;
  if (select status from public.projects where id = 'cccccccc-0000-0000-0000-000000000001')
     is distinct from 'meeting_completed' then
    raise exception 'FAIL 3: status non meeting_completed';
  end if;
end $$;

-- §4 — après la conclusion, le résumé bouge, on conclut à nouveau : le figé ne bouge pas.
do $$
declare r public.project_meeting_conclusions%rowtype;
begin
  update public.live_seller_summary
    set seller_launch_readiness_last = 3, seller_launch_readiness_missing = 'autre chose'
    where project_id = 'cccccccc-0000-0000-0000-000000000001';
  perform public.conclude_meeting(
    'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000',
    'follow_up', 'motif', null, null, null, null);
  select * into r from public.project_meeting_conclusions
    where project_id = 'cccccccc-0000-0000-0000-000000000001';
  if r.frozen_launch_readiness_first is distinct from 7
     or r.frozen_launch_readiness_last is distinct from 10
     or r.frozen_launch_readiness_missing is distinct from 'le délai' then
    raise exception 'FAIL 4: figé réécrit (%, %, %)', r.frozen_launch_readiness_first,
      r.frozen_launch_readiness_last, r.frozen_launch_readiness_missing;
  end if;
end $$;

-- §5 — sans note (et sans résumé du tout) : la conclusion passe, rien n'est inventé.
do $$
declare r public.project_meeting_conclusions%rowtype;
begin
  perform public.conclude_meeting(
    'cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000',
    'follow_up', 'motif', null, null, null, null);
  select * into r from public.project_meeting_conclusions
    where project_id = 'cccccccc-0000-0000-0000-000000000002';
  if r.frozen_launch_readiness_first is not null
     or r.frozen_launch_readiness_last is not null
     or r.frozen_launch_readiness_missing is not null then
    raise exception 'FAIL 5: une note a été inventée';
  end if;
  if (select status from public.projects where id = 'cccccccc-0000-0000-0000-000000000002')
     is distinct from 'meeting_completed' then
    raise exception 'FAIL 5: status non meeting_completed';
  end if;
end $$;

rollback;
