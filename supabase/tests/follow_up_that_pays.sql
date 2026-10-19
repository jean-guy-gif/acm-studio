-- Mission 96 — la relance qui rapporte, prouvée dans la base.
--   §1 le motif de relance : posé à la conclusion, gardé par un appel sans motif (code de
--      `main`), remplacé par un nouveau, tombé quand le dossier n'est plus « à relancer » ;
--      la précision ne suit que « Autre » ; un motif hors liste est refusé ;
--   §2 les appels du code de `main` (13 et 6 arguments) passent toujours ;
--   §3 l'historique des relances, vu comme le voit le navigateur : un conseiller ajoute et
--      relit les relances de SON agence ; une agence ne lit ni n'écrit celles d'une autre ;
--   §4 l'ajout ne choisit pas la date et ne signe pas à la place d'un collègue ; ni
--      modification ni retrait ; un membre retiré ne lit plus rien ; une note tient en une ligne ;
--   §5 le prix révélé se fige à l'instant où la devinette est enregistrée, ne suit pas une
--      baisse ultérieure, et le navigateur ne le choisit pas ;
--   §6 une devinette donnée AVANT la mission ne fige rien après coup.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/follow_up_that_pays.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

-- Agence A (conseillers C1, C2 et R, retiré), agence B (conseiller CB).
insert into auth.users (id, email) values
  ('96000000-0000-0000-0000-0000000000c1', 'c1@a96.test'),
  ('96000000-0000-0000-0000-0000000000c2', 'c2@a96.test'),
  ('96000000-0000-0000-0000-0000000000d1', 'retire@a96.test'),
  ('96000000-0000-0000-0000-0000000000b1', 'c@b96.test');
insert into public.agencies (id, name) values
  ('96aaaaaa-0000-0000-0000-000000000000', 'Agence A 96'),
  ('96bbbbbb-0000-0000-0000-000000000000', 'Agence B 96');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, removed_at) values
  ('96000000-0000-0000-0000-0000000000c1', '96aaaaaa-0000-0000-0000-000000000000', 'Carl', 'Un', 'c1@a96.test', 'advisor', null),
  ('96000000-0000-0000-0000-0000000000c2', '96aaaaaa-0000-0000-0000-000000000000', 'Cora', 'Deux', 'c2@a96.test', 'advisor', null),
  ('96000000-0000-0000-0000-0000000000d1', '96aaaaaa-0000-0000-0000-000000000000', 'Rémi', 'Retiré', 'retire@a96.test', 'advisor', now()),
  ('96000000-0000-0000-0000-0000000000b1', '96bbbbbb-0000-0000-0000-000000000000', 'Boris', 'Autre', 'c@b96.test', 'advisor', null);
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('96cccccc-0000-0000-0000-000000000001', '96aaaaaa-0000-0000-0000-000000000000',
   '96000000-0000-0000-0000-0000000000c1', 'dossier A1', 'ready_for_meeting'),
  ('96cccccc-0000-0000-0000-000000000002', '96aaaaaa-0000-0000-0000-000000000000',
   '96000000-0000-0000-0000-0000000000c1', 'dossier A2', 'ready_for_meeting'),
  ('96cccccc-0000-0000-0000-0000000000b1', '96bbbbbb-0000-0000-0000-000000000000',
   '96000000-0000-0000-0000-0000000000b1', 'dossier B1', 'ready_for_meeting');
insert into public.comparables (id, project_id, agency_id, price, display_order) values
  ('96dddddd-0000-0000-0000-000000000001', '96cccccc-0000-0000-0000-000000000001',
   '96aaaaaa-0000-0000-0000-000000000000', 300000, 1),
  ('96dddddd-0000-0000-0000-000000000002', '96cccccc-0000-0000-0000-000000000001',
   '96aaaaaa-0000-0000-0000-000000000000', 310000, 2),
  ('96dddddd-0000-0000-0000-000000000003', '96cccccc-0000-0000-0000-000000000001',
   '96aaaaaa-0000-0000-0000-000000000000', 320000, 3),
  ('96dddddd-0000-0000-0000-000000000004', '96cccccc-0000-0000-0000-000000000001',
   '96aaaaaa-0000-0000-0000-000000000000', 330000, 4);

-- §6 (préparation) — une devinette d'AVANT la mission : la ligne existe déjà, sans prix révélé.
-- On la pose trigger coupé, comme elle l'était avant la migration.
alter table public.live_seller_responses disable trigger live_seller_responses_freeze_revealed_price;
insert into public.live_seller_responses (project_id, comparable_id, agency_id,
                                          seller_estimated_listing_price)
  values ('96cccccc-0000-0000-0000-000000000001', '96dddddd-0000-0000-0000-000000000004',
          '96aaaaaa-0000-0000-0000-000000000000', 325000);
alter table public.live_seller_responses enable trigger live_seller_responses_freeze_revealed_price;

-- Une relance posée dans l'agence B (hors navigateur).
insert into public.follow_up_contacts (project_id, agency_id, author_id, note) values
  ('96cccccc-0000-0000-0000-0000000000b1', '96bbbbbb-0000-0000-0000-000000000000',
   '96000000-0000-0000-0000-0000000000b1', 'relance de B');

-- =====================================================================
-- §1 et §2 — le motif de relance, par les fonctions (rôle serveur).
-- =====================================================================
do $$
declare
  r public.project_meeting_conclusions%rowtype;
  p constant uuid := '96cccccc-0000-0000-0000-000000000001';
  a constant uuid := '96aaaaaa-0000-0000-0000-000000000000';
  v_refused boolean;
begin
  perform public.conclude_meeting(p, a, 'follow_up', 'note libre', null, 300000, null, 300000,
    p_follow_up_motive => 'thinking_price', p_follow_up_motive_detail => 'ignorée hors Autre');
  select * into r from public.project_meeting_conclusions where project_id = p;
  if r.follow_up_motive is distinct from 'thinking_price' or r.follow_up_motive_detail is not null
     or r.follow_up_reason is distinct from 'note libre' then
    raise exception 'FAIL §1 motif à la conclusion : % / % / %',
      r.follow_up_motive, r.follow_up_motive_detail, r.follow_up_reason;
  end if;

  -- §2 — l'appel du code de `main` (13 arguments nommés, sans motif) passe et GARDE le motif.
  perform public.conclude_meeting(
    p_project_id => p, p_agency_id => a, p_outcome => 'follow_up', p_reason => 'autre note',
    p_price => null, p_market_computed => null, p_advisor_analysis => null,
    p_advisor_price => null, p_seller_wanted => null, p_seller_perceived => null,
    p_retained => null, p_exploitable => null, p_mandate_type => null);
  select * into r from public.project_meeting_conclusions where project_id = p;
  if r.follow_up_motive is distinct from 'thinking_price' then
    raise exception 'FAIL §2 conclude_meeting sans motif a perdu le motif : %', r.follow_up_motive;
  end if;
  perform public.change_meeting_outcome(
    p_project_id => p, p_agency_id => a, p_outcome => 'follow_up', p_reason => 'encore',
    p_mandate_type => null, p_price => null);
  select * into r from public.project_meeting_conclusions where project_id = p;
  if r.follow_up_motive is distinct from 'thinking_price' then
    raise exception 'FAIL §2 change_meeting_outcome sans motif a perdu le motif : %', r.follow_up_motive;
  end if;

  -- Un nouveau motif remplace l'ancien ; « Autre » porte sa précision, rognée.
  perform public.change_meeting_outcome(p, a, 'follow_up', null, null, null,
    'other', '  attend la succession  ');
  select * into r from public.project_meeting_conclusions where project_id = p;
  if r.follow_up_motive is distinct from 'other'
     or r.follow_up_motive_detail is distinct from 'attend la succession' then
    raise exception 'FAIL §1 Autre : % / %', r.follow_up_motive, r.follow_up_motive_detail;
  end if;

  -- Un motif de la liste efface la précision d'« Autre ».
  perform public.change_meeting_outcome(p, a, 'follow_up', null, null, null, 'awaiting_estimate');
  select * into r from public.project_meeting_conclusions where project_id = p;
  if r.follow_up_motive is distinct from 'awaiting_estimate' or r.follow_up_motive_detail is not null then
    raise exception 'FAIL §1 précision restée : % / %', r.follow_up_motive, r.follow_up_motive_detail;
  end if;

  -- Un motif hors liste est refusé.
  v_refused := false;
  begin
    perform public.change_meeting_outcome(p, a, 'follow_up', null, null, null, 'hesite');
  exception when others then v_refused := true;
  end;
  if not v_refused then
    raise exception 'FAIL §1 un motif hors liste a été accepté';
  end if;

  -- Le dossier n'est plus « à relancer » : le motif tombe, même si on en envoie un.
  perform public.change_meeting_outcome(p, a, 'withdrawn', 'projet reporté', null, null,
    'thinking_price');
  select * into r from public.project_meeting_conclusions where project_id = p;
  if r.follow_up_motive is not null or r.follow_up_motive_detail is not null then
    raise exception 'FAIL §1 motif resté sur un dossier retiré : %', r.follow_up_motive;
  end if;

  -- Retour en « à relancer » pour la suite.
  perform public.change_meeting_outcome(p, a, 'follow_up', null, null, null, 'thinking_price');
end $$;

-- Se présenter comme le navigateur d'un utilisateur : rôle `authenticated` + identité du jeton.
create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
grant execute on function pg_temp.act_as(uuid) to authenticated;

create function pg_temp.attempt(p_sql text) returns text language plpgsql as $$
declare v_rows int;
begin
  execute p_sql;
  get diagnostics v_rows = row_count;
  return v_rows::text;
exception
  when insufficient_privilege then return 'refus';
  when check_violation then return 'invalide';
end $$;
grant execute on function pg_temp.attempt(text) to authenticated;

create function pg_temp.expect(p_label text, p_got text, p_want text) returns void
language plpgsql as $$
begin
  if p_got is distinct from p_want then
    raise exception 'FAIL % : attendu %, obtenu %', p_label, p_want, p_got;
  end if;
end $$;
grant execute on function pg_temp.expect(text, text, text) to authenticated;

create function pg_temp.visible() returns text language sql as $$
  select coalesce(string_agg(coalesce(note, '(sans note)'), ' | ' order by note), '')
  from public.follow_up_contacts
$$;
grant execute on function pg_temp.visible() to authenticated;

-- =====================================================================
-- §3 — le conseiller C1 de l'agence A.
-- =====================================================================
select pg_temp.act_as('96000000-0000-0000-0000-0000000000c1');

select pg_temp.expect('§3 consigner une relance',
  pg_temp.attempt($$insert into public.follow_up_contacts (project_id, agency_id, author_id, note)
                    values ('96cccccc-0000-0000-0000-000000000001',
                            '96aaaaaa-0000-0000-0000-000000000000',
                            '96000000-0000-0000-0000-0000000000c1', 'message laissé')$$), '1');
select pg_temp.expect('§3 une relance sans note',
  pg_temp.attempt($$insert into public.follow_up_contacts (project_id, agency_id, author_id)
                    values ('96cccccc-0000-0000-0000-000000000001',
                            '96aaaaaa-0000-0000-0000-000000000000',
                            '96000000-0000-0000-0000-0000000000c1')$$), '1');
select pg_temp.expect('§3 relire les relances de son agence, et elles seules', pg_temp.visible(),
  'message laissé | (sans note)');
select pg_temp.expect('§3 la date est celle de la base',
  (select count(*)::text from public.follow_up_contacts
    where contacted_at between now() - interval '1 minute' and now() + interval '1 minute'), '2');

-- Une agence n'écrit pas dans l'historique d'une autre, ni sur le dossier d'une autre.
select pg_temp.expect('§3 écrire dans l''agence B',
  pg_temp.attempt($$insert into public.follow_up_contacts (project_id, agency_id, author_id)
                    values ('96cccccc-0000-0000-0000-0000000000b1',
                            '96bbbbbb-0000-0000-0000-000000000000',
                            '96000000-0000-0000-0000-0000000000c1')$$), 'refus');
select pg_temp.expect('§3 rattacher à son agence le dossier d''une autre',
  pg_temp.attempt($$insert into public.follow_up_contacts (project_id, agency_id, author_id)
                    values ('96cccccc-0000-0000-0000-0000000000b1',
                            '96aaaaaa-0000-0000-0000-000000000000',
                            '96000000-0000-0000-0000-0000000000c1')$$), 'refus');

-- §4 — ni la date, ni l'auteur d'un collègue, ni modification, ni retrait.
select pg_temp.expect('§4 choisir la date',
  pg_temp.attempt($$insert into public.follow_up_contacts
                      (project_id, agency_id, author_id, contacted_at)
                    values ('96cccccc-0000-0000-0000-000000000001',
                            '96aaaaaa-0000-0000-0000-000000000000',
                            '96000000-0000-0000-0000-0000000000c1', now() - interval '30 days')$$),
  'refus');
select pg_temp.expect('§4 signer à la place d''un collègue',
  pg_temp.attempt($$insert into public.follow_up_contacts (project_id, agency_id, author_id)
                    values ('96cccccc-0000-0000-0000-000000000001',
                            '96aaaaaa-0000-0000-0000-000000000000',
                            '96000000-0000-0000-0000-0000000000c2')$$), 'refus');
select pg_temp.expect('§4 modifier une relance',
  pg_temp.attempt($$update public.follow_up_contacts set note = 'réécrite'$$), 'refus');
select pg_temp.expect('§4 retirer une relance',
  pg_temp.attempt($$delete from public.follow_up_contacts$$), 'refus');
select pg_temp.expect('§4 une note de deux lignes',
  pg_temp.attempt($$insert into public.follow_up_contacts (project_id, agency_id, author_id, note)
                    values ('96cccccc-0000-0000-0000-000000000001',
                            '96aaaaaa-0000-0000-0000-000000000000',
                            '96000000-0000-0000-0000-0000000000c1', E'ligne 1\nligne 2')$$),
  'invalide');

-- L'agence B ne voit que les siennes.
select pg_temp.act_as('96000000-0000-0000-0000-0000000000b1');
select pg_temp.expect('§3 l''agence B ne lit pas les relances de l''agence A', pg_temp.visible(),
  'relance de B');

-- Un membre retiré ne lit plus rien et n'ajoute rien.
select pg_temp.act_as('96000000-0000-0000-0000-0000000000d1');
select pg_temp.expect('§4 un membre retiré ne lit plus les relances', pg_temp.visible(), '');
select pg_temp.expect('§4 un membre retiré n''ajoute rien',
  pg_temp.attempt($$insert into public.follow_up_contacts (project_id, agency_id, author_id)
                    values ('96cccccc-0000-0000-0000-000000000001',
                            '96aaaaaa-0000-0000-0000-000000000000',
                            '96000000-0000-0000-0000-0000000000d1')$$), 'refus');

-- =====================================================================
-- §5 — le prix révélé, dans le navigateur du conseiller C1.
-- =====================================================================
-- Mission 109 — un Live ne s'écrit que sur un dossier pas encore conclu : le dossier A1, conclu
-- plus haut pour les §1 à §4, est remis « prêt » pour ce Live.
reset role;
update public.projects set status = 'ready_for_meeting'
  where id = '96cccccc-0000-0000-0000-000000000001';
select pg_temp.act_as('96000000-0000-0000-0000-0000000000c1');

do $$
declare
  r public.live_seller_responses%rowtype;
  p constant uuid := '96cccccc-0000-0000-0000-000000000001';
  a constant uuid := '96aaaaaa-0000-0000-0000-000000000000';
  c1 constant uuid := '96dddddd-0000-0000-0000-000000000001';
  c2 constant uuid := '96dddddd-0000-0000-0000-000000000002';
  c3 constant uuid := '96dddddd-0000-0000-0000-000000000003';
  c4 constant uuid := '96dddddd-0000-0000-0000-000000000004';
begin
  -- En deux temps (« sérieux ? » puis la devinette) : rien n'est figé avant la devinette, même
  -- si le navigateur envoie un prix dans la colonne.
  insert into public.live_seller_responses (project_id, comparable_id, agency_id,
                                            seller_serious_competitor, revealed_listing_price)
    values (p, c1, a, 'yes', 999);
  select * into r from public.live_seller_responses where comparable_id = c1;
  if r.revealed_listing_price is not null then
    raise exception 'FAIL §5 prix figé avant la devinette : %', r.revealed_listing_price;
  end if;

  -- La devinette arrive : le prix affiché est figé par la base, pas celui du navigateur.
  update public.live_seller_responses
    set seller_estimated_listing_price = 290000, revealed_listing_price = 1
    where comparable_id = c1;
  select * into r from public.live_seller_responses where comparable_id = c1;
  if r.revealed_listing_price is distinct from 300000 then
    raise exception 'FAIL §5 prix révélé à la devinette : %', r.revealed_listing_price;
  end if;

  -- En un temps (rythme accéléré) : insertion avec la devinette.
  insert into public.live_seller_responses (project_id, comparable_id, agency_id,
                                            seller_estimated_listing_price, revealed_listing_price)
    values (p, c2, a, 305000, 1);
  select * into r from public.live_seller_responses where comparable_id = c2;
  if r.revealed_listing_price is distinct from 310000 then
    raise exception 'FAIL §5 prix révélé à l''insertion : %', r.revealed_listing_price;
  end if;

  -- « Non » à « sérieux concurrent ? » : pas de devinette, donc rien de révélé ni de figé.
  insert into public.live_seller_responses (project_id, comparable_id, agency_id,
                                            seller_serious_competitor)
    values (p, c3, a, 'no');
  select * into r from public.live_seller_responses where comparable_id = c3;
  if r.revealed_listing_price is not null then
    raise exception 'FAIL §5 prix figé sans devinette : %', r.revealed_listing_price;
  end if;

  -- §6 — la devinette d'avant la mission : une réponse de plus ne fige rien après coup.
  update public.live_seller_responses set seller_estimated_days_on_market = 60
    where comparable_id = c4;
  select * into r from public.live_seller_responses where comparable_id = c4;
  if r.revealed_listing_price is not null or r.seller_estimated_days_on_market is distinct from 60 then
    raise exception 'FAIL §6 Live d''avant : % / %', r.revealed_listing_price,
      r.seller_estimated_days_on_market;
  end if;
end $$;

-- Le concurrent baisse son prix APRÈS le rendez-vous (rôle serveur : l'import le fait).
reset role;
update public.comparables set price = 285000 where id = '96dddddd-0000-0000-0000-000000000001';
select pg_temp.act_as('96000000-0000-0000-0000-0000000000c1');

do $$
declare
  r public.live_seller_responses%rowtype;
  c1 constant uuid := '96dddddd-0000-0000-0000-000000000001';
begin
  -- Une autre réponse du même écran, puis une tentative de réécriture : le prix figé reste.
  update public.live_seller_responses set seller_estimated_days_on_market = 45
    where comparable_id = c1;
  update public.live_seller_responses set revealed_listing_price = 285000
    where comparable_id = c1;
  update public.live_seller_responses set revealed_listing_price = null
    where comparable_id = c1;
  select * into r from public.live_seller_responses where comparable_id = c1;
  if r.revealed_listing_price is distinct from 300000 then
    raise exception 'FAIL §5 le prix révélé a bougé après la baisse : %', r.revealed_listing_price;
  end if;
end $$;

reset role;
rollback;

select 'Mission 96 — relance : tout est vert' as resultat;
