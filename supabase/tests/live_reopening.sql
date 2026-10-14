-- Mission 104 — rouvrir un Live figé par erreur, à la SOURCE DE VÉRITÉ :
--   §1 le navigateur (conseiller ou manager) n'appelle pas reopen_live et ne lit pas la trace ;
--   §2 le serveur rouvre : trace (qui, motif, réponses effacées), réponses et résumé effacés,
--      début et fin remis à zéro ;
--   §3 hors de reopen_live, le début du Live ne se remet toujours pas à zéro (M95) ;
--   §4 refusé sans motif, sur un dossier conclu ou archivé, ou quand il n'y a rien à rouvrir ;
--   §5 la trace part avec son dossier.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/live_reopening.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values
  ('10411111-1111-1111-1111-111111111111'),
  ('10422222-2222-2222-2222-222222222222');
insert into public.agencies (id, name) values ('104aaaaa-0000-0000-0000-000000000000', 'A104');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('10411111-1111-1111-1111-111111111111', '104aaaaa-0000-0000-0000-000000000000',
   'Al', 'A', 'a104@t.l', 'advisor'),
  ('10422222-2222-2222-2222-222222222222', '104aaaaa-0000-0000-0000-000000000000',
   'Ma', 'M', 'm104@t.l', 'manager');
insert into public.projects (id, agency_id, advisor_id, seller_name, status, live_started_at, live_ended_at) values
  ('104ccccc-0000-0000-0000-000000000001', '104aaaaa-0000-0000-0000-000000000000',
   '10411111-1111-1111-1111-111111111111', 'figé par erreur', 'ready_for_meeting',
   '2026-10-14 09:00:00+00', '2026-10-14 09:05:00+00'),
  ('104ccccc-0000-0000-0000-000000000002', '104aaaaa-0000-0000-0000-000000000000',
   '10411111-1111-1111-1111-111111111111', 'conclu', 'meeting_completed', null, null),
  ('104ccccc-0000-0000-0000-000000000003', '104aaaaa-0000-0000-0000-000000000000',
   '10411111-1111-1111-1111-111111111111', 'jamais lancé', 'ready_for_meeting', null, null);
insert into public.comparables (id, agency_id, project_id, title, price, surface_area, is_selected, display_order) values
  ('104dddd0-0000-0000-0000-000000000001', '104aaaaa-0000-0000-0000-000000000000',
   '104ccccc-0000-0000-0000-000000000001', 'c1', 300000, 60, true, 0);
insert into public.live_seller_responses (agency_id, project_id, comparable_id, seller_serious_competitor, seller_estimated_listing_price)
  values ('104aaaaa-0000-0000-0000-000000000000', '104ccccc-0000-0000-0000-000000000001',
          '104dddd0-0000-0000-0000-000000000001', 'yes', 280000);
insert into public.live_seller_summary (agency_id, project_id, seller_perceived_property_price)
  values ('104aaaaa-0000-0000-0000-000000000000', '104ccccc-0000-0000-0000-000000000001', 350000);

-- §1 — le navigateur, conseiller comme manager.
do $$
declare v_uid text;
begin
  foreach v_uid in array array['10411111-1111-1111-1111-111111111111', '10422222-2222-2222-2222-222222222222'] loop
    perform set_config('request.jwt.claims',
      format('{"sub":"%s","role":"authenticated"}', v_uid), true);
    set local role authenticated;
    begin
      perform public.reopen_live('104ccccc-0000-0000-0000-000000000001', v_uid::uuid, 'x@t.l', 'motif suffisant');
      raise exception 'FAIL 1: reopen_live appelable depuis le navigateur (%)', v_uid;
    exception when insufficient_privilege then null;
    end;
    begin
      perform count(*) from public.live_reopenings;
      raise exception 'FAIL 1: la trace se lit depuis le navigateur (%)', v_uid;
    exception when insufficient_privilege then null;
    end;
    reset role;
  end loop;
  if (select count(*) from public.live_seller_responses
        where project_id = '104ccccc-0000-0000-0000-000000000001') <> 1 then
    raise exception 'FAIL 1: une réponse a disparu sans réouverture';
  end if;
end $$;

-- §3 — hors de reopen_live, le début ne se remet pas à zéro.
update public.projects set live_started_at = null where id = '104ccccc-0000-0000-0000-000000000001';
do $$
begin
  if (select live_started_at from public.projects
        where id = '104ccccc-0000-0000-0000-000000000001') is null then
    raise exception 'FAIL 3: début remis à zéro hors de reopen_live';
  end if;
end $$;

-- §4 — refus.
do $$
begin
  begin
    perform public.reopen_live('104ccccc-0000-0000-0000-000000000001', null, 'op@t.l', '  ');
    raise exception 'FAIL 4: réouverture sans motif';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.reopen_live('104ccccc-0000-0000-0000-000000000002', null, 'op@t.l', 'motif suffisant');
    raise exception 'FAIL 4: réouverture d''un dossier conclu';
  exception when raise_exception then null;
  end;
  begin
    perform public.reopen_live('104ccccc-0000-0000-0000-000000000003', null, 'op@t.l', 'motif suffisant');
    raise exception 'FAIL 4: réouverture d''un Live jamais commencé';
  exception when raise_exception then null;
  end;
end $$;

-- §2 — le serveur rouvre, et trace.
set local role service_role;
do $$
declare
  v_result jsonb;
  v_trace public.live_reopenings%rowtype;
  v_project public.projects%rowtype;
begin
  v_result := public.reopen_live('104ccccc-0000-0000-0000-000000000001',
    '10411111-1111-1111-1111-111111111111', ' Op@T.L ', 'Essai fait sur un vrai dossier');
  if v_result <> '{"responses": 1, "summary": true}'::jsonb then
    raise exception 'FAIL 2: résultat %', v_result;
  end if;
  select * into v_trace from public.live_reopenings
    where project_id = '104ccccc-0000-0000-0000-000000000001';
  if v_trace.operator_email <> 'op@t.l' or v_trace.reason <> 'Essai fait sur un vrai dossier'
     or v_trace.created_at is null
     or (v_trace.erased #>> '{responses,0,seller_estimated_listing_price}')::numeric <> 280000
     or (v_trace.erased #>> '{summary,seller_perceived_property_price}')::numeric <> 350000
     or (v_trace.erased ->> 'live_started_at') is null then
    raise exception 'FAIL 2: trace incomplète %', to_jsonb(v_trace);
  end if;
  if exists (select 1 from public.live_seller_responses
               where project_id = '104ccccc-0000-0000-0000-000000000001')
     or exists (select 1 from public.live_seller_summary
                  where project_id = '104ccccc-0000-0000-0000-000000000001') then
    raise exception 'FAIL 2: réponses non effacées';
  end if;
  select * into v_project from public.projects where id = '104ccccc-0000-0000-0000-000000000001';
  if v_project.live_started_at is not null or v_project.live_ended_at is not null
     or v_project.status <> 'ready_for_meeting' then
    raise exception 'FAIL 2: dossier non remis à zéro (%, %, %)',
      v_project.live_started_at, v_project.live_ended_at, v_project.status;
  end if;
  -- Le drapeau ne survit pas à l'appel : le début se fige de nouveau.
  update public.projects set live_started_at = '2026-10-14 10:00:00+00'
    where id = '104ccccc-0000-0000-0000-000000000001';
  update public.projects set live_started_at = null
    where id = '104ccccc-0000-0000-0000-000000000001';
  if (select live_started_at from public.projects
        where id = '104ccccc-0000-0000-0000-000000000001') is null then
    raise exception 'FAIL 2: le début ne se fige plus après la réouverture';
  end if;
end $$;
reset role;

-- §5 — la trace part avec son dossier.
delete from public.comparables where project_id = '104ccccc-0000-0000-0000-000000000001';
delete from public.projects where id = '104ccccc-0000-0000-0000-000000000001';
do $$
begin
  if exists (select 1 from public.live_reopenings
               where project_id = '104ccccc-0000-0000-0000-000000000001') then
    raise exception 'FAIL 5: la trace survit à son dossier';
  end if;
end $$;

select 'live_reopening : OK' as resultat;
rollback;
