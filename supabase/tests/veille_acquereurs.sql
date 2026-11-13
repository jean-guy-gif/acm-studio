-- Mission 136 — la veille des acquéreurs, à la SOURCE DE VÉRITÉ :
--   §1 un passage réserve son budget et s'ouvre d'un seul geste ; la consommation est marquée veille ;
--   §2 un second passage la même semaine est refusé (double déclenchement du cron) ; un passage en
--      échec ne compte pas ; à 6 jours passés, il repart ;
--   §3 la veille ne dépasse jamais son plafond, ni la moitié de celui de l'agence ; elle ne réserve
--      rien au-delà ; une consommation du mois précédent ne compte pas ;
--      la recherche d'un conseiller garde tout le reste du budget de l'agence ;
--   §4 fiche archivée ou d'une autre agence : rien ; l'agence de la fiche vérifiée à l'écriture ;
--      l'acquéreur, l'agence et les dates d'un passage figés ;
--   §5 le navigateur lit son agence et n'écrit rien (ni passage, ni plafond de veille, ni fonction) ;
--      une autre agence et un membre retiré ne lisent rien ;
--   §6 la fiche supprimée emporte ses passages ; sa consommation reste à l'agence, sans fiche.
--   §7 une agence réelle à 0 € : aucun passage, aucune réservation, pas choisie la nuit (M155).
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/veille_acquereurs.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values
  ('13611111-1111-1111-1111-111111111111'),
  ('13622222-2222-2222-2222-222222222222'),
  ('13633333-3333-3333-3333-333333333333');
insert into public.agencies (id, name) values
  ('136aaaaa-0000-0000-0000-000000000000', 'A136'),
  ('136bbbbb-0000-0000-0000-000000000000', 'B136');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('13611111-1111-1111-1111-111111111111', '136aaaaa-0000-0000-0000-000000000000',
   'Al', 'A', 'a136@t.l', 'manager'),
  ('13622222-2222-2222-2222-222222222222', '136bbbbb-0000-0000-0000-000000000000',
   'Bo', 'B', 'b136@t.l', 'advisor');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, removed_at) values
  ('13633333-3333-3333-3333-333333333333', '136aaaaa-0000-0000-0000-000000000000',
   'Ré', 'R', 'r136@t.l', 'advisor', now());
insert into public.buyers (id, agency_id, advisor_id, name, cities) values
  ('136ccccc-0000-0000-0000-000000000001', '136aaaaa-0000-0000-0000-000000000000',
   '13611111-1111-1111-1111-111111111111', 'Famille Un', array['Vence']),
  ('136ccccc-0000-0000-0000-000000000002', '136aaaaa-0000-0000-0000-000000000000',
   '13611111-1111-1111-1111-111111111111', 'Famille Deux', array['Vence']),
  ('136ccccc-0000-0000-0000-000000000003', '136bbbbb-0000-0000-0000-000000000000',
   '13622222-2222-2222-2222-222222222222', 'Autre agence', array['Vence']);
insert into public.buyers (id, agency_id, advisor_id, name, cities, archived_at) values
  ('136ccccc-0000-0000-0000-000000000004', '136aaaaa-0000-0000-0000-000000000000',
   '13611111-1111-1111-1111-111111111111', 'Archivée', array['Vence'], now());

-- §1 — le plafond de la veille vaut 10 € par défaut ; un passage réserve et s'ouvre.
do $$
declare
  r record;
begin
  if (select buyer_watch_cap_cents from public.agencies where id = '136aaaaa-0000-0000-0000-000000000000') <> 1000 then
    raise exception 'FAIL 1: le plafond de la veille ne vaut pas 10 € par défaut';
  end if;
  select * into r from public.start_buyer_watch('136aaaaa-0000-0000-0000-000000000000',
    '136ccccc-0000-0000-0000-000000000001', 60, date_trunc('month', now()), 3000, now() - interval '7 days');
  if r.run_id is null or r.adverts <> 60 then
    raise exception 'FAIL 1: le passage ne s''ouvre pas avec sa réservation (%)', r.adverts;
  end if;
  if not exists (
    select 1 from public.stream_estate_usage u
    where u.id = r.reservation_id and u.reserved and u.buyer_watch
      and u.buyer_id = '136ccccc-0000-0000-0000-000000000001' and u.project_id is null and u.user_id is null
  ) then
    raise exception 'FAIL 1: la réservation n''est pas marquée veille';
  end if;
  if (select status from public.buyer_watch_runs where id = r.run_id) <> 'running' then
    raise exception 'FAIL 1: le passage ne commence pas « running »';
  end if;
  -- Le règlement reste celui de M105.
  perform public.settle_stream_estate_budget(r.reservation_id, 20);
  if (select adverts from public.stream_estate_usage where id = r.reservation_id) <> 20 then
    raise exception 'FAIL 1: le règlement ne s''applique pas';
  end if;
  update public.buyer_watch_runs set status = 'done', adverts = 20 where id = r.run_id;
end $$;

-- §2 — une fois par semaine.
do $$
declare
  r record;
  v_run uuid;
begin
  select * into r from public.start_buyer_watch('136aaaaa-0000-0000-0000-000000000000',
    '136ccccc-0000-0000-0000-000000000001', 60, date_trunc('month', now()), 3000, now() - interval '7 days');
  if r.run_id is not null then
    raise exception 'FAIL 2: un second passage la même semaine est accepté';
  end if;
  -- Un passage en échec ne compte pas.
  select * into r from public.start_buyer_watch('136aaaaa-0000-0000-0000-000000000000',
    '136ccccc-0000-0000-0000-000000000002', 20, date_trunc('month', now()), 3000, now() - interval '7 days');
  perform public.settle_stream_estate_budget(r.reservation_id, 0);
  update public.buyer_watch_runs set status = 'failed' where id = r.run_id;
  select * into r from public.start_buyer_watch('136aaaaa-0000-0000-0000-000000000000',
    '136ccccc-0000-0000-0000-000000000002', 20, date_trunc('month', now()), 3000, now() - interval '7 days');
  if r.run_id is null then
    raise exception 'FAIL 2: un passage en échec empêche le suivant';
  end if;
  perform public.settle_stream_estate_budget(r.reservation_id, 0);
  update public.buyer_watch_runs set status = 'done' where id = r.run_id;
  -- Un passage de plus de 6 jours laisse repartir (la date d'un passage semé par le serveur).
  insert into public.buyer_watch_runs (agency_id, buyer_id, ran_at, status, seen_since)
  values ('136aaaaa-0000-0000-0000-000000000000', '136ccccc-0000-0000-0000-000000000002',
          now() - interval '10 days', 'done', now() - interval '17 days')
  returning id into v_run;
  delete from public.buyer_watch_runs
    where buyer_id = '136ccccc-0000-0000-0000-000000000002' and id <> v_run;
  select * into r from public.start_buyer_watch('136aaaaa-0000-0000-0000-000000000000',
    '136ccccc-0000-0000-0000-000000000002', 20, date_trunc('month', now()), 3000, now() - interval '10 days');
  if r.run_id is null then
    raise exception 'FAIL 2: un passage de 10 jours empêche le suivant';
  end if;
  perform public.settle_stream_estate_budget(r.reservation_id, 0);
  delete from public.buyer_watch_runs where id = r.run_id;
end $$;

-- §3 — le plafond de la veille, puis celui de l'agence.
do $$
declare
  r record;
  r2 record;
begin
  -- 20 annonces déjà dépensées par la veille ; plafond de la veille à 50 : il en reste 30.
  update public.agencies set buyer_watch_cap_cents = 50 where id = '136aaaaa-0000-0000-0000-000000000000';
  delete from public.buyer_watch_runs where buyer_id = '136ccccc-0000-0000-0000-000000000002';
  select * into r from public.start_buyer_watch('136aaaaa-0000-0000-0000-000000000000',
    '136ccccc-0000-0000-0000-000000000002', 60, date_trunc('month', now()), 3000, now() - interval '7 days');
  if r.adverts <> 30 then
    raise exception 'FAIL 3: la veille dépasse son plafond (% au lieu de 30)', r.adverts;
  end if;
  perform public.settle_stream_estate_budget(r.reservation_id, 30);
  delete from public.buyer_watch_runs where id = r.run_id;
  -- Plafond de la veille atteint : rien.
  select * into r from public.start_buyer_watch('136aaaaa-0000-0000-0000-000000000000',
    '136ccccc-0000-0000-0000-000000000002', 60, date_trunc('month', now()), 3000, now() - interval '7 days');
  if r.run_id is not null then
    raise exception 'FAIL 3: la veille repart, plafond atteint';
  end if;
  if exists (select 1 from public.buyer_watch_runs where buyer_id = '136ccccc-0000-0000-0000-000000000002') then
    raise exception 'FAIL 3: un passage s''ouvre sans budget';
  end if;
  -- Les conseillers gardent tout le reste du budget de l'agence (3 000 − 50).
  select * into r2 from public.reserve_stream_estate_budget('136aaaaa-0000-0000-0000-000000000000',
    null, '13611111-1111-1111-1111-111111111111', 5000, date_trunc('month', now()), 3000);
  if r2.adverts <> 2950 then
    raise exception 'FAIL 3: la veille prive les conseillers (% au lieu de 2950)', r2.adverts;
  end if;
  -- Plafond de la veille relevé, mais l'agence n'a plus rien : rien.
  update public.agencies set buyer_watch_cap_cents = 100000 where id = '136aaaaa-0000-0000-0000-000000000000';
  select * into r from public.start_buyer_watch('136aaaaa-0000-0000-0000-000000000000',
    '136ccccc-0000-0000-0000-000000000002', 60, date_trunc('month', now()), 3000, now() - interval '7 days');
  if r.run_id is not null then
    raise exception 'FAIL 3: la veille dépasse le plafond de l''agence';
  end if;
  perform public.settle_stream_estate_budget(r2.reservation_id, 0);
  -- Plafond de la veille à 1 000 €, agence à 1 € : la veille ne prend que la moitié (50), moins ses
  -- 50 déjà dépensés : rien ; à 2 €, il lui reste 50.
  select * into r from public.start_buyer_watch('136aaaaa-0000-0000-0000-000000000000',
    '136ccccc-0000-0000-0000-000000000002', 60, date_trunc('month', now()), 100, now() - interval '7 days');
  if r.run_id is not null then
    raise exception 'FAIL 3: la veille prend plus de la moitié du plafond de l''agence';
  end if;
  select * into r from public.start_buyer_watch('136aaaaa-0000-0000-0000-000000000000',
    '136ccccc-0000-0000-0000-000000000002', 60, date_trunc('month', now()), 200, now() - interval '7 days');
  if r.adverts <> 50 then
    raise exception 'FAIL 3: la moitié du plafond de l''agence n''est pas respectée (%)', r.adverts;
  end if;
  perform public.settle_stream_estate_budget(r.reservation_id, 0);
  delete from public.buyer_watch_runs where id = r.run_id;
  -- Le mois précédent ne compte pas : avec `p_since` à demain, plus rien n'est dépensé.
  update public.agencies set buyer_watch_cap_cents = 50 where id = '136aaaaa-0000-0000-0000-000000000000';
  select * into r from public.start_buyer_watch('136aaaaa-0000-0000-0000-000000000000',
    '136ccccc-0000-0000-0000-000000000002', 60, now() + interval '1 day', 3000, now() - interval '7 days');
  if r.adverts <> 50 then
    raise exception 'FAIL 3: une consommation d''un autre mois compte (%)', r.adverts;
  end if;
  perform public.settle_stream_estate_budget(r.reservation_id, 0);
  delete from public.buyer_watch_runs where id = r.run_id;
  update public.agencies set buyer_watch_cap_cents = 1000 where id = '136aaaaa-0000-0000-0000-000000000000';
  -- Une valeur hors bornes est refusée.
  begin
    update public.agencies set buyer_watch_cap_cents = -1 where id = '136aaaaa-0000-0000-0000-000000000000';
    raise exception 'FAIL 3: un plafond négatif est accepté';
  exception when check_violation then null;
  end;
end $$;

-- §4 — fiche archivée, autre agence ; écriture vérifiée ; passage figé.
do $$
declare
  r record;
  v_run uuid;
begin
  select * into r from public.start_buyer_watch('136aaaaa-0000-0000-0000-000000000000',
    '136ccccc-0000-0000-0000-000000000004', 60, date_trunc('month', now()), 3000, now() - interval '7 days');
  if r.run_id is not null then
    raise exception 'FAIL 4: une fiche archivée est veillée';
  end if;
  select * into r from public.start_buyer_watch('136aaaaa-0000-0000-0000-000000000000',
    '136ccccc-0000-0000-0000-000000000003', 60, date_trunc('month', now()), 3000, now() - interval '7 days');
  if r.run_id is not null then
    raise exception 'FAIL 4: la fiche d''une autre agence est veillée';
  end if;
  begin
    insert into public.buyer_watch_runs (agency_id, buyer_id, seen_since)
    values ('136aaaaa-0000-0000-0000-000000000000', '136ccccc-0000-0000-0000-000000000003', now());
    raise exception 'FAIL 4: un passage s''écrit sur la fiche d''une autre agence';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_watch_runs (agency_id, buyer_id, seen_since, finds)
    values ('136aaaaa-0000-0000-0000-000000000000', '136ccccc-0000-0000-0000-000000000001', now(), '{}');
    raise exception 'FAIL 4: des biens trouvés hors liste sont acceptés';
  exception when check_violation then null;
  end;
  select id into v_run from public.buyer_watch_runs
    where buyer_id = '136ccccc-0000-0000-0000-000000000001' limit 1;
  update public.buyer_watch_runs
    set buyer_id = '136ccccc-0000-0000-0000-000000000002', ran_at = now() - interval '30 days',
        seen_since = now() - interval '60 days', found_count = 2
    where id = v_run;
  if (select buyer_id from public.buyer_watch_runs where id = v_run) <> '136ccccc-0000-0000-0000-000000000001'
     or (select ran_at from public.buyer_watch_runs where id = v_run) < now() - interval '1 day'
     or (select seen_since from public.buyer_watch_runs where id = v_run) < now() - interval '8 days'
     or (select found_count from public.buyer_watch_runs where id = v_run) <> 2 then
    raise exception 'FAIL 4: l''acquéreur ou les dates d''un passage ont changé, ou son résultat ne s''écrit pas';
  end if;
end $$;

-- §5 — le navigateur.
do $$
begin
  if has_table_privilege('authenticated', 'public.buyer_watch_runs', 'insert')
     or has_table_privilege('authenticated', 'public.buyer_watch_runs', 'update')
     or has_table_privilege('authenticated', 'public.buyer_watch_runs', 'delete')
     or has_table_privilege('anon', 'public.buyer_watch_runs', 'select') then
    raise exception 'FAIL 5: le navigateur a un droit d''écriture, ou un anonyme lit';
  end if;
  if has_column_privilege('authenticated', 'public.agencies', 'buyer_watch_cap_cents', 'update') then
    raise exception 'FAIL 5: le navigateur règle le plafond de la veille';
  end if;
  if has_function_privilege('authenticated',
       'public.start_buyer_watch(uuid,uuid,integer,timestamptz,integer,timestamptz)', 'execute')
     or has_function_privilege('anon',
       'public.start_buyer_watch(uuid,uuid,integer,timestamptz,integer,timestamptz)', 'execute') then
    raise exception 'FAIL 5: le navigateur ouvre un passage';
  end if;
end $$;
select set_config('request.jwt.claims',
  '{"sub":"13611111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.buyer_watch_runs) <> 1 then
    raise exception 'FAIL 5: l''agence ne lit pas ses passages';
  end if;
  begin
    update public.agencies set buyer_watch_cap_cents = 5000 where id = '136aaaaa-0000-0000-0000-000000000000';
    raise exception 'FAIL 5: un manager relève le plafond de la veille depuis le navigateur';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select set_config('request.jwt.claims',
  '{"sub":"13622222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.buyer_watch_runs) <> 0 then
    raise exception 'FAIL 5: une autre agence lit les passages';
  end if;
end $$;
reset role;
select set_config('request.jwt.claims',
  '{"sub":"13633333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.buyer_watch_runs) <> 0 then
    raise exception 'FAIL 5: un membre retiré lit les passages';
  end if;
end $$;
reset role;

-- §6 — la fiche supprimée emporte ses passages ; la consommation reste, sans fiche.
do $$
begin
  delete from public.buyers where id = '136ccccc-0000-0000-0000-000000000001';
  if exists (select 1 from public.buyer_watch_runs where buyer_id = '136ccccc-0000-0000-0000-000000000001') then
    raise exception 'FAIL 6: la fiche supprimée laisse ses passages';
  end if;
  if not exists (
    select 1 from public.stream_estate_usage
    where agency_id = '136aaaaa-0000-0000-0000-000000000000' and buyer_watch and buyer_id is null and adverts = 20
  ) then
    raise exception 'FAIL 6: la consommation de la veille part avec la fiche';
  end if;
end $$;

-- §7 (M155, question de Jean-Guy, 13/11) — une agence réelle à 0 € : aucun passage, aucune
-- réservation, et la tâche de nuit ne la choisit pas (`is_demo` faux ET plafond > 0, la route
-- /api/cron/veille-acquereurs).
do $$
declare r record; n integer;
begin
  delete from public.buyer_watch_runs where agency_id = '136bbbbb-0000-0000-0000-000000000000';
  update public.agencies set buyer_watch_cap_cents = 0 where id = '136bbbbb-0000-0000-0000-000000000000';
  select * into r from public.start_buyer_watch('136bbbbb-0000-0000-0000-000000000000',
    '136ccccc-0000-0000-0000-000000000003', 20, date_trunc('month', now()), 3000, now() - interval '7 days');
  if r.run_id is not null then
    raise exception 'FAIL 7: à 0 €, un passage s''ouvre';
  end if;
  select count(*) into n from public.buyer_watch_runs where agency_id = '136bbbbb-0000-0000-0000-000000000000';
  if n <> 0 then raise exception 'FAIL 7: à 0 €, % passage(s)', n; end if;
  if exists (
    select 1 from public.stream_estate_usage
    where agency_id = '136bbbbb-0000-0000-0000-000000000000' and buyer_watch
  ) then
    raise exception 'FAIL 7: à 0 €, une réservation de veille';
  end if;
  if exists (
    select 1 from public.agencies
    where id = '136bbbbb-0000-0000-0000-000000000000' and is_demo = false and buyer_watch_cap_cents > 0
  ) then
    raise exception 'FAIL 7: la tâche de nuit choisirait l''agence à 0 €';
  end if;
end $$;

rollback;
