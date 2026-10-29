-- Mission 127 — Le point marché, à la SOURCE DE VÉRITÉ :
--   §1 à la première conclusion, chaque concurrent retenu reçoit son prix du rendez-vous et ses
--      jours de commercialisation, figés ; un changement d'issue ne refige rien ; un concurrent
--      retenu après la conclusion n'en a pas ; la relecture (price écrasé) ne les touche pas ;
--   §2 les points datés : l'agence lit les siens, une autre agence rien, le navigateur n'écrit
--      pas, le dossier d'une autre agence est refusé par la base ;
--   §3 les liens d'un point : condensat de 64 hexadécimaux, cloisonnés, le navigateur n'écrit pas,
--      le lien part avec son point ;
--   §4 la reprise des dossiers déjà conclus (la même requête que la migration) : prix révélé au
--      Live, sinon observation avant la conclusion, sinon prix actuel dit « current ».
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/point_marche.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values
  ('12711111-1111-1111-1111-111111111111'),
  ('12722222-2222-2222-2222-222222222222');
insert into public.agencies (id, name) values
  ('127aaaaa-0000-0000-0000-000000000000', 'A127'),
  ('127bbbbb-0000-0000-0000-000000000000', 'B127');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('12711111-1111-1111-1111-111111111111', '127aaaaa-0000-0000-0000-000000000000',
   'Al', 'A', 'a127@t.l', 'advisor'),
  ('12722222-2222-2222-2222-222222222222', '127bbbbb-0000-0000-0000-000000000000',
   'Bo', 'B', 'b127@t.l', 'advisor');
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('127ccccc-0000-0000-0000-000000000001', '127aaaaa-0000-0000-0000-000000000000',
   '12711111-1111-1111-1111-111111111111', 'conclu', 'ready_for_meeting'),
  ('127ccccc-0000-0000-0000-000000000002', '127bbbbb-0000-0000-0000-000000000000',
   '12722222-2222-2222-2222-222222222222', 'autre agence', 'ready_for_meeting');
-- c1 : date de publication connue ; c2 : jours lus à l'import, créé il y a 10 jours ; c3 : écarté.
insert into public.comparables (id, agency_id, project_id, title, price, surface_area, is_selected,
                                display_order, listing_published_at, days_on_market, created_at) values
  ('127dddd0-0000-0000-0000-000000000001', '127aaaaa-0000-0000-0000-000000000000',
   '127ccccc-0000-0000-0000-000000000001', 'c1', 300000, 60, true, 0,
   current_date - 40, null, now()),
  ('127dddd0-0000-0000-0000-000000000002', '127aaaaa-0000-0000-0000-000000000000',
   '127ccccc-0000-0000-0000-000000000001', 'c2', 320000, 65, true, 1,
   null, 30, now() - interval '10 days'),
  ('127dddd0-0000-0000-0000-000000000003', '127aaaaa-0000-0000-0000-000000000000',
   '127ccccc-0000-0000-0000-000000000001', 'c3', 310000, 62, false, 2,
   null, null, now());
update public.projects
  set live_started_at = now() - interval '1 hour', live_ended_at = now() - interval '10 minutes'
  where id = '127ccccc-0000-0000-0000-000000000001';

-- §1 — la première conclusion fige le prix et les jours des retenus.
select public.conclude_meeting(
  '127ccccc-0000-0000-0000-000000000001', '127aaaaa-0000-0000-0000-000000000000',
  'signed', null, 295000, 300000, 298000, 298000,
  p_mandate_type => 'exclusive');
do $$
declare
  r record;
begin
  select meeting_price, meeting_days_on_market, meeting_price_source, meeting_frozen_at into r
    from public.comparables where id = '127dddd0-0000-0000-0000-000000000001';
  if r.meeting_price <> 300000 or r.meeting_days_on_market <> 40
     or r.meeting_price_source <> 'conclusion' or r.meeting_frozen_at is null then
    raise exception 'FAIL 1a: c1 non figé (% % % %)', r.meeting_price, r.meeting_days_on_market,
      r.meeting_price_source, r.meeting_frozen_at;
  end if;
  select meeting_price, meeting_days_on_market into r
    from public.comparables where id = '127dddd0-0000-0000-0000-000000000002';
  if r.meeting_price <> 320000 or r.meeting_days_on_market <> 40 then
    raise exception 'FAIL 1b: c2 : jours = import + écoulés attendus 40, lu %', r.meeting_days_on_market;
  end if;
  if (select meeting_frozen_at from public.comparables
        where id = '127dddd0-0000-0000-0000-000000000003') is not null then
    raise exception 'FAIL 1c: un concurrent écarté ne reçoit rien';
  end if;
end $$;

-- La relecture écrase `price`, jamais le prix du rendez-vous ; un changement d'issue ne refige rien ;
-- un concurrent retenu après la conclusion n'a pas de prix du rendez-vous.
update public.comparables set price = 280000 where id = '127dddd0-0000-0000-0000-000000000001';
insert into public.comparables (id, agency_id, project_id, title, price, surface_area, is_selected, display_order) values
  ('127dddd0-0000-0000-0000-000000000004', '127aaaaa-0000-0000-0000-000000000000',
   '127ccccc-0000-0000-0000-000000000001', 'c4 arrivé après', 290000, 61, true, 3);
select public.conclude_meeting(
  '127ccccc-0000-0000-0000-000000000001', '127aaaaa-0000-0000-0000-000000000000',
  'follow_up', 'réfléchit', 295000, 300000, 298000, 298000,
  p_follow_up_motive => 'thinking_price');
do $$
begin
  if (select meeting_price from public.comparables
        where id = '127dddd0-0000-0000-0000-000000000001') <> 300000 then
    raise exception 'FAIL 1d: le prix du rendez-vous a été réécrit';
  end if;
  if (select meeting_frozen_at from public.comparables
        where id = '127dddd0-0000-0000-0000-000000000004') is not null then
    raise exception 'FAIL 1e: un concurrent retenu après la conclusion a reçu un prix du rendez-vous';
  end if;
end $$;

-- §1f — le chemin de la M111 : la ligne de conclusion existe déjà, créée par la seule saisie du
-- prix au Live (sans `concluded_at`) ; la première conclusion la date ET fige les retenus.
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('127ccccc-0000-0000-0000-000000000004', '127aaaaa-0000-0000-0000-000000000000',
   '12711111-1111-1111-1111-111111111111', 'prix saisi au Live', 'ready_for_meeting');
insert into public.comparables (id, agency_id, project_id, title, price, surface_area, is_selected, display_order) values
  ('127dddd0-0000-0000-0000-000000000021', '127aaaaa-0000-0000-0000-000000000000',
   '127ccccc-0000-0000-0000-000000000004', 'c21', 310000, 60, true, 0);
insert into public.project_meeting_conclusions (project_id, agency_id, commercialization_price) values
  ('127ccccc-0000-0000-0000-000000000004', '127aaaaa-0000-0000-0000-000000000000', 305000);
do $$
begin
  if (select concluded_at from public.project_meeting_conclusions
        where project_id = '127ccccc-0000-0000-0000-000000000004') is not null then
    raise exception 'FAIL 1f: la ligne du prix saisi au Live ne doit pas être datée';
  end if;
end $$;
select public.conclude_meeting(
  '127ccccc-0000-0000-0000-000000000004', '127aaaaa-0000-0000-0000-000000000000',
  'signed', null, 305000, 300000, 298000, 298000,
  p_mandate_type => 'simple');
do $$
declare
  r record;
begin
  select meeting_price, meeting_price_source, meeting_frozen_at into r
    from public.comparables where id = '127dddd0-0000-0000-0000-000000000021';
  if r.meeting_price <> 310000 or r.meeting_price_source <> 'conclusion' or r.meeting_frozen_at is null then
    raise exception 'FAIL 1g: chemin M111 : la première conclusion ne fige pas (% %)', r.meeting_price, r.meeting_frozen_at;
  end if;
  if (select status from public.projects where id = '127ccccc-0000-0000-0000-000000000004') <> 'meeting_completed' then
    raise exception 'FAIL 1h: le dossier n''est pas passé dans le Suivi';
  end if;
end $$;

-- §2 — les points datés.
insert into public.project_market_updates (id, agency_id, project_id, made_by, summary) values
  ('127eeee0-0000-0000-0000-000000000001', '127aaaaa-0000-0000-0000-000000000000',
   '127ccccc-0000-0000-0000-000000000001', '12711111-1111-1111-1111-111111111111',
   '{"lines":[]}'::jsonb);
do $$
begin
  begin
    insert into public.project_market_updates (agency_id, project_id, summary) values
      ('127bbbbb-0000-0000-0000-000000000000', '127ccccc-0000-0000-0000-000000000001', '{}'::jsonb);
    raise exception 'FAIL 2a: un point sur le dossier d''une autre agence a été accepté';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  begin
    insert into public.project_market_updates (agency_id, project_id, summary) values
      ('127aaaaa-0000-0000-0000-000000000000', '127ccccc-0000-0000-0000-000000000001', '[]'::jsonb);
    raise exception 'FAIL 2b: un résumé qui n''est pas un objet a été accepté';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;

select set_config('request.jwt.claims',
  '{"sub":"12711111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.project_market_updates) <> 1 then
    raise exception 'FAIL 2c: le conseiller de l''agence ne lit pas son point';
  end if;
  begin
    insert into public.project_market_updates (agency_id, project_id, summary) values
      ('127aaaaa-0000-0000-0000-000000000000', '127ccccc-0000-0000-0000-000000000001', '{}'::jsonb);
    raise exception 'FAIL 2d: le navigateur a écrit un point';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.project_market_updates where id = '127eeee0-0000-0000-0000-000000000001';
    raise exception 'FAIL 2e: le navigateur a supprimé un point';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select set_config('request.jwt.claims',
  '{"sub":"12722222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.project_market_updates) <> 0 then
    raise exception 'FAIL 2f: une autre agence lit un point';
  end if;
end $$;
reset role;

-- §3 — les liens d'un point.
insert into public.project_market_update_links (id, agency_id, project_id, update_id, created_by, token_hash) values
  ('127ffff0-0000-0000-0000-000000000001', '127aaaaa-0000-0000-0000-000000000000',
   '127ccccc-0000-0000-0000-000000000001', '127eeee0-0000-0000-0000-000000000001',
   '12711111-1111-1111-1111-111111111111', repeat('ab', 32));
do $$
begin
  begin
    insert into public.project_market_update_links (agency_id, project_id, update_id, token_hash) values
      ('127aaaaa-0000-0000-0000-000000000000', '127ccccc-0000-0000-0000-000000000001',
       '127eeee0-0000-0000-0000-000000000001', 'pas-un-condensat');
    raise exception 'FAIL 3a: un condensat mal formé a été accepté';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;
select set_config('request.jwt.claims',
  '{"sub":"12711111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.project_market_update_links) <> 1 then
    raise exception 'FAIL 3b: le conseiller de l''agence ne lit pas son lien';
  end if;
  begin
    update public.project_market_update_links set expires_at = now() + interval '400 days'
      where id = '127ffff0-0000-0000-0000-000000000001';
    raise exception 'FAIL 3c: le navigateur a prolongé un lien';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select set_config('request.jwt.claims',
  '{"sub":"12722222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.project_market_update_links) <> 0 then
    raise exception 'FAIL 3d: une autre agence lit un lien';
  end if;
end $$;
reset role;
delete from public.project_market_updates where id = '127eeee0-0000-0000-0000-000000000001';
do $$
begin
  if (select count(*) from public.project_market_update_links) <> 0 then
    raise exception 'FAIL 3e: le lien ne part pas avec son point';
  end if;
end $$;

-- §4 — la reprise des dossiers déjà conclus (la requête de la migration, rejouée sur des lignes
-- d'avant : prix révélé au Live, observation avant la conclusion, rien).
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('127ccccc-0000-0000-0000-000000000003', '127aaaaa-0000-0000-0000-000000000000',
   '12711111-1111-1111-1111-111111111111', 'ancien conclu', 'ready_for_meeting');
insert into public.comparables (id, agency_id, project_id, title, price, surface_area, is_selected,
                                display_order, listing_url, days_on_market, created_at) values
  ('127dddd0-0000-0000-0000-000000000011', '127aaaaa-0000-0000-0000-000000000000',
   '127ccccc-0000-0000-0000-000000000003', 'révélé', 250000, 50, true, 0, null, null, now()),
  ('127dddd0-0000-0000-0000-000000000012', '127aaaaa-0000-0000-0000-000000000000',
   '127ccccc-0000-0000-0000-000000000003', 'observé', 230000, 50, true, 1,
   'https://www.seloger.com/annonces/achat/appartement/antibes-06/26ZEJMLWB13Y.htm', 20,
   now() - interval '30 days'),
  ('127dddd0-0000-0000-0000-000000000013', '127aaaaa-0000-0000-0000-000000000000',
   '127ccccc-0000-0000-0000-000000000003', 'sans rien', 240000, 50, true, 2,
   'https://www.bienici.com/annonce/vente/antibes-06600/appartement/apimo-1', null, now());
-- Le Live d'avant (M109 : rien ne s'écrit au Live après la conclusion) : la devinette fige le prix
-- révélé (M96) à 250000 ; puis le dossier est conclu, et le prix bouge.
insert into public.live_seller_responses (project_id, agency_id, comparable_id, seller_estimated_listing_price) values
  ('127ccccc-0000-0000-0000-000000000003', '127aaaaa-0000-0000-0000-000000000000',
   '127dddd0-0000-0000-0000-000000000011', 240000);
insert into public.project_meeting_conclusions (project_id, agency_id, outcome, commercialization_price, concluded_at) values
  ('127ccccc-0000-0000-0000-000000000003', '127aaaaa-0000-0000-0000-000000000000', 'signed', 245000,
   now() - interval '5 days');
update public.projects set status = 'meeting_completed' where id = '127ccccc-0000-0000-0000-000000000003';
update public.comparables set price = 235000 where id = '127dddd0-0000-0000-0000-000000000011';
insert into public.listing_observations (agency_id, portal, listing_key, canonical_url, price, observed_on) values
  ('127aaaaa-0000-0000-0000-000000000000', 'seloger', '26ZEJMLWB13Y.htm',
   'https://www.seloger.com/annonces/achat/appartement/antibes-06/26ZEJMLWB13Y.htm', 260000,
   current_date - 20),
  ('127aaaaa-0000-0000-0000-000000000000', 'seloger', '26ZEJMLWB13Y.htm',
   'https://www.seloger.com/annonces/achat/appartement/antibes-06/26ZEJMLWB13Y.htm', 230000,
   current_date - 2);

with conclu as (
  select c.id, c.agency_id, c.price, c.listing_url, c.listing_published_at, c.days_on_market,
         c.created_at, m.concluded_at
  from public.comparables c
  join public.project_meeting_conclusions m on m.project_id = c.project_id
  where c.is_selected and m.concluded_at is not null and c.meeting_frozen_at is null
),
identite as (
  select x.id,
    case
      when h.host = 'seloger.com' or h.host like '%.seloger.com' then 'seloger'
      when h.host = 'bienici.com' or h.host like '%.bienici.com' then 'bienici'
      when h.host = 'green-acres.fr' or h.host like '%.green-acres.fr' then 'greenacres'
      when h.host = 'maisonsetappartements.fr' or h.host like '%.maisonsetappartements.fr'
        then 'maisonsetappartements'
      when h.host = 'annonces.demonstration.invalid' or h.host like '%.annonces.demonstration.invalid'
        then 'demonstration'
    end as portal,
    (regexp_match(coalesce(h.path, ''), '([^/]+)/*$'))[1] as listing_key
  from conclu x
  cross join lateral (
    select lower(substring(x.listing_url from '^[a-zA-Z][a-zA-Z0-9+.-]*://([^/?#:]+)')) as host,
           substring(x.listing_url from '^[a-zA-Z][a-zA-Z0-9+.-]*://[^/?#]+([^?#]*)') as path
  ) h
),
revele as (
  select r.comparable_id, max(r.revealed_listing_price) as price
  from public.live_seller_responses r
  where r.revealed_listing_price is not null
  group by r.comparable_id
),
observe as (
  select x.id,
    (select o.price from public.listing_observations o
      where o.agency_id = x.agency_id and o.portal = i.portal and o.listing_key = i.listing_key
        and o.observed_on <= x.concluded_at::date
      order by o.observed_on desc limit 1) as price
  from conclu x join identite i on i.id = x.id
  where i.portal is not null and length(coalesce(i.listing_key, '')) >= 3
)
update public.comparables c set
  meeting_price = coalesce(rv.price, ob.price, x.price),
  meeting_price_source = case
    when rv.price is not null then 'revealed'
    when ob.price is not null then 'observation'
    else 'current'
  end,
  meeting_days_on_market = case
    when x.listing_published_at is not null
      then greatest(0, x.concluded_at::date - x.listing_published_at::date)
    when x.days_on_market is not null
      then x.days_on_market + greatest(0, x.concluded_at::date - x.created_at::date)
  end,
  meeting_frozen_at = x.concluded_at
from conclu x
left join revele rv on rv.comparable_id = x.id
left join observe ob on ob.id = x.id
where c.id = x.id;

do $$
declare
  r record;
begin
  -- c4, retenu après la conclusion du dossier 01 et jamais figé : la reprise le prend aussi, en
  -- 'current' (il n'a ni prix révélé ni observation), daté de la conclusion.
  select meeting_price, meeting_price_source, meeting_frozen_at into r
    from public.comparables where id = '127dddd0-0000-0000-0000-000000000004';
  if r.meeting_price <> 290000 or r.meeting_price_source <> 'current' or r.meeting_frozen_at is null then
    raise exception 'FAIL 4z: c4 repris en current attendu (% %)', r.meeting_price, r.meeting_price_source;
  end if;
  select meeting_price, meeting_price_source into r from public.comparables
    where id = '127dddd0-0000-0000-0000-000000000011';
  if r.meeting_price <> 250000 or r.meeting_price_source <> 'revealed' then
    raise exception 'FAIL 4a: le prix révélé au Live n''est pas repris (% %)', r.meeting_price, r.meeting_price_source;
  end if;
  select meeting_price, meeting_price_source, meeting_days_on_market into r from public.comparables
    where id = '127dddd0-0000-0000-0000-000000000012';
  if r.meeting_price <> 260000 or r.meeting_price_source <> 'observation' or r.meeting_days_on_market <> 45 then
    raise exception 'FAIL 4b: l''observation d''avant la conclusion n''est pas reprise (% % %)',
      r.meeting_price, r.meeting_price_source, r.meeting_days_on_market;
  end if;
  select meeting_price, meeting_price_source into r from public.comparables
    where id = '127dddd0-0000-0000-0000-000000000013';
  if r.meeting_price <> 240000 or r.meeting_price_source <> 'current' then
    raise exception 'FAIL 4c: sans rien, le prix actuel dit « current » (% %)', r.meeting_price, r.meeting_price_source;
  end if;
  -- Les concurrents déjà figés (§1) ne sont pas repris.
  if (select meeting_price_source from public.comparables
        where id = '127dddd0-0000-0000-0000-000000000001') <> 'conclusion' then
    raise exception 'FAIL 4d: un concurrent figé à la conclusion a été repris';
  end if;
end $$;

rollback;
