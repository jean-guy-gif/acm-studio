-- Mission 131 — la présentation directe, à la SOURCE DE VÉRITÉ :
--   §1 un dossier est en Live interactif par défaut ;
--   §2 « montré en directe » est refusé hors du mode direct ;
--   §3 en directe, il fige le prix révélé, ne se vide ni ne se réécrit, et une devinette ensuite
--      est ignorée ; jamais avec une devinette (prix ou durée) ; sans prix ce jour-là, il ne se
--      fige pas un autre jour ;
--   §4 refusé sur un concurrent déjà deviné ou écarté par « Non » ; revenir à l'interactif garde
--      ce qui a été montré et accepte une devinette ailleurs ;
--   §5 « document seul » refusé une fois le Live commencé ; le mode ne change plus après la
--      conclusion ;
--   §5 bis le rattachement est lu sur l'ancien dossier : changer `project_id` ne pose ni le fait
--      ni le plus proche sur un autre dossier de l'agence ;
--   §6 le plus proche (conseiller) : un concurrent du dossier seulement ; sur un dossier conclu, ni
--      vidé ni changé à la main, mais vidé — avec le plus dangereux — quand il est supprimé ;
--   §7 les liens de l'Étude : rien depuis le navigateur (ni écrire, ni modifier, ni supprimer),
--      lus par l'agence, ni par un membre retiré, ni par une autre agence, ni par un anonyme ;
--   §8 la démo accepte l'étape « direct ».
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/presentation_directe.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values
  ('13111111-1111-1111-1111-111111111111'),
  ('13122222-2222-2222-2222-222222222222'),
  ('13133333-3333-3333-3333-333333333333');
insert into public.agencies (id, name) values
  ('131aaaaa-0000-0000-0000-000000000000', 'A131'),
  ('131bbbbb-0000-0000-0000-000000000000', 'B131');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('13111111-1111-1111-1111-111111111111', '131aaaaa-0000-0000-0000-000000000000',
   'Al', 'A', 'a131@t.l', 'advisor'),
  ('13122222-2222-2222-2222-222222222222', '131bbbbb-0000-0000-0000-000000000000',
   'Bo', 'B', 'b131@t.l', 'advisor');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, removed_at) values
  ('13133333-3333-3333-3333-333333333333', '131aaaaa-0000-0000-0000-000000000000',
   'Ré', 'R', 'r131@t.l', 'advisor', now());
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('131ccccc-0000-0000-0000-000000000001', '131aaaaa-0000-0000-0000-000000000000',
   '13111111-1111-1111-1111-111111111111', 'direct', 'ready_for_meeting'),
  ('131ccccc-0000-0000-0000-000000000002', '131aaaaa-0000-0000-0000-000000000000',
   '13111111-1111-1111-1111-111111111111', 'autre', 'ready_for_meeting');
insert into public.comparables (id, agency_id, project_id, title, price, surface_area, is_selected, display_order) values
  ('131dddd0-0000-0000-0000-000000000001', '131aaaaa-0000-0000-0000-000000000000',
   '131ccccc-0000-0000-0000-000000000001', 'c1', 300000, 60, true, 0),
  ('131dddd0-0000-0000-0000-000000000002', '131aaaaa-0000-0000-0000-000000000000',
   '131ccccc-0000-0000-0000-000000000001', 'c2', 320000, 62, true, 1),
  ('131dddd0-0000-0000-0000-000000000003', '131aaaaa-0000-0000-0000-000000000000',
   '131ccccc-0000-0000-0000-000000000001', 'c3', 340000, 64, true, 2),
  ('131dddd0-0000-0000-0000-000000000004', '131aaaaa-0000-0000-0000-000000000000',
   '131ccccc-0000-0000-0000-000000000001', 'c4 sans prix', null, 65, true, 3),
  ('131dddd0-0000-0000-0000-000000000005', '131aaaaa-0000-0000-0000-000000000000',
   '131ccccc-0000-0000-0000-000000000001', 'c5', 360000, 66, true, 4),
  ('131dddd0-0000-0000-0000-000000000009', '131aaaaa-0000-0000-0000-000000000000',
   '131ccccc-0000-0000-0000-000000000002', 'autre', 310000, 61, true, 0);

-- §1 — interactif par défaut.
do $$
begin
  if (select live_presentation_mode from public.projects
        where id = '131ccccc-0000-0000-0000-000000000001') <> 'interactive' then
    raise exception 'FAIL 1: un dossier n''est pas en Live interactif par défaut';
  end if;
end $$;

-- §2 — hors du mode direct, « montré en directe » est refusé.
do $$
begin
  begin
    insert into public.live_seller_responses (agency_id, project_id, comparable_id, shown_directly_at)
      values ('131aaaaa-0000-0000-0000-000000000000', '131ccccc-0000-0000-0000-000000000001',
              '131dddd0-0000-0000-0000-000000000001', now());
    raise exception 'FAIL 2: montré en directe accepté en Live interactif';
  exception when sqlstate '42501' then null;
  end;
end $$;

-- Le concurrent 1 est deviné en interactif, le 2 écarté par « Non » ; puis passage en directe.
insert into public.live_seller_responses (agency_id, project_id, comparable_id, seller_estimated_listing_price)
  values ('131aaaaa-0000-0000-0000-000000000000', '131ccccc-0000-0000-0000-000000000001',
          '131dddd0-0000-0000-0000-000000000001', 280000);
insert into public.live_seller_responses (agency_id, project_id, comparable_id, seller_serious_competitor)
  values ('131aaaaa-0000-0000-0000-000000000000', '131ccccc-0000-0000-0000-000000000001',
          '131dddd0-0000-0000-0000-000000000002', 'no');
update public.projects set live_presentation_mode = 'direct'
  where id = '131ccccc-0000-0000-0000-000000000001';

-- §3 — jamais montré en directe avec une devinette, de prix ou de durée.
do $$
begin
  begin
    insert into public.live_seller_responses
      (agency_id, project_id, comparable_id, shown_directly_at, seller_estimated_listing_price)
      values ('131aaaaa-0000-0000-0000-000000000000', '131ccccc-0000-0000-0000-000000000001',
              '131dddd0-0000-0000-0000-000000000005', now(), 330000);
    raise exception 'FAIL 3: montré en directe accepté avec une devinette de prix';
  exception when sqlstate '42501' then null;
  end;
  begin
    insert into public.live_seller_responses
      (agency_id, project_id, comparable_id, shown_directly_at, seller_estimated_days_on_market)
      values ('131aaaaa-0000-0000-0000-000000000000', '131ccccc-0000-0000-0000-000000000001',
              '131dddd0-0000-0000-0000-000000000005', now(), 90);
    raise exception 'FAIL 3: montré en directe accepté avec une devinette de durée';
  exception when sqlstate '42501' then null;
  end;
end $$;

-- Un concurrent sans prix, montré en directe : son prix arrivé ensuite ne se fige pas un autre jour.
insert into public.live_seller_responses (agency_id, project_id, comparable_id, shown_directly_at)
  values ('131aaaaa-0000-0000-0000-000000000000', '131ccccc-0000-0000-0000-000000000001',
          '131dddd0-0000-0000-0000-000000000004', now());
update public.comparables set price = 400000 where id = '131dddd0-0000-0000-0000-000000000004';
update public.live_seller_responses set seller_serious_competitor = 'yes'
  where comparable_id = '131dddd0-0000-0000-0000-000000000004';
do $$
begin
  if (select revealed_listing_price from public.live_seller_responses
        where comparable_id = '131dddd0-0000-0000-0000-000000000004') is not null then
    raise exception 'FAIL 3: le prix d''un concurrent montré sans prix s''est figé un autre jour';
  end if;
end $$;

-- §3 — en directe : le prix révélé se fige, le fait ne se vide ni ne se réécrit, une devinette
-- ensuite est ignorée.
insert into public.live_seller_responses (agency_id, project_id, comparable_id, shown_directly_at)
  values ('131aaaaa-0000-0000-0000-000000000000', '131ccccc-0000-0000-0000-000000000001',
          '131dddd0-0000-0000-0000-000000000003', '2026-11-05 10:00:00+00');
update public.comparables set price = 335000 where id = '131dddd0-0000-0000-0000-000000000003';
update public.live_seller_responses
  set shown_directly_at = null, seller_estimated_listing_price = 250000
  where comparable_id = '131dddd0-0000-0000-0000-000000000003';
do $$
declare
  r record;
begin
  select * into r from public.live_seller_responses
    where comparable_id = '131dddd0-0000-0000-0000-000000000003';
  if r.revealed_listing_price is distinct from 340000 then
    raise exception 'FAIL 3: le prix révélé n''est pas figé à l''instant montré (%)', r.revealed_listing_price;
  end if;
  if r.shown_directly_at is distinct from '2026-11-05 10:00:00+00'::timestamptz then
    raise exception 'FAIL 3: « montré en directe » s''est vidé ou réécrit';
  end if;
  if r.seller_estimated_listing_price is not null then
    raise exception 'FAIL 3: une devinette s''est ajoutée à un concurrent montré en directe';
  end if;
end $$;

-- §4 — refusé après une devinette ou un « Non ».
do $$
begin
  begin
    update public.live_seller_responses set shown_directly_at = now()
      where comparable_id = '131dddd0-0000-0000-0000-000000000001';
    raise exception 'FAIL 4: montré en directe accepté après une devinette';
  exception when sqlstate '42501' then null;
  end;
  begin
    update public.live_seller_responses set shown_directly_at = now()
      where comparable_id = '131dddd0-0000-0000-0000-000000000002';
    raise exception 'FAIL 4: montré en directe accepté après un « Non »';
  exception when sqlstate '42501' then null;
  end;
end $$;

-- §4 — revenir à l'interactif : ce qui a été montré reste, une devinette ailleurs est acceptée.
update public.projects set live_presentation_mode = 'interactive'
  where id = '131ccccc-0000-0000-0000-000000000001';
insert into public.live_seller_responses (agency_id, project_id, comparable_id, seller_estimated_listing_price)
  values ('131aaaaa-0000-0000-0000-000000000000', '131ccccc-0000-0000-0000-000000000001',
          '131dddd0-0000-0000-0000-000000000005', 350000);
update public.live_seller_responses set seller_estimated_listing_price = 250000
  where comparable_id = '131dddd0-0000-0000-0000-000000000003';
do $$
declare
  r record;
begin
  select * into r from public.live_seller_responses
    where comparable_id = '131dddd0-0000-0000-0000-000000000005';
  if r.seller_estimated_listing_price is distinct from 350000
     or r.revealed_listing_price is distinct from 360000 then
    raise exception 'FAIL 4: une devinette refusée après le retour à l''interactif';
  end if;
  select * into r from public.live_seller_responses
    where comparable_id = '131dddd0-0000-0000-0000-000000000003';
  if r.shown_directly_at is null or r.seller_estimated_listing_price is not null
     or r.revealed_listing_price is distinct from 340000 then
    raise exception 'FAIL 4: le retour à l''interactif a changé un concurrent déjà montré';
  end if;
end $$;
update public.projects set live_presentation_mode = 'direct'
  where id = '131ccccc-0000-0000-0000-000000000001';

-- §5 — « document seul » refusé une fois le Live commencé ; plus de changement après conclusion.
do $$
begin
  begin
    update public.projects set live_presentation_mode = 'document'
      where id = '131ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 5: document seul accepté après le début du Live';
  exception when sqlstate '42501' then null;
  end;
end $$;
update public.projects set live_presentation_mode = 'document'
  where id = '131ccccc-0000-0000-0000-000000000002';
do $$
begin
  if (select live_presentation_mode from public.projects
        where id = '131ccccc-0000-0000-0000-000000000002') <> 'document' then
    raise exception 'FAIL 5: document seul refusé avant le Live';
  end if;
end $$;

-- §5 bis — le rattachement se lit sur l'ancien dossier (le dossier 2 n'est pas en directe).
insert into public.live_seller_responses (agency_id, project_id, comparable_id, seller_serious_competitor)
  values ('131aaaaa-0000-0000-0000-000000000000', '131ccccc-0000-0000-0000-000000000002',
          '131dddd0-0000-0000-0000-000000000009', 'yes');
insert into public.live_seller_summary (agency_id, project_id)
  values ('131aaaaa-0000-0000-0000-000000000000', '131ccccc-0000-0000-0000-000000000002');
do $$
begin
  begin
    update public.live_seller_responses
      set shown_directly_at = now(), project_id = '131ccccc-0000-0000-0000-000000000001'
      where comparable_id = '131dddd0-0000-0000-0000-000000000009';
    raise exception 'FAIL 5 bis: montré en directe posé en changeant de dossier';
  exception when sqlstate '42501' then null;
  end;
  begin
    update public.live_seller_summary
      set advisor_closest_comparable_id = '131dddd0-0000-0000-0000-000000000001',
          project_id = '131ccccc-0000-0000-0000-000000000001'
      where project_id = '131ccccc-0000-0000-0000-000000000002';
    raise exception 'FAIL 5 bis: le plus proche d''un autre dossier posé en changeant de dossier';
  exception when sqlstate '42501' then null;
  end;
end $$;

-- §6 — le plus proche : un concurrent du dossier seulement.
insert into public.live_seller_summary (agency_id, project_id)
  values ('131aaaaa-0000-0000-0000-000000000000', '131ccccc-0000-0000-0000-000000000001');
do $$
begin
  begin
    update public.live_seller_summary
      set advisor_closest_comparable_id = '131dddd0-0000-0000-0000-000000000009'
      where project_id = '131ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 6: le plus proche accepte le concurrent d''un autre dossier';
  exception when sqlstate '42501' then null;
  end;
end $$;
update public.live_seller_summary
  set advisor_closest_comparable_id = '131dddd0-0000-0000-0000-000000000003'
  where project_id = '131ccccc-0000-0000-0000-000000000001';
do $$
begin
  if (select seller_most_dangerous_comparable_id from public.live_seller_summary
        where project_id = '131ccccc-0000-0000-0000-000000000001') is not null then
    raise exception 'FAIL 6: le choix du conseiller est lu comme celui du vendeur';
  end if;
end $$;
-- Le même concurrent est aussi le plus dangereux (deux vidages successifs à la suppression).
update public.live_seller_summary
  set seller_most_dangerous_comparable_id = '131dddd0-0000-0000-0000-000000000003'
  where project_id = '131ccccc-0000-0000-0000-000000000001';
-- Le dossier est conclu ; le mode ne change plus ; le plus proche ne se vide ni ne change à la
-- main ; supprimer le concurrent proposé passe.
update public.projects set status = 'meeting_completed'
  where id = '131ccccc-0000-0000-0000-000000000001';
do $$
begin
  begin
    update public.live_seller_summary set advisor_closest_comparable_id = null
      where project_id = '131ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 6: le plus proche vidé à la main sur un dossier conclu';
  exception when sqlstate '42501' then null;
  end;
  begin
    update public.live_seller_summary
      set advisor_closest_comparable_id = '131dddd0-0000-0000-0000-000000000001'
      where project_id = '131ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 6: le plus proche changé sur un dossier conclu';
  exception when sqlstate '42501' then null;
  end;
end $$;
do $$
begin
  begin
    update public.projects set live_presentation_mode = 'interactive'
      where id = '131ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 5: la façon de présenter change après la conclusion';
  exception when sqlstate '42501' then null;
  end;
end $$;
delete from public.comparables where id = '131dddd0-0000-0000-0000-000000000003';
do $$
begin
  if (select advisor_closest_comparable_id from public.live_seller_summary
        where project_id = '131ccccc-0000-0000-0000-000000000001') is not null then
    raise exception 'FAIL 6: le plus proche supprimé n''est pas vidé';
  end if;
  if (select seller_most_dangerous_comparable_id from public.live_seller_summary
        where project_id = '131ccccc-0000-0000-0000-000000000001') is not null then
    raise exception 'FAIL 6: le plus dangereux supprimé n''est pas vidé';
  end if;
end $$;

-- §7 — les liens de l'Étude : rien depuis le navigateur ; lus par l'agence ; cloisonnés.
insert into public.market_study_links (agency_id, project_id, token_hash)
  values ('131aaaaa-0000-0000-0000-000000000000', '131ccccc-0000-0000-0000-000000000002',
          repeat('a', 64));
do $$
begin
  begin
    insert into public.market_study_links (agency_id, project_id, token_hash)
      values ('131bbbbb-0000-0000-0000-000000000000', '131ccccc-0000-0000-0000-000000000002',
              repeat('b', 64));
    raise exception 'FAIL 7: un lien rattaché au dossier d''une autre agence';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;
select set_config('request.jwt.claims',
  '{"sub":"13111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.market_study_links) <> 1 then
    raise exception 'FAIL 7: l''agence ne lit pas ses liens';
  end if;
  begin
    insert into public.market_study_links (agency_id, project_id, token_hash)
      values ('131aaaaa-0000-0000-0000-000000000000', '131ccccc-0000-0000-0000-000000000002',
              repeat('c', 64));
    raise exception 'FAIL 7: le navigateur écrit un lien';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.market_study_links set expires_at = now() + interval '1 year';
    raise exception 'FAIL 7: le navigateur prolonge un lien';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.market_study_links;
    raise exception 'FAIL 7: le navigateur supprime un lien';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select set_config('request.jwt.claims',
  '{"sub":"13133333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.market_study_links) <> 0 then
    raise exception 'FAIL 7: un membre retiré lit les liens';
  end if;
end $$;
reset role;
set local role anon;
do $$
begin
  begin
    perform 1 from public.market_study_links;
    raise exception 'FAIL 7: un anonyme lit les liens';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select set_config('request.jwt.claims',
  '{"sub":"13122222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.market_study_links) <> 0 then
    raise exception 'FAIL 7: une autre agence lit les liens';
  end if;
end $$;
reset role;

-- §8 — l'étape de démo « direct ».
update public.projects set demo_stage = 'direct'
  where id = '131ccccc-0000-0000-0000-000000000002';

rollback;
