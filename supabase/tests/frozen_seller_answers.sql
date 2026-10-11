-- Mission 92 — les réponses du vendeur qui mesurent la méthode sont figées, à la SOURCE DE
-- VÉRITÉ, en jouant le navigateur d'un conseiller (rôle authenticated, RLS active) :
--   §1 la première écriture passe (devinette de prix, de durée, valeur perçue) ;
--   §2 les réécrire — autre valeur ou vide — est refusé : la première valeur reste ;
--   §3 les autres réponses restent modifiables ;
--   §4 ni suppression directe, ni rattachement à un autre concurrent ou dossier ;
--   §5 supprimer le concurrent emporte toujours sa réponse.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/frozen_seller_answers.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values ('92111111-1111-1111-1111-111111111111');
insert into public.agencies (id, name) values ('92aaaaaa-0000-0000-0000-000000000000', 'A92');
insert into public.profiles (id, agency_id, first_name, last_name, email, role)
  values ('92111111-1111-1111-1111-111111111111', '92aaaaaa-0000-0000-0000-000000000000',
          'Al', 'A', 'a92@t.l', 'advisor');
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('92cccccc-0000-0000-0000-000000000001', '92aaaaaa-0000-0000-0000-000000000000',
   '92111111-1111-1111-1111-111111111111', 'figé', 'ready_for_meeting'),
  ('92cccccc-0000-0000-0000-000000000002', '92aaaaaa-0000-0000-0000-000000000000',
   '92111111-1111-1111-1111-111111111111', 'autre', 'ready_for_meeting');
insert into public.comparables (id, project_id, agency_id, price, display_order) values
  ('92dddddd-0000-0000-0000-000000000001', '92cccccc-0000-0000-0000-000000000001',
   '92aaaaaa-0000-0000-0000-000000000000', 300000, 1),
  ('92dddddd-0000-0000-0000-000000000002', '92cccccc-0000-0000-0000-000000000001',
   '92aaaaaa-0000-0000-0000-000000000000', 310000, 2);

-- Le navigateur du conseiller.
select set_config('request.jwt.claims',
  '{"sub":"92111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;

-- §1 — la première écriture passe, même en deux temps (la ligne existe avant la devinette).
do $$
declare r public.live_seller_responses%rowtype; s public.live_seller_summary%rowtype;
begin
  insert into public.live_seller_responses (project_id, comparable_id, agency_id,
                                            seller_serious_competitor)
    values ('92cccccc-0000-0000-0000-000000000001', '92dddddd-0000-0000-0000-000000000001',
            '92aaaaaa-0000-0000-0000-000000000000', 'yes');
  update public.live_seller_responses set seller_estimated_listing_price = 320000
    where comparable_id = '92dddddd-0000-0000-0000-000000000001';
  update public.live_seller_responses set seller_estimated_days_on_market = 90
    where comparable_id = '92dddddd-0000-0000-0000-000000000001';
  select * into r from public.live_seller_responses
    where comparable_id = '92dddddd-0000-0000-0000-000000000001';
  if r.seller_estimated_listing_price is distinct from 320000
     or r.seller_estimated_days_on_market is distinct from 90 then
    raise exception 'FAIL 1: première devinette non enregistrée (% / %)',
      r.seller_estimated_listing_price, r.seller_estimated_days_on_market;
  end if;

  insert into public.live_seller_summary (project_id, agency_id, seller_property_confirmed)
    values ('92cccccc-0000-0000-0000-000000000001', '92aaaaaa-0000-0000-0000-000000000000', 'yes');
  update public.live_seller_summary set seller_perceived_property_price = 350000
    where project_id = '92cccccc-0000-0000-0000-000000000001';
  select * into s from public.live_seller_summary
    where project_id = '92cccccc-0000-0000-0000-000000000001';
  if s.seller_perceived_property_price is distinct from 350000 then
    raise exception 'FAIL 1: première valeur perçue non enregistrée (%)',
      s.seller_perceived_property_price;
  end if;
end $$;

-- §2 — réécrire est refusé : autre valeur, ou vide, la première reste.
do $$
declare r public.live_seller_responses%rowtype; s public.live_seller_summary%rowtype;
begin
  update public.live_seller_responses
    set seller_estimated_listing_price = 299000, seller_estimated_days_on_market = 10
    where comparable_id = '92dddddd-0000-0000-0000-000000000001';
  update public.live_seller_responses
    set seller_estimated_listing_price = null, seller_estimated_days_on_market = null
    where comparable_id = '92dddddd-0000-0000-0000-000000000001';
  select * into r from public.live_seller_responses
    where comparable_id = '92dddddd-0000-0000-0000-000000000001';
  if r.seller_estimated_listing_price is distinct from 320000
     or r.seller_estimated_days_on_market is distinct from 90 then
    raise exception 'FAIL 2: devinette réécrite (% / %)',
      r.seller_estimated_listing_price, r.seller_estimated_days_on_market;
  end if;

  update public.live_seller_summary set seller_perceived_property_price = 500000
    where project_id = '92cccccc-0000-0000-0000-000000000001';
  update public.live_seller_summary set seller_perceived_property_price = null
    where project_id = '92cccccc-0000-0000-0000-000000000001';
  select * into s from public.live_seller_summary
    where project_id = '92cccccc-0000-0000-0000-000000000001';
  if s.seller_perceived_property_price is distinct from 350000 then
    raise exception 'FAIL 2: valeur perçue réécrite (%)', s.seller_perceived_property_price;
  end if;
end $$;

-- §3 — le reste se modifie comme avant.
do $$
declare r public.live_seller_responses%rowtype; s public.live_seller_summary%rowtype;
begin
  update public.live_seller_responses
    set seller_serious_competitor = 'no', seller_market_duration_comment = 'cher'
    where comparable_id = '92dddddd-0000-0000-0000-000000000001';
  select * into r from public.live_seller_responses
    where comparable_id = '92dddddd-0000-0000-0000-000000000001';
  if r.seller_serious_competitor is distinct from 'no'
     or r.seller_market_duration_comment is distinct from 'cher' then
    raise exception 'FAIL 3: une réponse libre ne se modifie plus';
  end if;

  update public.live_seller_summary
    set seller_most_dangerous_comparable_id = '92dddddd-0000-0000-0000-000000000002'
    where project_id = '92cccccc-0000-0000-0000-000000000001';
  update public.live_seller_summary
    set seller_most_dangerous_comparable_id = '92dddddd-0000-0000-0000-000000000001'
    where project_id = '92cccccc-0000-0000-0000-000000000001';
  select * into s from public.live_seller_summary
    where project_id = '92cccccc-0000-0000-0000-000000000001';
  if s.seller_most_dangerous_comparable_id is distinct from '92dddddd-0000-0000-0000-000000000001' then
    raise exception 'FAIL 3: le concurrent le plus dangereux ne se modifie plus';
  end if;
end $$;

-- §4 — ni suppression directe, ni rattachement ailleurs.
do $$
declare n int; r public.live_seller_responses%rowtype;
begin
  begin
    delete from public.live_seller_responses
      where comparable_id = '92dddddd-0000-0000-0000-000000000001';
    raise exception 'FAIL 4: suppression directe d''une réponse acceptée';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.live_seller_summary
      where project_id = '92cccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 4: suppression directe d''un résumé accepté';
  exception when insufficient_privilege then null;
  end;

  update public.live_seller_responses
    set comparable_id = '92dddddd-0000-0000-0000-000000000002'
    where comparable_id = '92dddddd-0000-0000-0000-000000000001';
  select * into r from public.live_seller_responses
    where project_id = '92cccccc-0000-0000-0000-000000000001';
  if r.comparable_id is distinct from '92dddddd-0000-0000-0000-000000000001' then
    raise exception 'FAIL 4: réponse rattachée à un autre concurrent';
  end if;

  update public.live_seller_summary set project_id = '92cccccc-0000-0000-0000-000000000002'
    where project_id = '92cccccc-0000-0000-0000-000000000001';
  select count(*) into n from public.live_seller_summary
    where project_id = '92cccccc-0000-0000-0000-000000000001'
      and seller_perceived_property_price = 350000;
  if n <> 1 then
    raise exception 'FAIL 4: résumé rattaché à un autre dossier';
  end if;
end $$;

-- §5 — supprimer le concurrent emporte sa réponse (clé étrangère), comme avant.
do $$
declare n int;
begin
  update public.live_seller_summary set seller_most_dangerous_comparable_id = null
    where project_id = '92cccccc-0000-0000-0000-000000000001';
  delete from public.comparables where id = '92dddddd-0000-0000-0000-000000000001';
  select count(*) into n from public.live_seller_responses
    where project_id = '92cccccc-0000-0000-0000-000000000001';
  if n <> 0 then
    raise exception 'FAIL 5: la réponse a survécu à son concurrent (%)', n;
  end if;
end $$;

reset role;
rollback;
