-- Mission 140 (partie A) — la langue du dossier vendeur, à la SOURCE DE VÉRITÉ :
--   §1 français par défaut, cinq langues, rien d'autre ;
--   §2 le conseiller de l'agence la change, Live commencé et dossier conclu compris (les réponses
--      restent) ; une autre agence et un membre retiré, non.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/langue_du_dossier.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values
  ('14111111-1111-1111-1111-111111111111'),
  ('14122222-2222-2222-2222-222222222222'),
  ('14133333-3333-3333-3333-333333333333');
insert into public.agencies (id, name) values
  ('141aaaaa-0000-0000-0000-000000000000', 'A141'),
  ('141bbbbb-0000-0000-0000-000000000000', 'B141');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('14111111-1111-1111-1111-111111111111', '141aaaaa-0000-0000-0000-000000000000',
   'Al', 'A', 'a141@t.l', 'advisor'),
  ('14122222-2222-2222-2222-222222222222', '141bbbbb-0000-0000-0000-000000000000',
   'Bo', 'B', 'b141@t.l', 'advisor');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, removed_at) values
  ('14133333-3333-3333-3333-333333333333', '141aaaaa-0000-0000-0000-000000000000',
   'Ré', 'R', 'r141@t.l', 'advisor', now());
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('141ccccc-0000-0000-0000-000000000001', '141aaaaa-0000-0000-0000-000000000000',
   '14111111-1111-1111-1111-111111111111', 'Bernard', 'ready_for_meeting');
insert into public.comparables (id, agency_id, project_id, title, price, surface_area, is_selected, display_order) values
  ('141dddd0-0000-0000-0000-000000000001', '141aaaaa-0000-0000-0000-000000000000',
   '141ccccc-0000-0000-0000-000000000001', 'c1', 300000, 60, true, 0);

-- §1 — le défaut et la liste.
do $$
begin
  if (select language from public.projects where id = '141ccccc-0000-0000-0000-000000000001') <> 'fr' then
    raise exception 'FAIL 1: la langue n''est pas le français par défaut';
  end if;
  begin
    update public.projects set language = 'es' where id = '141ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 1: une langue hors liste est acceptée';
  exception when check_violation then null;
  end;
  begin
    update public.projects set language = null where id = '141ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 1: un dossier sans langue est accepté';
  exception when not_null_violation then null;
  end;
end $$;

-- Le Live commencé : une réponse du vendeur.
insert into public.live_seller_responses (agency_id, project_id, comparable_id, seller_serious_competitor)
values ('141aaaaa-0000-0000-0000-000000000000', '141ccccc-0000-0000-0000-000000000001',
        '141dddd0-0000-0000-0000-000000000001', 'yes');

-- §2 — qui la change.
select set_config('request.jwt.claims',
  '{"sub":"14122222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
update public.projects set language = 'en' where id = '141ccccc-0000-0000-0000-000000000001';
reset role;
do $$
begin
  if (select language from public.projects where id = '141ccccc-0000-0000-0000-000000000001') <> 'fr' then
    raise exception 'FAIL 2: une autre agence change la langue';
  end if;
end $$;
select set_config('request.jwt.claims',
  '{"sub":"14133333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;
update public.projects set language = 'en' where id = '141ccccc-0000-0000-0000-000000000001';
reset role;
do $$
begin
  if (select language from public.projects where id = '141ccccc-0000-0000-0000-000000000001') <> 'fr' then
    raise exception 'FAIL 2: un membre retiré change la langue';
  end if;
end $$;
select set_config('request.jwt.claims',
  '{"sub":"14111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
-- Live commencé : la langue change, la réponse reste.
update public.projects set language = 'en' where id = '141ccccc-0000-0000-0000-000000000001';
reset role;
do $$
begin
  if (select language from public.projects where id = '141ccccc-0000-0000-0000-000000000001') <> 'en' then
    raise exception 'FAIL 2: le conseiller de l''agence ne change pas la langue pendant le Live';
  end if;
  if (select count(*) from public.live_seller_responses
      where project_id = '141ccccc-0000-0000-0000-000000000001') <> 1 then
    raise exception 'FAIL 2: changer la langue efface une réponse';
  end if;
  update public.projects set status = 'meeting_completed'
  where id = '141ccccc-0000-0000-0000-000000000001';
end $$;
select set_config('request.jwt.claims',
  '{"sub":"14111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
-- Dossier conclu : la langue change encore (les documents d'après).
update public.projects set language = 'fr' where id = '141ccccc-0000-0000-0000-000000000001';
reset role;
do $$
begin
  if (select language from public.projects where id = '141ccccc-0000-0000-0000-000000000001') <> 'fr' then
    raise exception 'FAIL 2: la langue d''un dossier conclu ne change pas';
  end if;
end $$;

rollback;
