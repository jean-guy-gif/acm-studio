-- Mission 139 — après la visite, à la SOURCE DE VÉRITÉ :
--   §1 la langue du client : français par défaut, cinq langues ;
--   §2 le compte rendu : seulement d'une visite faite, des étiquettes de la liste, « Offre
--      envisagée » ⇔ l'issue 'offer' (l'offre d'achat, M137 B, la lit) ;
--   §3 le bien écarté : une fois par fiche et par bien, la fiche et l'auteur de l'agence, l'heure de
--      la base, jamais modifié (sauf l'auteur vidé par la suppression de son compte) ;
--   §4 le point de la semaine (un lundi, une fois par semaine) et le point proposé ;
--   §5 le navigateur lit son agence et n'écrit rien ; une autre agence et un membre retiré ne lisent
--      rien ; le bien écarté part avec la fiche.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/apres_la_visite.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values
  ('14011111-1111-1111-1111-111111111111'),
  ('14022222-2222-2222-2222-222222222222'),
  ('14033333-3333-3333-3333-333333333333'),
  ('14044444-4444-4444-4444-444444444444');
insert into public.agencies (id, name) values
  ('140aaaaa-0000-0000-0000-000000000000', 'A140'),
  ('140bbbbb-0000-0000-0000-000000000000', 'B140');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('14011111-1111-1111-1111-111111111111', '140aaaaa-0000-0000-0000-000000000000',
   'Al', 'A', 'a140@t.l', 'manager'),
  ('14044444-4444-4444-4444-444444444444', '140aaaaa-0000-0000-0000-000000000000',
   'Cé', 'C', 'c140@t.l', 'advisor'),
  ('14022222-2222-2222-2222-222222222222', '140bbbbb-0000-0000-0000-000000000000',
   'Bo', 'B', 'b140@t.l', 'advisor');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, removed_at) values
  ('14033333-3333-3333-3333-333333333333', '140aaaaa-0000-0000-0000-000000000000',
   'Ré', 'R', 'r140@t.l', 'advisor', now());
insert into public.buyers (id, agency_id, advisor_id, name, cities) values
  ('140ccccc-0000-0000-0000-000000000001', '140aaaaa-0000-0000-0000-000000000000',
   '14011111-1111-1111-1111-111111111111', 'Famille Test', array['Mougins']);
insert into public.buyer_selections (id, agency_id, buyer_id) values
  ('140ddddd-0000-0000-0000-000000000001', '140aaaaa-0000-0000-0000-000000000000',
   '140ccccc-0000-0000-0000-000000000001');
insert into public.buyer_selection_items (id, agency_id, selection_id, position, source, reference, label) values
  ('140eeeee-0000-0000-0000-000000000001', '140aaaaa-0000-0000-0000-000000000000',
   '140ddddd-0000-0000-0000-000000000001', 1, 'listing', 'https://exemple.invalid/a',
   'Maison · Mougins');
insert into public.buyer_visit_requests
  (id, agency_id, buyer_id, buyer_selection_item_id, requested_during) values
  ('140fffff-0000-0000-0000-000000000001', '140aaaaa-0000-0000-0000-000000000000',
   '140ccccc-0000-0000-0000-000000000001', '140eeeee-0000-0000-0000-000000000001', 'presentation'),
  ('140fffff-0000-0000-0000-000000000002', '140aaaaa-0000-0000-0000-000000000000',
   '140ccccc-0000-0000-0000-000000000001', '140eeeee-0000-0000-0000-000000000001', 'conseiller');

-- §1 — la langue.
do $$
begin
  if (select language from public.buyers where id = '140ccccc-0000-0000-0000-000000000001') <> 'fr' then
    raise exception 'FAIL 1: la langue n''est pas le français par défaut';
  end if;
  update public.buyers set language = 'ru' where id = '140ccccc-0000-0000-0000-000000000001';
  begin
    update public.buyers set language = 'es' where id = '140ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 1: une langue hors liste est acceptée';
  exception when check_violation then null;
  end;
end $$;

-- §2 — le compte rendu.
do $$
begin
  begin
    update public.buyer_visit_requests set opinion = 'love'
    where id = '140fffff-0000-0000-0000-000000000001';
    raise exception 'FAIL 2: un avis sur une visite pas faite est accepté';
  exception when check_violation then null;
  end;
  begin
    update public.buyer_visit_requests
    set visited_at = now(), outcome = 'visited', opinion = 'interested', liked = array['pool', 'garage']
    where id = '140fffff-0000-0000-0000-000000000001';
    raise exception 'FAIL 2: une étiquette hors liste est acceptée';
  exception when check_violation then null;
  end;
  begin
    update public.buyer_visit_requests
    set visited_at = now(), outcome = 'visited', opinion = 'interested', disliked = array['vue']
    where id = '140fffff-0000-0000-0000-000000000001';
    raise exception 'FAIL 2: une étiquette déplue hors liste est acceptée';
  exception when check_violation then null;
  end;
  begin
    update public.buyer_visit_requests
    set visited_at = now(), outcome = 'visited', opinion = 'love', next_step = 'offer'
    where id = '140fffff-0000-0000-0000-000000000001';
    raise exception 'FAIL 2: « Offre envisagée » sans l''issue offre est accepté';
  exception when check_violation then null;
  end;
  begin
    update public.buyer_visit_requests
    set visited_at = now(), outcome = 'offer', opinion = 'love', next_step = 'keep_searching'
    where id = '140fffff-0000-0000-0000-000000000001';
    raise exception 'FAIL 2: l''issue offre sans « Offre envisagée » est acceptée';
  exception when check_violation then null;
  end;
  begin
    update public.buyer_visit_requests
    set visited_at = now(), outcome = 'visited', opinion = 'bof'
    where id = '140fffff-0000-0000-0000-000000000001';
    raise exception 'FAIL 2: un avis hors liste est accepté';
  exception when check_violation then null;
  end;
  update public.buyer_visit_requests
  set visited_at = now(), outcome = 'offer', opinion = 'interested',
      liked = array['pool', 'outdoor'], disliked = array['price'], next_step = 'offer',
      feedback = 'Ils reviennent avec leurs parents.'
  where id = '140fffff-0000-0000-0000-000000000001';
  -- Une visite d'avant la mission : faite, sans compte rendu, reste valable.
  update public.buyer_visit_requests set visited_at = now(), outcome = 'visited'
  where id = '140fffff-0000-0000-0000-000000000002';
end $$;

-- §3 — le bien écarté.
do $$
declare
  v_at timestamptz;
begin
  begin
    insert into public.buyer_dismissals (agency_id, buyer_id, property_key, label, reason, dismissed_by)
    values ('140bbbbb-0000-0000-0000-000000000000', '140ccccc-0000-0000-0000-000000000001',
            'listing:seloger:1', 'Maison · Mougins', 'parking', '14022222-2222-2222-2222-222222222222');
    raise exception 'FAIL 3: un bien écarté d''une autre agence est accepté';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_dismissals (agency_id, buyer_id, property_key, label, reason, dismissed_by)
    values ('140aaaaa-0000-0000-0000-000000000000', '140ccccc-0000-0000-0000-000000000001',
            'listing:seloger:1', 'Maison · Mougins', 'parking', '14022222-2222-2222-2222-222222222222');
    raise exception 'FAIL 3: un auteur d''une autre agence est accepté';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_dismissals (agency_id, buyer_id, property_key, label, reason, dismissed_by)
    values ('140aaaaa-0000-0000-0000-000000000000', '140ccccc-0000-0000-0000-000000000001',
            'listing:seloger:1', 'Maison · Mougins', 'parking', null);
    raise exception 'FAIL 3: un bien écarté sans auteur est accepté';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_dismissals (agency_id, buyer_id, property_key, label, reason, dismissed_by)
    values ('140aaaaa-0000-0000-0000-000000000000', '140ccccc-0000-0000-0000-000000000001',
            'listing:seloger:1', 'Maison · Mougins', 'vue', '14011111-1111-1111-1111-111111111111');
    raise exception 'FAIL 3: une raison hors liste est acceptée';
  exception when check_violation then null;
  end;
  insert into public.buyer_dismissals
    (agency_id, buyer_id, property_key, label, reason, dismissed_by, dismissed_at)
  values ('140aaaaa-0000-0000-0000-000000000000', '140ccccc-0000-0000-0000-000000000001',
          'listing:seloger:1', 'Maison · Mougins', 'parking', '14011111-1111-1111-1111-111111111111',
          now() - interval '9 days');
  insert into public.buyer_dismissals (agency_id, buyer_id, property_key, label, reason, dismissed_by)
  values ('140aaaaa-0000-0000-0000-000000000000', '140ccccc-0000-0000-0000-000000000001',
          'listing:bienici:2', 'Maison · Valbonne', 'over_budget',
          '14044444-4444-4444-4444-444444444444');
  -- La date n'est pas forcée (la démo date les siens, comme `buyer_events.occurred_at`) ; sans date
  -- envoyée, l'heure de la base.
  select dismissed_at into v_at from public.buyer_dismissals where property_key = 'listing:bienici:2';
  if v_at < now() - interval '1 minute' then
    raise exception 'FAIL 3: un bien écarté sans date n''a pas l''heure de la base';
  end if;
  begin
    insert into public.buyer_dismissals (agency_id, buyer_id, property_key, label, reason, dismissed_by)
    values ('140aaaaa-0000-0000-0000-000000000000', '140ccccc-0000-0000-0000-000000000001',
            'listing:seloger:1', 'Maison · Mougins', 'sector', '14011111-1111-1111-1111-111111111111');
    raise exception 'FAIL 3: un même bien écarté deux fois est accepté';
  exception when unique_violation then null;
  end;
  begin
    update public.buyer_dismissals set reason = 'sector' where property_key = 'listing:seloger:1';
    raise exception 'FAIL 3: la raison d''un bien écarté se modifie';
  exception when check_violation then null;
  end;
  begin
    update public.buyer_dismissals set dismissed_by = null where property_key = 'listing:seloger:1';
    raise exception 'FAIL 3: l''auteur d''un bien écarté se vide à la main';
  exception when check_violation then null;
  end;
  -- L'auteur supprimé : vidé par la base ; « Annuler » (le serveur supprime) reste possible.
  delete from public.profiles where id = '14044444-4444-4444-4444-444444444444';
  if (select dismissed_by from public.buyer_dismissals where property_key = 'listing:bienici:2')
     is not null then
    raise exception 'FAIL 3: la suppression du compte n''a pas vidé l''auteur';
  end if;
  delete from public.buyer_dismissals where property_key = 'listing:bienici:2';
end $$;

-- §4 — le point de la semaine et le point proposé.
do $$
declare
  v_monday date := date_trunc('week', (now() at time zone 'Europe/Paris'))::date;
begin
  begin
    insert into public.buyer_events (agency_id, buyer_id, kind, created_by)
    values ('140aaaaa-0000-0000-0000-000000000000', '140ccccc-0000-0000-0000-000000000001',
            'weekly_report', '14011111-1111-1111-1111-111111111111');
    raise exception 'FAIL 4: un point de la semaine sans semaine est accepté';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_events (agency_id, buyer_id, kind, week_start, created_by)
    values ('140aaaaa-0000-0000-0000-000000000000', '140ccccc-0000-0000-0000-000000000001',
            'weekly_report', v_monday + 2, '14011111-1111-1111-1111-111111111111');
    raise exception 'FAIL 4: une semaine qui ne commence pas un lundi est acceptée';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_events (agency_id, buyer_id, kind, week_start, selection_id, created_by)
    values ('140aaaaa-0000-0000-0000-000000000000', '140ccccc-0000-0000-0000-000000000001',
            'weekly_report', v_monday, '140ddddd-0000-0000-0000-000000000001',
            '14011111-1111-1111-1111-111111111111');
    raise exception 'FAIL 4: un point de la semaine avec une sélection est accepté';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_events (agency_id, buyer_id, kind, week_start, created_by)
    values ('140aaaaa-0000-0000-0000-000000000000', '140ccccc-0000-0000-0000-000000000001',
            'meeting_proposed', v_monday, '14011111-1111-1111-1111-111111111111');
    raise exception 'FAIL 4: un point proposé avec une semaine est accepté';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_events (agency_id, buyer_id, kind, week_start, created_by)
    values ('140aaaaa-0000-0000-0000-000000000000', '140ccccc-0000-0000-0000-000000000001',
            'relaunch', v_monday, '14011111-1111-1111-1111-111111111111');
    raise exception 'FAIL 4: une semaine sur un autre genre est acceptée';
  exception when check_violation then null;
  end;
  insert into public.buyer_events (agency_id, buyer_id, kind, week_start, created_by)
  values ('140aaaaa-0000-0000-0000-000000000000', '140ccccc-0000-0000-0000-000000000001',
          'weekly_report', v_monday, '14011111-1111-1111-1111-111111111111'),
         ('140aaaaa-0000-0000-0000-000000000000', '140ccccc-0000-0000-0000-000000000001',
          'weekly_report', v_monday - 7, '14011111-1111-1111-1111-111111111111');
  insert into public.buyer_events (agency_id, buyer_id, kind, created_by)
  values ('140aaaaa-0000-0000-0000-000000000000', '140ccccc-0000-0000-0000-000000000001',
          'meeting_proposed', '14011111-1111-1111-1111-111111111111'),
         ('140aaaaa-0000-0000-0000-000000000000', '140ccccc-0000-0000-0000-000000000001',
          'meeting_proposed', '14011111-1111-1111-1111-111111111111');
  begin
    insert into public.buyer_events (agency_id, buyer_id, kind, week_start, created_by)
    values ('140aaaaa-0000-0000-0000-000000000000', '140ccccc-0000-0000-0000-000000000001',
            'weekly_report', v_monday, '14011111-1111-1111-1111-111111111111');
    raise exception 'FAIL 4: deux points pour la même semaine sont acceptés';
  exception when unique_violation then null;
  end;
  begin
    update public.buyer_events set week_start = v_monday - 14
    where kind = 'weekly_report' and week_start = v_monday;
    raise exception 'FAIL 4: la semaine d''un point se déplace';
  exception when check_violation then null;
  end;
  -- Les genres d'avant restent valables.
  insert into public.buyer_events (agency_id, buyer_id, kind, selection_id, created_by)
  values ('140aaaaa-0000-0000-0000-000000000000', '140ccccc-0000-0000-0000-000000000001',
          'link_shared', '140ddddd-0000-0000-0000-000000000001',
          '14011111-1111-1111-1111-111111111111');
end $$;

-- §6 — le dernier membre d'une agence supprimé, ses fiches et leurs envois notés avec lui (la
-- fermeture d'une agence) : la base ne refuse rien (gardien-sql ; le défaut datait de la M135).
do $$
begin
  insert into public.agencies (id, name) values ('140ccccc-9999-0000-0000-000000000000', 'C140');
  insert into auth.users (id) values ('14055555-5555-5555-5555-555555555555');
  insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
    ('14055555-5555-5555-5555-555555555555', '140ccccc-9999-0000-0000-000000000000',
     'Dé', 'D', 'd140@t.l', 'manager');
  insert into public.buyers (id, agency_id, advisor_id, name, cities) values
    ('140ccccc-9999-0000-0000-000000000001', '140ccccc-9999-0000-0000-000000000000',
     '14055555-5555-5555-5555-555555555555', 'Seule fiche', array['Vence']);
  insert into public.buyer_events (agency_id, buyer_id, kind, week_start, created_by)
  values ('140ccccc-9999-0000-0000-000000000000', '140ccccc-9999-0000-0000-000000000001',
          'weekly_report', date_trunc('week', (now() at time zone 'Europe/Paris'))::date,
          '14055555-5555-5555-5555-555555555555');
  delete from public.profiles where id = '14055555-5555-5555-5555-555555555555';
  if exists (select 1 from public.buyer_events where buyer_id = '140ccccc-9999-0000-0000-000000000001'
             and created_by is not null) then
    raise exception 'FAIL 6: l''envoi garde l''auteur supprimé';
  end if;
  delete from public.agencies where id = '140ccccc-9999-0000-0000-000000000000';
end $$;

-- §5 — le navigateur.
do $$
begin
  if has_table_privilege('authenticated', 'public.buyer_dismissals', 'insert')
     or has_table_privilege('authenticated', 'public.buyer_dismissals', 'update')
     or has_table_privilege('authenticated', 'public.buyer_dismissals', 'delete')
     or has_any_column_privilege('authenticated', 'public.buyer_dismissals', 'insert')
     or has_any_column_privilege('authenticated', 'public.buyer_dismissals', 'update')
     or has_table_privilege('anon', 'public.buyer_dismissals', 'select') then
    raise exception 'FAIL 5: le navigateur écrit un bien écarté, ou un anonyme le lit';
  end if;
  if has_any_column_privilege('authenticated', 'public.buyers', 'update')
     or has_any_column_privilege('authenticated', 'public.buyer_visit_requests', 'update')
     or has_any_column_privilege('authenticated', 'public.buyer_events', 'insert') then
    raise exception 'FAIL 5: le navigateur écrit la langue, un compte rendu ou un envoi';
  end if;
  if has_function_privilege('authenticated', 'public.check_buyer_dismissal()', 'execute')
     or has_function_privilege('anon', 'public.check_buyer_dismissal()', 'execute') then
    raise exception 'FAIL 5: la fonction du déclencheur est ouverte au navigateur';
  end if;
end $$;
select set_config('request.jwt.claims',
  '{"sub":"14011111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.buyer_dismissals) <> 1 then
    raise exception 'FAIL 5: l''agence ne lit pas ses biens écartés';
  end if;
end $$;
reset role;
select set_config('request.jwt.claims',
  '{"sub":"14022222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.buyer_dismissals) <> 0 then
    raise exception 'FAIL 5: une autre agence lit les biens écartés';
  end if;
end $$;
reset role;
select set_config('request.jwt.claims',
  '{"sub":"14033333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.buyer_dismissals) <> 0 then
    raise exception 'FAIL 5: un membre retiré lit les biens écartés';
  end if;
end $$;
reset role;
do $$
begin
  delete from public.buyers where id = '140ccccc-0000-0000-0000-000000000001';
  if (select count(*) from public.buyer_dismissals) <> 0 then
    raise exception 'FAIL 5: un bien écarté survit à sa fiche';
  end if;
end $$;

rollback;
