-- Mission 105 — les finitions, à la SOURCE DE VÉRITÉ :
--   §1 un membre retiré ne lit ni n'écrit rien : ni table, ni photo du stockage, ni fonction de
--      déplacement ; un membre actif, si ;
--   §2 le budget de recherche réservé avant l'appel, compteur verrouillé : jamais au-delà du
--      plafond, la part non utilisée rendue ; fonctions fermées au navigateur ;
--   §3 une annonce, une fiche, par dossier ;
--   §4 le dernier résultat payé, sur le dossier, cloisonné par agence ;
--   §5 la date de prochaine relance s'écrit avec la relance.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/finitions.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values
  ('10511111-1111-1111-1111-111111111111'),
  ('10522222-2222-2222-2222-222222222222'),
  ('10533333-3333-3333-3333-333333333333');
insert into public.agencies (id, name) values
  ('105aaaaa-0000-0000-0000-000000000000', 'A105'),
  ('105bbbbb-0000-0000-0000-000000000000', 'B105');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, removed_at) values
  ('10511111-1111-1111-1111-111111111111', '105aaaaa-0000-0000-0000-000000000000', 'Ac', 'Tif', 'a105@t.l', 'advisor', null),
  ('10522222-2222-2222-2222-222222222222', '105aaaaa-0000-0000-0000-000000000000', 'Re', 'Tiré', 'r105@t.l', 'advisor', now()),
  ('10533333-3333-3333-3333-333333333333', '105bbbbb-0000-0000-0000-000000000000', 'Au', 'Tre', 'b105@t.l', 'advisor', null);
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('105ccccc-0000-0000-0000-000000000001', '105aaaaa-0000-0000-0000-000000000000',
   '10511111-1111-1111-1111-111111111111', 'dossier A', 'draft');
insert into public.comparables (id, agency_id, project_id, title, price, surface_area, is_selected, display_order, listing_url) values
  ('105dddd0-0000-0000-0000-000000000001', '105aaaaa-0000-0000-0000-000000000000',
   '105ccccc-0000-0000-0000-000000000001', 'c1', 300000, 60, true, 1, 'https://www.seloger.com/annonces/1.htm'),
  ('105dddd0-0000-0000-0000-000000000002', '105aaaaa-0000-0000-0000-000000000000',
   '105ccccc-0000-0000-0000-000000000001', 'c2', 310000, 62, true, 2, 'https://www.seloger.com/annonces/2.htm');
insert into storage.objects (bucket_id, name) values
  ('project-photos', '105aaaaa-0000-0000-0000-000000000000/105ccccc-0000-0000-0000-000000000001/property/a.jpg');

create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}', p_uid), true);
  execute 'set local role authenticated';
end $$;

-- §1 — le membre retiré.
select pg_temp.act_as('10522222-2222-2222-2222-222222222222');
do $$
begin
  if (select count(*) from public.projects) <> 0 then
    raise exception 'FAIL 1: un membre retiré lit les dossiers';
  end if;
  if (select count(*) from public.comparables) <> 0 then
    raise exception 'FAIL 1: un membre retiré lit les concurrents';
  end if;
  if (select count(*) from storage.objects where bucket_id = 'project-photos') <> 0 then
    raise exception 'FAIL 1: un membre retiré voit les photos de l''agence';
  end if;
  if public.current_agency_id_text() is not null then
    raise exception 'FAIL 1: current_agency_id_text() rend l''agence d''un membre retiré';
  end if;
  begin
    insert into storage.objects (bucket_id, name) values
      ('project-photos', '105aaaaa-0000-0000-0000-000000000000/105ccccc-0000-0000-0000-000000000001/property/b.jpg');
    raise exception 'FAIL 1: un membre retiré dépose une photo';
  exception when insufficient_privilege then null;
  end;
  perform public.move_comparable('105ccccc-0000-0000-0000-000000000001', '105dddd0-0000-0000-0000-000000000002', 'up');
  perform public.move_selected_comparable('105dddd0-0000-0000-0000-000000000002', 'up');
end $$;
reset role;
do $$
begin
  if (select display_order from public.comparables where id = '105dddd0-0000-0000-0000-000000000002') <> 2 then
    raise exception 'FAIL 1: un membre retiré déplace un concurrent';
  end if;
end $$;

-- Le membre actif, lui, voit, dépose et déplace.
select pg_temp.act_as('10511111-1111-1111-1111-111111111111');
do $$
begin
  if (select count(*) from storage.objects where bucket_id = 'project-photos') <> 1 then
    raise exception 'FAIL 1: un membre actif ne voit pas les photos de son agence';
  end if;
  perform public.move_selected_comparable('105dddd0-0000-0000-0000-000000000002', 'up');
end $$;
reset role;
do $$
begin
  if (select display_order from public.comparables where id = '105dddd0-0000-0000-0000-000000000002') <> 1 then
    raise exception 'FAIL 1: un membre actif ne déplace plus un concurrent';
  end if;
end $$;

-- §2 — le budget réservé. Plafond : 1 € (100 annonces) ; déjà 30 annonces facturées ce mois.
insert into public.agency_search_budgets (agency_id, monthly_cap_cents)
  values ('105aaaaa-0000-0000-0000-000000000000', 100);
insert into public.stream_estate_usage (agency_id, adverts)
  values ('105aaaaa-0000-0000-0000-000000000000', 30);
do $$
declare
  r1 record;
  r2 record;
  r3 record;
  r4 record;
begin
  -- Deux recherches « simultanées » de 60 : la première prend 60, la seconde ce qui reste (10).
  select * into r1 from public.reserve_stream_estate_budget('105aaaaa-0000-0000-0000-000000000000',
    null, null, 60, date_trunc('month', now()), 3000);
  select * into r2 from public.reserve_stream_estate_budget('105aaaaa-0000-0000-0000-000000000000',
    null, null, 60, date_trunc('month', now()), 3000);
  if r1.adverts <> 60 or r2.adverts <> 10 then
    raise exception 'FAIL 2: réservations % et % (attendu 60 et 10)', r1.adverts, r2.adverts;
  end if;
  -- Plafond atteint : rien n'est réservé.
  select * into r3 from public.reserve_stream_estate_budget('105aaaaa-0000-0000-0000-000000000000',
    null, null, 60, date_trunc('month', now()), 3000);
  if r3.reservation_id is not null then
    raise exception 'FAIL 2: une réservation au-delà du plafond';
  end if;
  if (select sum(adverts) from public.stream_estate_usage
        where agency_id = '105aaaaa-0000-0000-0000-000000000000') <> 100 then
    raise exception 'FAIL 2: le plafond est franchi';
  end if;
  -- La première n'a facturé que 25 : le reste est rendu ; la seconde rien : elle disparaît.
  perform public.settle_stream_estate_budget(r1.reservation_id, 25);
  perform public.settle_stream_estate_budget(r2.reservation_id, 0);
  if (select sum(adverts) from public.stream_estate_usage
        where agency_id = '105aaaaa-0000-0000-0000-000000000000') <> 55
     or exists (select 1 from public.stream_estate_usage where reserved) then
    raise exception 'FAIL 2: la part non utilisée n''est pas rendue';
  end if;
  select * into r4 from public.reserve_stream_estate_budget('105aaaaa-0000-0000-0000-000000000000',
    null, null, 60, date_trunc('month', now()), 3000);
  if r4.adverts <> 45 then
    raise exception 'FAIL 2: après restitution, % réservées (attendu 45)', r4.adverts;
  end if;
  -- Sans ligne de plafond, le défaut (30 €) vaut.
  select * into r4 from public.reserve_stream_estate_budget('105bbbbb-0000-0000-0000-000000000000',
    null, null, 60, date_trunc('month', now()), 3000);
  if r4.adverts <> 60 then
    raise exception 'FAIL 2: plafond par défaut non appliqué';
  end if;
  if has_function_privilege('authenticated',
       'public.reserve_stream_estate_budget(uuid,uuid,uuid,integer,timestamptz,integer)', 'execute')
     or has_function_privilege('authenticated', 'public.settle_stream_estate_budget(uuid,integer)', 'execute') then
    raise exception 'FAIL 2: le navigateur réserve ou règle le budget';
  end if;
end $$;

-- §3 — une annonce, une fiche, par dossier.
do $$
begin
  begin
    insert into public.comparables (agency_id, project_id, title, price, is_selected, display_order, listing_url)
    values ('105aaaaa-0000-0000-0000-000000000000', '105ccccc-0000-0000-0000-000000000001',
            'doublon', 1, true, 9, 'https://www.seloger.com/annonces/1.htm');
    raise exception 'FAIL 3: deux fiches pour la même annonce';
  exception when unique_violation then
    if sqlerrm not like '%comparables_one_listing_per_project%' then raise; end if;
  end;
  -- Sans annonce (saisie à la main), plusieurs fiches restent possibles.
  insert into public.comparables (agency_id, project_id, title, price, is_selected, display_order)
  values ('105aaaaa-0000-0000-0000-000000000000', '105ccccc-0000-0000-0000-000000000001', 'm1', 1, true, 10),
         ('105aaaaa-0000-0000-0000-000000000000', '105ccccc-0000-0000-0000-000000000001', 'm2', 1, true, 11);
end $$;

-- §4 et §5 — le résultat payé et la date de prochaine relance, depuis le navigateur.
select pg_temp.act_as('10511111-1111-1111-1111-111111111111');
insert into public.stream_estate_results (agency_id, project_id, saved_by, fingerprint, result)
values ('105aaaaa-0000-0000-0000-000000000000', '105ccccc-0000-0000-0000-000000000001',
        '10511111-1111-1111-1111-111111111111', 'empreinte', '{"portal": {}, "note": {}}');
reset role;
update public.projects set status = 'meeting_completed' where id = '105ccccc-0000-0000-0000-000000000001';
select pg_temp.act_as('10511111-1111-1111-1111-111111111111');
insert into public.follow_up_contacts (project_id, agency_id, author_id, note, next_follow_up_on)
values ('105ccccc-0000-0000-0000-000000000001', '105aaaaa-0000-0000-0000-000000000000',
        '10511111-1111-1111-1111-111111111111', 'rappelé', current_date + 30);
reset role;
select pg_temp.act_as('10533333-3333-3333-3333-333333333333');
do $$
begin
  if (select count(*) from public.stream_estate_results) <> 0 then
    raise exception 'FAIL 4: une autre agence lit le résultat payé';
  end if;
  begin
    insert into public.stream_estate_results (agency_id, project_id, fingerprint, result)
    values ('105aaaaa-0000-0000-0000-000000000000', '105ccccc-0000-0000-0000-000000000001', 'x', '{}');
    raise exception 'FAIL 4: une autre agence écrit un résultat payé';
  exception when insufficient_privilege or unique_violation then null;
  end;
end $$;
reset role;
select pg_temp.act_as('10522222-2222-2222-2222-222222222222');
do $$
begin
  if (select count(*) from public.stream_estate_results) <> 0
     or (select count(*) from public.follow_up_contacts) <> 0 then
    raise exception 'FAIL 4: un membre retiré lit le résultat payé ou les relances';
  end if;
end $$;
reset role;
do $$
begin
  if (select next_follow_up_on from public.follow_up_contacts
        where project_id = '105ccccc-0000-0000-0000-000000000001') <> current_date + 30 then
    raise exception 'FAIL 5: date de prochaine relance non écrite';
  end if;
end $$;

select 'finitions : OK' as resultat;
rollback;
