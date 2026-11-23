-- Mission 104 — rouvrir un Live figé par erreur, à la SOURCE DE VÉRITÉ :
--   §1 le navigateur (conseiller ou manager) n'appelle pas reopen_live et ne lit pas la trace ;
--   §2 le serveur rouvre : trace (qui, motif, réponses effacées), réponses et résumé effacés,
--      début et fin remis à zéro ;
--   §3 hors de reopen_live, le début du Live ne se remet toujours pas à zéro (M95) ;
--   §4 refusé sans motif, sur un dossier conclu ou archivé, ou quand il n'y a rien à rouvrir ;
--   §5 la trace part avec son dossier.
-- Mission 164 — un Live rouvert oublie le prix qu'il avait enregistré :
--   §6 la réouverture supprime la ligne de conclusion sans issue (née de « Sur quel prix
--      partons-nous ? »), la trace dit que le prix a été retiré, sans aucun montant ; un nouveau
--      prix refait une ligne neuve ; la conclusion d'un autre dossier, conclu ou non, ne bouge
--      pas ; un refus ne touche à rien ; sans prix, la trace dit qu'aucun n'a été retiré ; une
--      ligne qui porte une issue n'est jamais supprimée.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/live_reopening.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values
  ('10357913-1111-1111-1111-111111111111'),
  ('10359715-2222-2222-2222-222222222222');
insert into public.agencies (id, name) values ('104aaaaa-0000-0000-0000-000000000000', 'A104');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('10357913-1111-1111-1111-111111111111', '104aaaaa-0000-0000-0000-000000000000',
   'Al', 'A', 'a104@t.l', 'advisor'),
  ('10359715-2222-2222-2222-222222222222', '104aaaaa-0000-0000-0000-000000000000',
   'Ma', 'M', 'm104@t.l', 'manager');
insert into public.projects (id, agency_id, advisor_id, seller_name, status, live_started_at, live_ended_at) values
  ('104ccccc-0000-0000-0000-000000000001', '104aaaaa-0000-0000-0000-000000000000',
   '10357913-1111-1111-1111-111111111111', 'figé par erreur', 'ready_for_meeting',
   null, null),
  ('104ccccc-0000-0000-0000-000000000002', '104aaaaa-0000-0000-0000-000000000000',
   '10357913-1111-1111-1111-111111111111', 'conclu', 'meeting_completed', null, null),
  ('104ccccc-0000-0000-0000-000000000003', '104aaaaa-0000-0000-0000-000000000000',
   '10357913-1111-1111-1111-111111111111', 'jamais lancé', 'ready_for_meeting', null, null),
  -- Mission 164 — un autre Live avec son prix, jamais rouvert ; un Live commencé sans prix ; un
  -- Live commencé dont la ligne porte une issue (inatteignable par le code, gardé par la base).
  ('104ccccc-0000-0000-0000-000000000004', '104aaaaa-0000-0000-0000-000000000000',
   '10357913-1111-1111-1111-111111111111', 'autre Live', 'ready_for_meeting',
   '2026-10-14 11:00:00+00', null),
  ('104ccccc-0000-0000-0000-000000000005', '104aaaaa-0000-0000-0000-000000000000',
   '10357913-1111-1111-1111-111111111111', 'Live sans prix', 'ready_for_meeting',
   '2026-10-14 12:00:00+00', null),
  ('104ccccc-0000-0000-0000-000000000006', '104aaaaa-0000-0000-0000-000000000000',
   '10357913-1111-1111-1111-111111111111', 'ligne avec issue', 'ready_for_meeting',
   '2026-10-14 13:00:00+00', null);
insert into public.comparables (id, agency_id, project_id, title, price, surface_area, is_selected, display_order) values
  ('104dddd0-0000-0000-0000-000000000001', '104aaaaa-0000-0000-0000-000000000000',
   '104ccccc-0000-0000-0000-000000000001', 'c1', 300000, 60, true, 0);
-- Mission 112 — dans l'ordre d'un vrai rendez-vous : le concurrent retenu, PUIS le Live commence
-- (un concurrent retenu en plein Live serait hors Live, et sans réponse).
update public.projects
  set live_started_at = '2026-10-14 09:00:00+00', live_ended_at = '2026-10-14 09:05:00+00'
  where id = '104ccccc-0000-0000-0000-000000000001';
insert into public.live_seller_responses (agency_id, project_id, comparable_id, seller_serious_competitor, seller_estimated_listing_price)
  values ('104aaaaa-0000-0000-0000-000000000000', '104ccccc-0000-0000-0000-000000000001',
          '104dddd0-0000-0000-0000-000000000001', 'yes', 280000);
insert into public.live_seller_summary (agency_id, project_id, seller_perceived_property_price)
  values ('104aaaaa-0000-0000-0000-000000000000', '104ccccc-0000-0000-0000-000000000001', 350000);

-- Mission 164 — les prix enregistrés au Live, par la fonction du Live elle-même : le dossier à
-- rouvrir et le témoin ; puis la conclusion signée du dossier conclu, et la ligne avec issue.
select public.save_commercialization_price('104ccccc-0000-0000-0000-000000000001',
  '104aaaaa-0000-0000-0000-000000000000', 357913, 359715, 375391, 395713);
select public.save_commercialization_price('104ccccc-0000-0000-0000-000000000004',
  '104aaaaa-0000-0000-0000-000000000000', 537951, 539157, 573519, 593715);
insert into public.project_meeting_conclusions
  (project_id, agency_id, commercialization_price, outcome, first_outcome, mandate_type,
   concluded_at, signed_at)
values
  ('104ccccc-0000-0000-0000-000000000002', '104aaaaa-0000-0000-0000-000000000000', 735917,
   'signed', 'signed', 'exclusive', '2026-10-13 10:00:00+00', '2026-10-13 10:00:00+00'),
  ('104ccccc-0000-0000-0000-000000000006', '104aaaaa-0000-0000-0000-000000000000', 835919,
   'follow_up', 'follow_up', null, '2026-10-13 11:00:00+00', null);
create temp table witnesses_164 on commit drop as
  select c.project_id, to_jsonb(c) as line
  from public.project_meeting_conclusions c
  where c.project_id in ('104ccccc-0000-0000-0000-000000000002',
                         '104ccccc-0000-0000-0000-000000000004',
                         '104ccccc-0000-0000-0000-000000000006');

-- §1 — le navigateur, conseiller comme manager.
-- Mission 113 — le droit d'appeler reopen_live se lit (has_function_privilege), comme dans
-- finitions.sql : APPELER une fonction fermée fait tomber le serveur Postgres de la CI (signal 11,
-- image Supabase 17.6 x86) — la tâche SQL de la CI s'arrêtait ici depuis la mission 104.
do $$
begin
  if has_function_privilege('authenticated', 'public.reopen_live(uuid,uuid,text,text)', 'execute')
     or has_function_privilege('anon', 'public.reopen_live(uuid,uuid,text,text)', 'execute') then
    raise exception 'FAIL 1: reopen_live appelable depuis le navigateur';
  end if;
end $$;

create function pg_temp.browser_cannot_read_trace(p_uid uuid) returns void language plpgsql as $$
begin
  perform count(*) from public.live_reopenings;
  raise exception 'FAIL 1: la trace se lit depuis le navigateur (%)', p_uid;
exception when insufficient_privilege then null;
end $$;
grant execute on function pg_temp.browser_cannot_read_trace(uuid) to authenticated;

select set_config('request.jwt.claims',
  '{"sub":"10357913-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.browser_cannot_read_trace('10357913-1111-1111-1111-111111111111');
reset role;

select set_config('request.jwt.claims',
  '{"sub":"10359715-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.browser_cannot_read_trace('10359715-2222-2222-2222-222222222222');
reset role;

do $$
begin
  if (select count(*) from public.live_seller_responses
        where project_id = '104ccccc-0000-0000-0000-000000000001') <> 1 then
    raise exception 'FAIL 1: une réponse a disparu sans réouverture';
  end if;
end $$;

-- §3 — hors de reopen_live, le début ne se remet pas à zéro.
update public.projects set live_started_at = null where id = '104ccccc-0000-0000-0000-000000000001';
do $$
begin
  if (select live_started_at from public.projects
        where id = '104ccccc-0000-0000-0000-000000000001') is null then
    raise exception 'FAIL 3: début remis à zéro hors de reopen_live';
  end if;
end $$;

-- §4 — refus.
do $$
begin
  begin
    perform public.reopen_live('104ccccc-0000-0000-0000-000000000001', null, 'op@t.l', '  ');
    raise exception 'FAIL 4: réouverture sans motif';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.reopen_live('104ccccc-0000-0000-0000-000000000002', null, 'op@t.l', 'motif suffisant');
    raise exception 'FAIL 4: réouverture d''un dossier conclu';
  exception when raise_exception then null;
  end;
  begin
    perform public.reopen_live('104ccccc-0000-0000-0000-000000000003', null, 'op@t.l', 'motif suffisant');
    raise exception 'FAIL 4: réouverture d''un Live jamais commencé';
  exception when raise_exception then null;
  end;
  -- Mission 164 — un refus ne trace rien et ne touche à aucune conclusion.
  if exists (select 1 from public.live_reopenings) then
    raise exception 'FAIL 4: un refus a laissé une trace';
  end if;
  if (select commercialization_price from public.project_meeting_conclusions
        where project_id = '104ccccc-0000-0000-0000-000000000001') is distinct from 357913
     or (select count(*) from public.project_meeting_conclusions c
           where c.agency_id = '104aaaaa-0000-0000-0000-000000000000') <> 4 then
    raise exception 'FAIL 4: un refus a touché à une conclusion';
  end if;
end $$;

-- §2 — le serveur rouvre, et trace.
set local role service_role;
do $$
declare
  v_result jsonb;
  v_trace public.live_reopenings%rowtype;
  v_project public.projects%rowtype;
begin
  v_result := public.reopen_live('104ccccc-0000-0000-0000-000000000001',
    '10357913-1111-1111-1111-111111111111', ' Op@T.L ', 'Essai fait sur un vrai dossier');
  if v_result <> '{"responses": 1, "summary": true}'::jsonb then
    raise exception 'FAIL 2: résultat %', v_result;
  end if;
  select * into v_trace from public.live_reopenings
    where project_id = '104ccccc-0000-0000-0000-000000000001';
  if v_trace.operator_email <> 'op@t.l' or v_trace.reason <> 'Essai fait sur un vrai dossier'
     or v_trace.created_at is null
     or (v_trace.erased #>> '{responses,0,seller_estimated_listing_price}')::numeric <> 280000
     or (v_trace.erased #>> '{summary,seller_perceived_property_price}')::numeric <> 350000
     or (v_trace.erased ->> 'live_started_at') is null then
    raise exception 'FAIL 2: trace incomplète %', to_jsonb(v_trace);
  end if;
  if exists (select 1 from public.live_seller_responses
               where project_id = '104ccccc-0000-0000-0000-000000000001')
     or exists (select 1 from public.live_seller_summary
                  where project_id = '104ccccc-0000-0000-0000-000000000001') then
    raise exception 'FAIL 2: réponses non effacées';
  end if;
  select * into v_project from public.projects where id = '104ccccc-0000-0000-0000-000000000001';
  if v_project.live_started_at is not null or v_project.live_ended_at is not null
     or v_project.status <> 'ready_for_meeting' then
    raise exception 'FAIL 2: dossier non remis à zéro (%, %, %)',
      v_project.live_started_at, v_project.live_ended_at, v_project.status;
  end if;
  -- Le drapeau ne survit pas à l'appel : le début se fige de nouveau.
  update public.projects set live_started_at = '2026-10-14 10:00:00+00'
    where id = '104ccccc-0000-0000-0000-000000000001';
  update public.projects set live_started_at = null
    where id = '104ccccc-0000-0000-0000-000000000001';
  if (select live_started_at from public.projects
        where id = '104ccccc-0000-0000-0000-000000000001') is null then
    raise exception 'FAIL 2: le début ne se fige plus après la réouverture';
  end if;
end $$;
reset role;

-- §6 — Mission 164 : le prix du Live annulé.
do $$
declare
  v_result jsonb;
  v_trace public.live_reopenings%rowtype;
  v_line public.project_meeting_conclusions%rowtype;
begin
  -- La réouverture de §2 a supprimé la ligne sans issue, et la trace le dit, sans montant.
  if exists (select 1 from public.project_meeting_conclusions
               where project_id = '104ccccc-0000-0000-0000-000000000001') then
    raise exception 'FAIL 6: le prix du Live rouvert est resté';
  end if;
  select * into v_trace from public.live_reopenings
    where project_id = '104ccccc-0000-0000-0000-000000000001';
  if v_trace.erased -> 'commercialization_price_removed' is distinct from 'true'::jsonb then
    raise exception 'FAIL 6: la trace ne dit pas que le prix a été retiré (%)', v_trace.erased;
  end if;
  if v_trace.erased::text ~ '357913|359715|375391|395713' then
    raise exception 'FAIL 6: la trace garde un montant de la conclusion (%)', v_trace.erased;
  end if;

  -- Les autres conclusions n'ont pas bougé : le dossier conclu, l'autre Live, la ligne avec issue.
  if exists (
    select 1 from witnesses_164 w
    where (select to_jsonb(c) from public.project_meeting_conclusions c
             where c.project_id = w.project_id) is distinct from w.line
  ) then
    raise exception 'FAIL 6: la réouverture a touché à la conclusion d''un autre dossier';
  end if;

  -- Un nouveau prix au Live refait une ligne neuve : son prix et ses repères, aucune issue.
  perform public.save_commercialization_price('104ccccc-0000-0000-0000-000000000001',
    '104aaaaa-0000-0000-0000-000000000000', 637953, 639159, 673593, 693717);
  select * into v_line from public.project_meeting_conclusions
    where project_id = '104ccccc-0000-0000-0000-000000000001';
  if v_line.commercialization_price <> 637953 or v_line.frozen_market_computed <> 639159
     or v_line.frozen_advisor_analysis <> 673593 or v_line.frozen_advisor_price <> 693717
     or v_line.outcome is not null or v_line.first_outcome is not null
     or v_line.concluded_at is not null then
    raise exception 'FAIL 6: le nouveau prix ne refait pas une ligne neuve (%)', to_jsonb(v_line);
  end if;

  -- Un Live sans prix : rien à retirer, la trace le dit.
  v_result := public.reopen_live('104ccccc-0000-0000-0000-000000000005',
    '10357913-1111-1111-1111-111111111111', 'op@t.l', 'Live lancé par erreur');
  if v_result <> '{"responses": 0, "summary": false}'::jsonb then
    raise exception 'FAIL 6: résultat % pour un Live sans prix', v_result;
  end if;
  if (select erased -> 'commercialization_price_removed' from public.live_reopenings
        where project_id = '104ccccc-0000-0000-0000-000000000005')
     is distinct from 'false'::jsonb then
    raise exception 'FAIL 6: la trace d''un Live sans prix ne dit pas « aucun prix retiré »';
  end if;

  -- Une ligne qui porte une issue n'est jamais supprimée, et son prix ne bouge pas.
  perform public.reopen_live('104ccccc-0000-0000-0000-000000000006',
    '10357913-1111-1111-1111-111111111111', 'op@t.l', 'Live lancé par erreur');
  if (select erased -> 'commercialization_price_removed' from public.live_reopenings
        where project_id = '104ccccc-0000-0000-0000-000000000006')
     is distinct from 'false'::jsonb then
    raise exception 'FAIL 6: une ligne avec issue a été comptée comme un prix retiré';
  end if;
  if exists (
    select 1 from witnesses_164 w
    where (select to_jsonb(c) from public.project_meeting_conclusions c
             where c.project_id = w.project_id) is distinct from w.line
  ) then
    raise exception 'FAIL 6: une conclusion qui porte une issue a été touchée';
  end if;
end $$;

-- §5 — la trace part avec son dossier.
delete from public.comparables where project_id = '104ccccc-0000-0000-0000-000000000001';
delete from public.projects where id = '104ccccc-0000-0000-0000-000000000001';
do $$
begin
  if exists (select 1 from public.live_reopenings
               where project_id = '104ccccc-0000-0000-0000-000000000001') then
    raise exception 'FAIL 5: la trace survit à son dossier';
  end if;
end $$;

select 'live_reopening : OK' as resultat;
rollback;
