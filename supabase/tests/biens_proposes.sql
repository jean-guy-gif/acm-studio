-- Mission 134 — les biens proposés à un acquéreur, à la SOURCE DE VÉRITÉ :
--   §1 un envoi s'écrit par le serveur ; l'heure est celle de la base, quelle que soit celle envoyée ;
--   §2 une fois par acquéreur et par bien (unicité), la première date gardée même en mise à jour ;
--   §3 les listes (source, origine) ;
--   §4 l'agence de la fiche, du dossier et de l'auteur, la ligne de sélection de cette fiche, sont
--      vérifiées, à l'insertion comme à la mise à jour ;
--   §5 le navigateur lit son agence et n'écrit rien ; une autre agence et un membre retiré ne
--      lisent rien ;
--   §6 la ligne de sélection supprimée laisse l'envoi ; le dossier supprimé emporte ses envois ; la
--      fiche supprimée les emporte, sa ligne de sélection encore là (« Remettre ma démo à zéro »).
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/biens_proposes.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values
  ('13411111-1111-1111-1111-111111111111'),
  ('13422222-2222-2222-2222-222222222222'),
  ('13433333-3333-3333-3333-333333333333');
insert into public.agencies (id, name) values
  ('134aaaaa-0000-0000-0000-000000000000', 'A134'),
  ('134bbbbb-0000-0000-0000-000000000000', 'B134');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('13411111-1111-1111-1111-111111111111', '134aaaaa-0000-0000-0000-000000000000',
   'Al', 'A', 'a134@t.l', 'advisor'),
  ('13422222-2222-2222-2222-222222222222', '134bbbbb-0000-0000-0000-000000000000',
   'Bo', 'B', 'b134@t.l', 'advisor');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, removed_at) values
  ('13433333-3333-3333-3333-333333333333', '134aaaaa-0000-0000-0000-000000000000',
   'Ré', 'R', 'r134@t.l', 'advisor', now());
insert into public.buyers (id, agency_id, advisor_id, name, cities) values
  ('134ccccc-0000-0000-0000-000000000001', '134aaaaa-0000-0000-0000-000000000000',
   '13411111-1111-1111-1111-111111111111', 'Famille Test', array['Vence']),
  ('134ccccc-0000-0000-0000-000000000002', '134bbbbb-0000-0000-0000-000000000000',
   '13422222-2222-2222-2222-222222222222', 'Autre agence', array['Vence']),
  ('134ccccc-0000-0000-0000-000000000003', '134aaaaa-0000-0000-0000-000000000000',
   '13411111-1111-1111-1111-111111111111', 'Autre fiche', array['Vence']);
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('134ddddd-0000-0000-0000-000000000001', '134aaaaa-0000-0000-0000-000000000000',
   '13411111-1111-1111-1111-111111111111', 'Bernard', 'ready_for_meeting'),
  ('134ddddd-0000-0000-0000-000000000002', '134bbbbb-0000-0000-0000-000000000000',
   '13422222-2222-2222-2222-222222222222', 'Ailleurs', 'ready_for_meeting');
insert into public.buyer_selections (id, agency_id, buyer_id) values
  ('134eeeee-0000-0000-0000-000000000001', '134aaaaa-0000-0000-0000-000000000000',
   '134ccccc-0000-0000-0000-000000000001'),
  ('134eeeee-0000-0000-0000-000000000003', '134aaaaa-0000-0000-0000-000000000000',
   '134ccccc-0000-0000-0000-000000000003');
insert into public.buyer_selection_items (id, agency_id, selection_id, position, source, reference, label) values
  ('134fffff-0000-0000-0000-000000000001', '134aaaaa-0000-0000-0000-000000000000',
   '134eeeee-0000-0000-0000-000000000001', 1, 'listing', 'https://exemple.invalid/a', 'Maison · Vence'),
  ('134fffff-0000-0000-0000-000000000003', '134aaaaa-0000-0000-0000-000000000000',
   '134eeeee-0000-0000-0000-000000000003', 1, 'listing', 'https://exemple.invalid/a', 'Maison · Vence');

-- §1 — l'heure de la base.
insert into public.buyer_proposals
  (agency_id, buyer_id, property_key, source, reference, project_id, origin, label, selection_item_id, sent_at, sent_by)
values
  ('134aaaaa-0000-0000-0000-000000000000', '134ccccc-0000-0000-0000-000000000001',
   'listing:exemple:1', 'listing', 'https://exemple.invalid/a', '134ddddd-0000-0000-0000-000000000001',
   'competitor', 'Maison · 5 pièces · 140 m² · Vence', '134fffff-0000-0000-0000-000000000001',
   '2020-01-01 00:00:00+00', '13411111-1111-1111-1111-111111111111');
do $$
begin
  if (select sent_at from public.buyer_proposals where property_key = 'listing:exemple:1') <> now() then
    raise exception 'FAIL 1: l''heure envoyée n''est pas remplacée par celle de la base';
  end if;
end $$;

-- §2 — une fois ; la date gardée.
do $$
begin
  begin
    insert into public.buyer_proposals (agency_id, buyer_id, property_key, source, reference, origin, label)
      values ('134aaaaa-0000-0000-0000-000000000000', '134ccccc-0000-0000-0000-000000000001',
              'listing:exemple:1', 'listing', 'https://exemple.invalid/a', 'competitor', 'Maison');
    raise exception 'FAIL 2: le même bien proposé deux fois au même acquéreur';
  exception when unique_violation then null;
  end;
end $$;
update public.buyer_proposals set sent_at = '2021-01-01 00:00:00+00'
  where property_key = 'listing:exemple:1';
do $$
begin
  if (select sent_at from public.buyer_proposals where property_key = 'listing:exemple:1') <> now() then
    raise exception 'FAIL 2: la date d''envoi a été réécrite';
  end if;
end $$;

-- §3 — les listes.
do $$
begin
  begin
    insert into public.buyer_proposals (agency_id, buyer_id, property_key, source, reference, origin, label)
      values ('134aaaaa-0000-0000-0000-000000000000', '134ccccc-0000-0000-0000-000000000001',
              'listing:exemple:2', 'prospect', 'x', 'competitor', 'Maison');
    raise exception 'FAIL 3: une source hors liste acceptée';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_proposals (agency_id, buyer_id, property_key, source, reference, origin, label)
      values ('134aaaaa-0000-0000-0000-000000000000', '134ccccc-0000-0000-0000-000000000001',
              'listing:exemple:3', 'listing', 'x', 'ailleurs', 'Maison');
    raise exception 'FAIL 3: une origine hors liste acceptée';
  exception when check_violation then null;
  end;
end $$;

-- §4 — l'agence de la fiche et du dossier.
do $$
begin
  begin
    insert into public.buyer_proposals (agency_id, buyer_id, property_key, source, reference, origin, label)
      values ('134aaaaa-0000-0000-0000-000000000000', '134ccccc-0000-0000-0000-000000000002',
              'listing:exemple:4', 'listing', 'x', 'competitor', 'Maison');
    raise exception 'FAIL 4: la fiche d''une autre agence acceptée';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_proposals (agency_id, buyer_id, property_key, source, reference, project_id, origin, label)
      values ('134aaaaa-0000-0000-0000-000000000000', '134ccccc-0000-0000-0000-000000000001',
              'project:134ddddd-0000-0000-0000-000000000002', 'project',
              '134ddddd-0000-0000-0000-000000000002', '134ddddd-0000-0000-0000-000000000002',
              'mandate', 'Maison');
    raise exception 'FAIL 4: le dossier d''une autre agence accepté';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_proposals (agency_id, buyer_id, property_key, source, reference, origin, label, selection_item_id)
      values ('134aaaaa-0000-0000-0000-000000000000', '134ccccc-0000-0000-0000-000000000001',
              'listing:exemple:5', 'listing', 'x', 'competitor', 'Maison',
              '134fffff-0000-0000-0000-000000000003');
    raise exception 'FAIL 4: la ligne de sélection d''une autre fiche acceptée';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_proposals (agency_id, buyer_id, property_key, source, reference, origin, label, sent_by)
      values ('134aaaaa-0000-0000-0000-000000000000', '134ccccc-0000-0000-0000-000000000001',
              'listing:exemple:6', 'listing', 'x', 'competitor', 'Maison',
              '13422222-2222-2222-2222-222222222222');
    raise exception 'FAIL 4: un auteur d''une autre agence accepté';
  exception when check_violation then null;
  end;
  -- Déplacer l'envoi vers une fiche d'une autre agence, ou changer son agence : refusé.
  begin
    update public.buyer_proposals set buyer_id = '134ccccc-0000-0000-0000-000000000002'
      where property_key = 'listing:exemple:1';
    raise exception 'FAIL 4: l''envoi déplacé vers la fiche d''une autre agence';
  exception when check_violation then null;
  end;
  begin
    update public.buyer_proposals set agency_id = '134bbbbb-0000-0000-0000-000000000000'
      where property_key = 'listing:exemple:1';
    raise exception 'FAIL 4: l''agence de l''envoi changée';
  exception when check_violation then null;
  end;
end $$;

-- §5 — le navigateur.
do $$
begin
  if has_table_privilege('authenticated', 'public.buyer_proposals', 'insert')
     or has_table_privilege('authenticated', 'public.buyer_proposals', 'update')
     or has_table_privilege('authenticated', 'public.buyer_proposals', 'delete')
     or has_table_privilege('anon', 'public.buyer_proposals', 'select') then
    raise exception 'FAIL 5: le navigateur a un droit d''écriture, ou un anonyme lit';
  end if;
end $$;
select set_config('request.jwt.claims',
  '{"sub":"13411111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.buyer_proposals) <> 1 then
    raise exception 'FAIL 5: l''agence ne lit pas ses biens proposés';
  end if;
end $$;
reset role;
select set_config('request.jwt.claims',
  '{"sub":"13422222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.buyer_proposals) <> 0 then
    raise exception 'FAIL 5: une autre agence lit les biens proposés';
  end if;
end $$;
reset role;
select set_config('request.jwt.claims',
  '{"sub":"13433333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.buyer_proposals) <> 0 then
    raise exception 'FAIL 5: un membre retiré lit les biens proposés';
  end if;
end $$;
reset role;

-- §6 — la ligne de sélection supprimée laisse l'envoi ; la fiche supprimée l'emporte.
delete from public.buyer_selection_items where id = '134fffff-0000-0000-0000-000000000001';
do $$
begin
  if (select selection_item_id from public.buyer_proposals where property_key = 'listing:exemple:1') is not null then
    raise exception 'FAIL 6: la ligne de sélection supprimée n''est pas vidée';
  end if;
end $$;
-- Le dossier supprimé emporte ses envois.
insert into public.buyer_proposals (agency_id, buyer_id, property_key, source, reference, project_id, origin, label)
  values ('134aaaaa-0000-0000-0000-000000000000', '134ccccc-0000-0000-0000-000000000001',
          'project:134ddddd-0000-0000-0000-000000000001', 'project',
          '134ddddd-0000-0000-0000-000000000001', '134ddddd-0000-0000-0000-000000000001',
          'mandate', 'Maison · Vence');
delete from public.projects where id = '134ddddd-0000-0000-0000-000000000001';
do $$
begin
  if exists (select 1 from public.buyer_proposals where property_key like 'project:%') then
    raise exception 'FAIL 6: le dossier supprimé n''emporte pas ses envois';
  end if;
end $$;
-- La fiche supprimée, sa ligne de sélection encore là, emporte ses envois.
insert into public.buyer_proposals (agency_id, buyer_id, property_key, source, reference, origin, label, selection_item_id)
  values ('134aaaaa-0000-0000-0000-000000000000', '134ccccc-0000-0000-0000-000000000003',
          'listing:exemple:7', 'listing', 'x', 'competitor', 'Maison',
          '134fffff-0000-0000-0000-000000000003');
delete from public.buyers where id in ('134ccccc-0000-0000-0000-000000000001', '134ccccc-0000-0000-0000-000000000003');
do $$
begin
  if exists (select 1 from public.buyer_proposals) then
    raise exception 'FAIL 6: la fiche supprimée n''emporte pas ses envois';
  end if;
end $$;

rollback;
