-- Lot C (Jean-Guy, 27/11 et 28/11) — la vie du mandat, à la SOURCE DE VÉRITÉ :
--   §1 une conclusion signée neuve n'a rien de la vie du mandat ;
--   §2 un fait ne se pose que sur un mandat signé ; le vider reste permis ;
--   §3 les paires et les ordres : le compromis et l'acte prévu ensemble, l'acte au plus tôt le
--      jour du compromis ; l'acquéreur avec le compromis, sa fiche seulement « de l'agence » ;
--      l'acte et le prix de vente ensemble, après le compromis ; la fin sans vente jamais avec un
--      compromis ni une vente ; la reconduction tacite avec une fin ; un prix de vente positif ;
--   §4 la fiche de l'acquéreur est de l'agence ; supprimée, elle se vide sans bloquer ;
--   §5 sous compromis ou vendu, l'issue ne quitte plus « mandat signé » (ni « Changer l'issue »
--      ni une seconde conclusion) ; le compromis qui tombe se vide ; une seconde conclusion garde
--      les faits ; hors mandat signé, l'issue change et vider reste permis ;
--   §6 les avenants : sur un mandat signé de l'agence, par un auteur de l'agence, datés par la
--      base, jamais modifiés, l'auteur vidé par la suppression de son compte, partis avec le
--      dossier ;
--   §7 les droits : anon rien ; le navigateur lit son agence et n'écrit rien ; une autre agence et
--      un membre retiré ne lisent rien ; le serveur écrit.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/vie_du_mandat.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec ; chaque refus est attrapé par
-- son code exact, et par son message quand le code est partagé (leçon M164).

begin;

insert into auth.users (id) values
  ('31811111-1111-1111-1111-111111111111'),
  ('31822222-2222-2222-2222-222222222222'),
  ('31833333-3333-3333-3333-333333333333'),
  ('31844444-4444-4444-4444-444444444444');
insert into public.agencies (id, name) values
  ('318aaaaa-0000-0000-0000-000000000000', 'A318'),
  ('318bbbbb-0000-0000-0000-000000000000', 'B318');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('31811111-1111-1111-1111-111111111111', '318aaaaa-0000-0000-0000-000000000000',
   'Al', 'A', 'a318@t.l', 'advisor'),
  ('31822222-2222-2222-2222-222222222222', '318bbbbb-0000-0000-0000-000000000000',
   'Bo', 'B', 'b318@t.l', 'advisor'),
  ('31844444-4444-4444-4444-444444444444', '318aaaaa-0000-0000-0000-000000000000',
   'Ca', 'C', 'c318@t.l', 'advisor');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, removed_at) values
  ('31833333-3333-3333-3333-333333333333', '318aaaaa-0000-0000-0000-000000000000',
   'Ré', 'R', 'r318@t.l', 'advisor', now());
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('318ccccc-0000-0000-0000-000000000001', '318aaaaa-0000-0000-0000-000000000000',
   '31811111-1111-1111-1111-111111111111', 'signé', 'ready_for_meeting'),
  ('318ccccc-0000-0000-0000-000000000002', '318aaaaa-0000-0000-0000-000000000000',
   '31811111-1111-1111-1111-111111111111', 'à relancer', 'ready_for_meeting'),
  ('318ccccc-0000-0000-0000-000000000003', '318aaaaa-0000-0000-0000-000000000000',
   '31811111-1111-1111-1111-111111111111', 'Live seul', 'ready_for_meeting');
insert into public.buyers (id, agency_id, advisor_id, name, cities) values
  ('318ddddd-0000-0000-0000-000000000001', '318aaaaa-0000-0000-0000-000000000000',
   '31811111-1111-1111-1111-111111111111', 'Famille A', array['Mougins']),
  ('318ddddd-0000-0000-0000-000000000002', '318bbbbb-0000-0000-0000-000000000000',
   '31822222-2222-2222-2222-222222222222', 'Famille B', array['Mougins']);

select public.conclude_meeting(
  '318ccccc-0000-0000-0000-000000000001', '318aaaaa-0000-0000-0000-000000000000',
  'signed', null, 1639500, 1700000, 1690000, 1690000,
  p_mandate_type => 'exclusive');
select public.conclude_meeting(
  '318ccccc-0000-0000-0000-000000000002', '318aaaaa-0000-0000-0000-000000000000',
  'follow_up', null, 393000, 400000, 395000, 395000,
  p_follow_up_motive => 'thinking_price');

-- §1 — une conclusion signée neuve : rien de la vie du mandat.
do $$
declare
  r record;
begin
  select * into r from public.project_meeting_conclusions
    where project_id = '318ccccc-0000-0000-0000-000000000001';
  if r.mandate_ends_on is not null or r.mandate_tacit_renewal is distinct from false
     or r.compromise_signed_on is not null or r.deed_planned_on is not null
     or r.sale_buyer_origin is not null or r.compromise_buyer_id is not null
     or r.deed_signed_on is not null or r.sale_price is not null
     or r.mandate_ended_on is not null then
    raise exception 'FAIL 1: une conclusion neuve a déjà un fait de la vie du mandat';
  end if;
end $$;

-- §2 — un fait seulement sur un mandat signé ; le vider reste permis.
do $$
begin
  begin
    update public.project_meeting_conclusions set mandate_ends_on = date '2027-01-28'
      where project_id = '318ccccc-0000-0000-0000-000000000002';
    raise exception 'FAIL 2: une fin de mandat posée sur un dossier à relancer';
  exception when check_violation then
    if sqlerrm not like '%ne se note que sur un mandat signé%' then raise; end if;
  end;
  begin
    update public.project_meeting_conclusions
      set compromise_signed_on = date '2026-12-05', deed_planned_on = date '2027-01-15',
          sale_buyer_origin = 'outside'
      where project_id = '318ccccc-0000-0000-0000-000000000002';
    raise exception 'FAIL 2: un compromis noté sur un dossier à relancer';
  exception when check_violation then
    if sqlerrm not like '%ne se note que sur un mandat signé%' then raise; end if;
  end;
  -- Chaque fait, seul, hors mandat signé.
  begin
    update public.project_meeting_conclusions set mandate_tacit_renewal = true
      where project_id = '318ccccc-0000-0000-0000-000000000002';
    raise exception 'FAIL 2: une reconduction tacite posée sur un dossier à relancer';
  exception when check_violation then
    if sqlerrm not like '%ne se note que sur un mandat signé%' then raise; end if;
  end;
  begin
    update public.project_meeting_conclusions
      set deed_signed_on = date '2027-01-15', sale_price = 1560000
      where project_id = '318ccccc-0000-0000-0000-000000000002';
    raise exception 'FAIL 2: une vente posée sur un dossier à relancer';
  exception when check_violation then
    if sqlerrm not like '%ne se note que sur un mandat signé%' then raise; end if;
  end;
  begin
    update public.project_meeting_conclusions set mandate_ended_on = date '2027-01-28'
      where project_id = '318ccccc-0000-0000-0000-000000000002';
    raise exception 'FAIL 2: une fin sans vente posée sur un dossier à relancer';
  exception when check_violation then
    if sqlerrm not like '%ne se note que sur un mandat signé%' then raise; end if;
  end;
  begin
    update public.project_meeting_conclusions
      set compromise_buyer_id = '318ddddd-0000-0000-0000-000000000001'
      where project_id = '318ccccc-0000-0000-0000-000000000002';
    raise exception 'FAIL 2: une fiche acquéreur posée sur un dossier à relancer';
  exception when check_violation then
    if sqlerrm not like '%ne se note que sur un mandat signé%' then raise; end if;
  end;
  -- Une ligne sans issue (celle que pose le prix du Live) ne naît pas avec un fait.
  begin
    insert into public.project_meeting_conclusions
      (project_id, agency_id, commercialization_price, mandate_ends_on)
    values ('318ccccc-0000-0000-0000-000000000003', '318aaaaa-0000-0000-0000-000000000000',
            500000, date '2027-05-01');
    raise exception 'FAIL 2: une ligne sans issue porte une fin de mandat';
  exception when check_violation then
    if sqlerrm not like '%ne se note que sur un mandat signé%' then raise; end if;
  end;
  update public.project_meeting_conclusions
    set mandate_ends_on = date '2027-01-28', mandate_tacit_renewal = true
    where project_id = '318ccccc-0000-0000-0000-000000000001';
  update public.project_meeting_conclusions
    set mandate_ends_on = date '2027-02-28', mandate_tacit_renewal = false
    where project_id = '318ccccc-0000-0000-0000-000000000001';
end $$;

-- §3 — les paires et les ordres.
do $$
begin
  begin
    update public.project_meeting_conclusions
      set compromise_buyer_id = '318ddddd-0000-0000-0000-000000000001'
      where project_id = '318ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 3: une fiche acquéreur sans compromis ni origine acceptée';
  exception when check_violation then
    if sqlerrm not like '%buyer_with_compromise%' then raise; end if;
  end;
  begin
    update public.project_meeting_conclusions
      set compromise_signed_on = date '2026-12-05', sale_buyer_origin = 'outside'
      where project_id = '318ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 3: un compromis sans acte prévu accepté';
  exception when check_violation then
    if sqlerrm not like '%compromise_pair%' then raise; end if;
  end;
  begin
    update public.project_meeting_conclusions
      set compromise_signed_on = date '2026-12-05', deed_planned_on = date '2026-12-01',
          sale_buyer_origin = 'outside'
      where project_id = '318ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 3: un acte prévu avant le compromis accepté';
  exception when check_violation then
    if sqlerrm not like '%compromise_pair%' then raise; end if;
  end;
  begin
    update public.project_meeting_conclusions
      set compromise_signed_on = date '2026-12-05', deed_planned_on = date '2027-01-15'
      where project_id = '318ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 3: un compromis sans acquéreur accepté';
  exception when check_violation then
    if sqlerrm not like '%buyer_with_compromise%' then raise; end if;
  end;
  begin
    update public.project_meeting_conclusions set sale_buyer_origin = 'outside'
      where project_id = '318ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 3: un acquéreur sans compromis accepté';
  exception when check_violation then
    if sqlerrm not like '%buyer_with_compromise%' then raise; end if;
  end;
  begin
    update public.project_meeting_conclusions
      set compromise_signed_on = date '2026-12-05', deed_planned_on = date '2027-01-15',
          sale_buyer_origin = 'outside', compromise_buyer_id = '318ddddd-0000-0000-0000-000000000001'
      where project_id = '318ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 3: une fiche acquéreur pour un acquéreur venu d''ailleurs acceptée';
  exception when check_violation then
    if sqlerrm not like '%buyer_with_compromise%' then raise; end if;
  end;
  begin
    update public.project_meeting_conclusions
      set compromise_signed_on = date '2026-12-05', deed_planned_on = date '2027-01-15',
          sale_buyer_origin = 'friend'
      where project_id = '318ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 3: une origine hors liste acceptée';
  exception when check_violation then
    if sqlerrm not like '%sale_buyer_origin_check%' then raise; end if;
  end;
  begin
    update public.project_meeting_conclusions
      set deed_signed_on = date '2027-01-15', sale_price = 1560000
      where project_id = '318ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 3: une vente sans compromis acceptée';
  exception when check_violation then
    if sqlerrm not like '%sale_after_compromise%' then raise; end if;
  end;
  begin
    update public.project_meeting_conclusions
      set mandate_ended_on = date '2027-02-28', mandate_tacit_renewal = true,
          mandate_ends_on = null
      where project_id = '318ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 3: une reconduction tacite sans fin acceptée';
  exception when check_violation then
    if sqlerrm not like '%tacit_needs_end%' then raise; end if;
  end;
end $$;

-- Le compromis, avec un acquéreur de l'agence et sa fiche.
update public.project_meeting_conclusions
  set compromise_signed_on = date '2026-12-05', deed_planned_on = date '2027-01-15',
      sale_buyer_origin = 'agency', compromise_buyer_id = '318ddddd-0000-0000-0000-000000000001'
  where project_id = '318ccccc-0000-0000-0000-000000000001';

do $$
begin
  begin
    update public.project_meeting_conclusions set deed_signed_on = date '2027-01-15'
      where project_id = '318ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 3: un acte sans prix de vente accepté';
  exception when check_violation then
    if sqlerrm not like '%sale_after_compromise%' then raise; end if;
  end;
  begin
    update public.project_meeting_conclusions
      set deed_signed_on = date '2026-12-01', sale_price = 1560000
      where project_id = '318ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 3: un acte avant le compromis accepté';
  exception when check_violation then
    if sqlerrm not like '%sale_after_compromise%' then raise; end if;
  end;
  begin
    update public.project_meeting_conclusions
      set deed_signed_on = date '2027-01-15', sale_price = 0
      where project_id = '318ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 3: un prix de vente nul accepté';
  exception when check_violation then
    if sqlerrm not like '%sale_price_check%' then raise; end if;
  end;
  begin
    update public.project_meeting_conclusions set mandate_ended_on = date '2027-02-28'
      where project_id = '318ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 3: une fin sans vente pendant un compromis acceptée';
  exception when check_violation then
    if sqlerrm not like '%ended_without_sale%' then raise; end if;
  end;
end $$;

-- §4 — la fiche d'une autre agence est refusée ; supprimée, la fiche se vide sans bloquer.
do $$
begin
  begin
    update public.project_meeting_conclusions
      set compromise_buyer_id = '318ddddd-0000-0000-0000-000000000002'
      where project_id = '318ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 4: la fiche d''une autre agence acceptée';
  exception when check_violation then
    if sqlerrm not like '%n''est pas de cette agence%' then raise; end if;
  end;
  delete from public.buyers where id = '318ddddd-0000-0000-0000-000000000001';
  if (select compromise_buyer_id from public.project_meeting_conclusions
      where project_id = '318ccccc-0000-0000-0000-000000000001') is not null
     or (select sale_buyer_origin from public.project_meeting_conclusions
         where project_id = '318ccccc-0000-0000-0000-000000000001') is distinct from 'agency' then
    raise exception 'FAIL 4: la fiche supprimée ne s''est pas vidée, ou le compromis a bougé';
  end if;
end $$;

-- §5 — la vente notée : l'issue ne quitte plus « mandat signé », ni par « Changer l'issue » ni par
-- une seconde conclusion. Le compromis tombe ; sans compromis, une seconde conclusion garde les
-- faits, l'issue change, et hors mandat signé vider reste permis.
update public.project_meeting_conclusions
  set deed_signed_on = date '2027-01-15', sale_price = 1560000
  where project_id = '318ccccc-0000-0000-0000-000000000001';
do $$
begin
  begin
    perform public.change_meeting_outcome(
      p_project_id => '318ccccc-0000-0000-0000-000000000001',
      p_agency_id => '318aaaaa-0000-0000-0000-000000000000',
      p_outcome => 'sold_elsewhere', p_reason => null);
    raise exception 'FAIL 5: « Changer l''issue » a quitté « mandat signé » malgré la vente';
  exception when check_violation then
    if sqlerrm not like '%l''issue reste%' then raise; end if;
  end;
  begin
    perform public.conclude_meeting(
      '318ccccc-0000-0000-0000-000000000001', '318aaaaa-0000-0000-0000-000000000000',
      'follow_up', null, 393000, 400000, 395000, 395000,
      p_follow_up_motive => 'thinking_price');
    raise exception 'FAIL 5: une seconde conclusion a quitté « mandat signé » malgré la vente';
  exception when check_violation then
    if sqlerrm not like '%l''issue reste%' then raise; end if;
  end;
  -- Vider la seule vente en quittant « signé » : le compromis reste noté, refusé.
  begin
    update public.project_meeting_conclusions
      set deed_signed_on = null, sale_price = null, outcome = 'follow_up'
      where project_id = '318ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 5: l''issue a quitté « mandat signé » avec un compromis encore noté';
  exception when check_violation then
    if sqlerrm not like '%l''issue reste%' then raise; end if;
  end;
  -- Une issue vidée n'est pas « mandat signé » non plus.
  begin
    update public.project_meeting_conclusions set outcome = null
      where project_id = '318ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 5: l''issue vidée malgré la vente';
  exception when check_violation then
    if sqlerrm not like '%l''issue reste%' then raise; end if;
  end;
  -- Ce qui reste permis sous vente : « Compléter » le type du mandat (M90), et une seconde
  -- conclusion signée ; le compromis et la vente restent.
  perform public.change_meeting_outcome(
    p_project_id => '318ccccc-0000-0000-0000-000000000001',
    p_agency_id => '318aaaaa-0000-0000-0000-000000000000',
    p_outcome => 'signed', p_reason => null, p_mandate_type => 'simple', p_price => 1690000);
  perform public.conclude_meeting(
    '318ccccc-0000-0000-0000-000000000001', '318aaaaa-0000-0000-0000-000000000000',
    'signed', null, 1600000, 1700000, 1690000, 1690000, p_mandate_type => 'exclusive');
  if (select count(*) from public.project_meeting_conclusions
      where project_id = '318ccccc-0000-0000-0000-000000000001' and outcome = 'signed'
        and mandate_type = 'exclusive' and compromise_signed_on is not null
        and deed_signed_on = date '2027-01-15' and sale_price = 1560000) <> 1 then
    raise exception 'FAIL 5: « Compléter » ou une seconde conclusion signée a perdu le compromis ou la vente';
  end if;
  -- Le compromis tombe : tout se vide ensemble (la vente d'abord, puis le compromis).
  update public.project_meeting_conclusions
    set deed_signed_on = null, sale_price = null
    where project_id = '318ccccc-0000-0000-0000-000000000001';
  update public.project_meeting_conclusions
    set compromise_signed_on = null, deed_planned_on = null, sale_buyer_origin = null,
        compromise_buyer_id = null
    where project_id = '318ccccc-0000-0000-0000-000000000001';
  -- Une seconde conclusion signée, sans compromis : la fin du mandat reste.
  update public.project_meeting_conclusions
    set mandate_ends_on = date '2027-02-28', mandate_tacit_renewal = true
    where project_id = '318ccccc-0000-0000-0000-000000000001';
  perform public.conclude_meeting(
    '318ccccc-0000-0000-0000-000000000001', '318aaaaa-0000-0000-0000-000000000000',
    'signed', null, 1600000, 1700000, 1690000, 1690000, p_mandate_type => 'simple');
  if (select mandate_ends_on from public.project_meeting_conclusions
      where project_id = '318ccccc-0000-0000-0000-000000000001') is distinct from date '2027-02-28' then
    raise exception 'FAIL 5: une seconde conclusion a effacé la fin du mandat';
  end if;
  -- Sans compromis ni vente, l'issue change ; les faits restent, et se vident hors mandat signé.
  perform public.change_meeting_outcome(
    p_project_id => '318ccccc-0000-0000-0000-000000000001',
    p_agency_id => '318aaaaa-0000-0000-0000-000000000000',
    p_outcome => 'sold_elsewhere', p_reason => null);
  update public.project_meeting_conclusions
    set mandate_tacit_renewal = false, mandate_ends_on = null
    where project_id = '318ccccc-0000-0000-0000-000000000001';
  if (select mandate_ends_on from public.project_meeting_conclusions
      where project_id = '318ccccc-0000-0000-0000-000000000001') is not null then
    raise exception 'FAIL 5: la fin du mandat ne se vide pas hors mandat signé';
  end if;
  perform public.change_meeting_outcome(
    p_project_id => '318ccccc-0000-0000-0000-000000000001',
    p_agency_id => '318aaaaa-0000-0000-0000-000000000000',
    p_outcome => 'signed', p_reason => null, p_mandate_type => 'exclusive');
  -- Puis la fin sans vente ; un compromis ne s'y ajoute pas.
  update public.project_meeting_conclusions set mandate_ended_on = date '2027-02-28'
    where project_id = '318ccccc-0000-0000-0000-000000000001';
  begin
    update public.project_meeting_conclusions
      set compromise_signed_on = date '2026-12-05', deed_planned_on = date '2027-01-15',
          sale_buyer_origin = 'outside'
      where project_id = '318ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 5: un compromis après la fin sans vente accepté';
  exception when check_violation then
    if sqlerrm not like '%ended_without_sale%' then raise; end if;
  end;
  update public.project_meeting_conclusions set mandate_ended_on = null
    where project_id = '318ccccc-0000-0000-0000-000000000001';
end $$;

-- §6 — les avenants.
insert into public.mandate_price_amendments (agency_id, project_id, amended_on, price, created_by)
values ('318aaaaa-0000-0000-0000-000000000000', '318ccccc-0000-0000-0000-000000000001',
        date '2026-11-14', 1590000, '31844444-4444-4444-4444-444444444444');
do $$
declare
  r record;
begin
  select * into r from public.mandate_price_amendments
    where project_id = '318ccccc-0000-0000-0000-000000000001';
  if r.created_at is null or r.created_at < now() - interval '1 minute' then
    raise exception 'FAIL 6: l''avenant n''est pas daté par la base';
  end if;
  begin
    insert into public.mandate_price_amendments (agency_id, project_id, amended_on, price, created_by)
    values ('318aaaaa-0000-0000-0000-000000000000', '318ccccc-0000-0000-0000-000000000002',
            date '2026-11-14', 380000, '31811111-1111-1111-1111-111111111111');
    raise exception 'FAIL 6: un avenant sur un dossier à relancer accepté';
  exception when check_violation then
    if sqlerrm not like '%pas un mandat signé de cette agence%' then raise; end if;
  end;
  begin
    insert into public.mandate_price_amendments (agency_id, project_id, amended_on, price, created_by)
    values ('318bbbbb-0000-0000-0000-000000000000', '318ccccc-0000-0000-0000-000000000001',
            date '2026-11-14', 1590000, '31822222-2222-2222-2222-222222222222');
    raise exception 'FAIL 6: un avenant sous le nom d''une autre agence accepté';
  exception when check_violation then
    if sqlerrm not like '%pas un mandat signé de cette agence%' then raise; end if;
  end;
  begin
    insert into public.mandate_price_amendments (agency_id, project_id, amended_on, price, created_by)
    values ('318aaaaa-0000-0000-0000-000000000000', '318ccccc-0000-0000-0000-000000000001',
            date '2026-11-20', 1550000, '31822222-2222-2222-2222-222222222222');
    raise exception 'FAIL 6: un avenant d''un auteur d''une autre agence accepté';
  exception when check_violation then
    if sqlerrm not like '%l''auteur n''est pas de cette agence%' then raise; end if;
  end;
  begin
    insert into public.mandate_price_amendments (agency_id, project_id, amended_on, price, created_by)
    values ('318aaaaa-0000-0000-0000-000000000000', '318ccccc-0000-0000-0000-000000000001',
            date '2026-11-20', 0, '31811111-1111-1111-1111-111111111111');
    raise exception 'FAIL 6: un avenant à 0 € accepté';
  exception when check_violation then
    if sqlerrm not like '%mandate_price_amendments_price_check%' then raise; end if;
  end;
  begin
    update public.mandate_price_amendments set price = 1500000
      where project_id = '318ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 6: un avenant modifié';
  exception when check_violation then
    if sqlerrm not like '%un avenant ne se modifie pas%' then raise; end if;
  end;
  begin
    update public.mandate_price_amendments set created_by = null
      where project_id = '318ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 6: l''auteur vidé à la main';
  exception when check_violation then
    if sqlerrm not like '%un avenant ne se modifie pas%' then raise; end if;
  end;
  -- Le compte de l'auteur supprimé : l'avenant reste, sans auteur.
  delete from public.profiles where id = '31844444-4444-4444-4444-444444444444';
  if (select count(*) from public.mandate_price_amendments
      where project_id = '318ccccc-0000-0000-0000-000000000001' and created_by is null) <> 1 then
    raise exception 'FAIL 6: l''avenant n''a pas survécu sans son auteur';
  end if;
end $$;

-- §7 — les droits, en toutes lettres.
do $$
declare
  t text;
begin
  foreach t in array array['public.project_meeting_conclusions', 'public.mandate_price_amendments']
  loop
    if has_any_column_privilege('anon', t, 'SELECT') or has_any_column_privilege('anon', t, 'INSERT')
       or has_any_column_privilege('anon', t, 'UPDATE') or has_table_privilege('anon', t, 'DELETE') then
      raise exception 'FAIL 7: anon a un droit sur %', t;
    end if;
    if not has_table_privilege('authenticated', t, 'SELECT')
       or has_any_column_privilege('authenticated', t, 'INSERT')
       or has_any_column_privilege('authenticated', t, 'UPDATE')
       or has_table_privilege('authenticated', t, 'DELETE')
       or has_table_privilege('authenticated', t, 'TRUNCATE') then
      raise exception 'FAIL 7: le navigateur n''a pas la seule lecture de %', t;
    end if;
    if not (has_table_privilege('service_role', t, 'INSERT')
            and has_table_privilege('service_role', t, 'UPDATE')
            and has_table_privilege('service_role', t, 'DELETE')) then
      raise exception 'FAIL 7: le serveur ne peut pas écrire dans %', t;
    end if;
  end loop;
  if has_function_privilege('authenticated', 'public.check_mandate_life()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.check_mandate_price_amendment()', 'EXECUTE') then
    raise exception 'FAIL 7: le navigateur peut appeler une garde';
  end if;
end $$;

select set_config('request.jwt.claims',
  '{"sub":"31811111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.mandate_price_amendments
      where project_id = '318ccccc-0000-0000-0000-000000000001') <> 1 then
    raise exception 'FAIL 7: l''agence ne lit pas son avenant';
  end if;
  if (select deed_planned_on from public.project_meeting_conclusions
      where project_id = '318ccccc-0000-0000-0000-000000000001') is not null then
    raise exception 'FAIL 7: le compromis tombé se lit encore';
  end if;
  begin
    insert into public.mandate_price_amendments (agency_id, project_id, amended_on, price, created_by)
    values ('318aaaaa-0000-0000-0000-000000000000', '318ccccc-0000-0000-0000-000000000001',
            date '2026-11-20', 1550000, '31811111-1111-1111-1111-111111111111');
    raise exception 'FAIL 7: le navigateur écrit un avenant';
  exception when insufficient_privilege then
    if sqlerrm <> 'permission denied for table mandate_price_amendments' then raise; end if;
  end;
  begin
    delete from public.mandate_price_amendments
      where project_id = '318ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 7: le navigateur retire un avenant';
  exception when insufficient_privilege then
    if sqlerrm <> 'permission denied for table mandate_price_amendments' then raise; end if;
  end;
  begin
    update public.project_meeting_conclusions set mandate_ends_on = date '2027-03-01'
      where project_id = '318ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 7: le navigateur écrit la fin du mandat';
  exception when insufficient_privilege then
    if sqlerrm <> 'permission denied for table project_meeting_conclusions' then raise; end if;
  end;
end $$;
reset role;

select set_config('request.jwt.claims',
  '{"sub":"31822222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.mandate_price_amendments
      where project_id = '318ccccc-0000-0000-0000-000000000001') <> 0 then
    raise exception 'FAIL 7: une autre agence lit l''avenant';
  end if;
end $$;
reset role;

-- Un membre retiré de l'agence ne lit plus rien (M105).
select set_config('request.jwt.claims',
  '{"sub":"31833333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.mandate_price_amendments) <> 0 then
    raise exception 'FAIL 7: un membre retiré lit les avenants';
  end if;
end $$;
reset role;

-- §6 (fin) — l'avenant part avec son dossier.
delete from public.projects where id = '318ccccc-0000-0000-0000-000000000001';
do $$
begin
  if (select count(*) from public.mandate_price_amendments
      where project_id = '318ccccc-0000-0000-0000-000000000001') <> 0 then
    raise exception 'FAIL 6: l''avenant n''est pas parti avec son dossier';
  end if;
end $$;

rollback;
