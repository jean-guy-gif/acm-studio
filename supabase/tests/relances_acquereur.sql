-- Mission 135 — les faits datés d'un acquéreur, à la SOURCE DE VÉRITÉ :
--   §1 un partage, une relance, un ajustement s'écrivent par le serveur, avec ce que chacun exige ;
--   §2 le premier partage d'une sélection est gardé (une ligne par sélection) ;
--   §3 deux relances au plus par sélection ;
--   §4 l'agence de la fiche et de l'auteur, la sélection de cette fiche sont vérifiées ;
--   §5 le navigateur lit son agence et n'écrit rien ; une autre agence et un membre retiré ne
--      lisent rien ;
--   §6 la sélection supprimée emporte ses partages et relances ; la fiche supprimée, tout.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/relances_acquereur.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values
  ('13511111-1111-1111-1111-111111111111'),
  ('13522222-2222-2222-2222-222222222222'),
  ('13533333-3333-3333-3333-333333333333');
insert into public.agencies (id, name) values
  ('135aaaaa-0000-0000-0000-000000000000', 'A135'),
  ('135bbbbb-0000-0000-0000-000000000000', 'B135');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('13511111-1111-1111-1111-111111111111', '135aaaaa-0000-0000-0000-000000000000',
   'Al', 'A', 'a135@t.l', 'advisor'),
  ('13522222-2222-2222-2222-222222222222', '135bbbbb-0000-0000-0000-000000000000',
   'Bo', 'B', 'b135@t.l', 'advisor');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, removed_at) values
  ('13533333-3333-3333-3333-333333333333', '135aaaaa-0000-0000-0000-000000000000',
   'Ré', 'R', 'r135@t.l', 'advisor', now());
insert into public.buyers (id, agency_id, advisor_id, name, cities) values
  ('135ccccc-0000-0000-0000-000000000001', '135aaaaa-0000-0000-0000-000000000000',
   '13511111-1111-1111-1111-111111111111', 'Lambert', array['Vence']),
  ('135ccccc-0000-0000-0000-000000000002', '135aaaaa-0000-0000-0000-000000000000',
   '13511111-1111-1111-1111-111111111111', 'Autre fiche', array['Vence']),
  ('135ccccc-0000-0000-0000-000000000003', '135bbbbb-0000-0000-0000-000000000000',
   '13522222-2222-2222-2222-222222222222', 'Autre agence', array['Vence']);
insert into public.buyer_selections (id, agency_id, buyer_id) values
  ('135eeeee-0000-0000-0000-000000000001', '135aaaaa-0000-0000-0000-000000000000',
   '135ccccc-0000-0000-0000-000000000001'),
  ('135eeeee-0000-0000-0000-000000000002', '135aaaaa-0000-0000-0000-000000000000',
   '135ccccc-0000-0000-0000-000000000002');

-- §1 — ce que chacun exige.
insert into public.buyer_events (agency_id, buyer_id, kind, selection_id, occurred_at, created_by)
values
  ('135aaaaa-0000-0000-0000-000000000000', '135ccccc-0000-0000-0000-000000000001', 'link_shared',
   '135eeeee-0000-0000-0000-000000000001', now() - interval '3 days',
   '13511111-1111-1111-1111-111111111111');
insert into public.buyer_events (agency_id, buyer_id, kind, reason, summary)
values
  ('135aaaaa-0000-0000-0000-000000000000', '135ccccc-0000-0000-0000-000000000001',
   'search_adjusted', 'price', 'Budget plafond : 1 650 000 € → 1 579 000 €');
do $$
begin
  begin
    insert into public.buyer_events (agency_id, buyer_id, kind)
      values ('135aaaaa-0000-0000-0000-000000000000', '135ccccc-0000-0000-0000-000000000001', 'relaunch');
    raise exception 'FAIL 1: une relance sans sélection acceptée';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_events (agency_id, buyer_id, kind, reason)
      values ('135aaaaa-0000-0000-0000-000000000000', '135ccccc-0000-0000-0000-000000000001',
              'search_adjusted', 'price');
    raise exception 'FAIL 1: un ajustement sans résumé accepté';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_events (agency_id, buyer_id, kind, reason, summary)
      values ('135aaaaa-0000-0000-0000-000000000000', '135ccccc-0000-0000-0000-000000000001',
              'search_adjusted', 'other', 'x');
    raise exception 'FAIL 1: un ajustement pour « Autre » accepté';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_events (agency_id, buyer_id, kind, selection_id)
      values ('135aaaaa-0000-0000-0000-000000000000', '135ccccc-0000-0000-0000-000000000001',
              'ailleurs', '135eeeee-0000-0000-0000-000000000001');
    raise exception 'FAIL 1: un genre hors liste accepté';
  exception when check_violation then null;
  end;
end $$;

-- §2 — le premier partage gardé.
do $$
begin
  begin
    insert into public.buyer_events (agency_id, buyer_id, kind, selection_id)
      values ('135aaaaa-0000-0000-0000-000000000000', '135ccccc-0000-0000-0000-000000000001',
              'link_shared', '135eeeee-0000-0000-0000-000000000001');
    raise exception 'FAIL 2: un second partage de la même sélection accepté';
  exception when unique_violation then null;
  end;
end $$;

-- §3 — deux relances au plus.
insert into public.buyer_events (agency_id, buyer_id, kind, selection_id) values
  ('135aaaaa-0000-0000-0000-000000000000', '135ccccc-0000-0000-0000-000000000001', 'relaunch',
   '135eeeee-0000-0000-0000-000000000001');
insert into public.buyer_events (agency_id, buyer_id, kind, selection_id) values
  ('135aaaaa-0000-0000-0000-000000000000', '135ccccc-0000-0000-0000-000000000001', 'relaunch',
   '135eeeee-0000-0000-0000-000000000001');
do $$
begin
  begin
    insert into public.buyer_events (agency_id, buyer_id, kind, selection_id)
      values ('135aaaaa-0000-0000-0000-000000000000', '135ccccc-0000-0000-0000-000000000001',
              'relaunch', '135eeeee-0000-0000-0000-000000000001');
    raise exception 'FAIL 3: une troisième relance acceptée';
  exception when check_violation then null;
  end;
end $$;

-- §4 — l'agence et la fiche.
do $$
begin
  begin
    insert into public.buyer_events (agency_id, buyer_id, kind, selection_id)
      values ('135aaaaa-0000-0000-0000-000000000000', '135ccccc-0000-0000-0000-000000000003',
              'link_shared', '135eeeee-0000-0000-0000-000000000002');
    raise exception 'FAIL 4: la fiche d''une autre agence acceptée';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_events (agency_id, buyer_id, kind, selection_id)
      values ('135aaaaa-0000-0000-0000-000000000000', '135ccccc-0000-0000-0000-000000000001',
              'link_shared', '135eeeee-0000-0000-0000-000000000002');
    raise exception 'FAIL 4: la sélection d''une autre fiche acceptée';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_events (agency_id, buyer_id, kind, reason, summary, created_by)
      values ('135aaaaa-0000-0000-0000-000000000000', '135ccccc-0000-0000-0000-000000000001',
              'search_adjusted', 'surface', 'x', '13522222-2222-2222-2222-222222222222');
    raise exception 'FAIL 4: un auteur d''une autre agence accepté';
  exception when check_violation then null;
  end;
  begin
    update public.buyer_events set buyer_id = '135ccccc-0000-0000-0000-000000000003'
      where kind = 'search_adjusted';
    raise exception 'FAIL 4: un événement déplacé vers une autre agence';
  exception when check_violation then null;
  end;
end $$;

-- §5 — le navigateur.
do $$
begin
  if has_table_privilege('authenticated', 'public.buyer_events', 'insert')
     or has_table_privilege('authenticated', 'public.buyer_events', 'update')
     or has_table_privilege('authenticated', 'public.buyer_events', 'delete')
     or has_table_privilege('anon', 'public.buyer_events', 'select') then
    raise exception 'FAIL 5: le navigateur a un droit d''écriture, ou un anonyme lit';
  end if;
end $$;
select set_config('request.jwt.claims',
  '{"sub":"13511111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.buyer_events) <> 4 then
    raise exception 'FAIL 5: l''agence ne lit pas ses événements';
  end if;
end $$;
reset role;
select set_config('request.jwt.claims',
  '{"sub":"13522222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.buyer_events) <> 0 then
    raise exception 'FAIL 5: une autre agence lit les événements';
  end if;
end $$;
reset role;
select set_config('request.jwt.claims',
  '{"sub":"13533333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.buyer_events) <> 0 then
    raise exception 'FAIL 5: un membre retiré lit les événements';
  end if;
end $$;
reset role;

-- §6 — les suppressions.
delete from public.buyer_selections where id = '135eeeee-0000-0000-0000-000000000001';
do $$
begin
  if exists (select 1 from public.buyer_events where kind in ('link_shared', 'relaunch')) then
    raise exception 'FAIL 6: la sélection supprimée n''emporte pas ses partages et relances';
  end if;
  if not exists (select 1 from public.buyer_events where kind = 'search_adjusted') then
    raise exception 'FAIL 6: l''ajustement est parti avec la sélection';
  end if;
end $$;
delete from public.buyers where id = '135ccccc-0000-0000-0000-000000000001';
do $$
begin
  if exists (select 1 from public.buyer_events) then
    raise exception 'FAIL 6: la fiche supprimée n''emporte pas ses événements';
  end if;
end $$;

rollback;
