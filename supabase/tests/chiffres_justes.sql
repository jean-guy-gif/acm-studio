-- Mission 111 — les chiffres justes, à la SOURCE DE VÉRITÉ :
--   A. un prix saisi au Live puis « Mandat signé » : la première issue est « signé » ; une
--      première issue posée ne se réécrit jamais ;
--   D. le prix de commercialisation ne s'écrit plus par le Live sur un dossier conclu ou archivé ;
--   G. une autre agence n'écrit ni un bien vendeur ni un courrier sur vos dossiers, même avec son
--      propre `agency_id`.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/chiffres_justes.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values
  ('11111111-0111-1111-1111-111111111111'),
  ('11122222-0111-2222-2222-222222222222');
insert into public.agencies (id, name) values
  ('111aaaaa-0111-0000-0000-000000000000', 'A111'),
  ('111bbbbb-0111-0000-0000-000000000000', 'B111');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('11111111-0111-1111-1111-111111111111', '111aaaaa-0111-0000-0000-000000000000', 'Ac', 'A', 'a111c@t.l', 'advisor'),
  ('11122222-0111-2222-2222-222222222222', '111bbbbb-0111-0000-0000-000000000000', 'Bc', 'B', 'b111c@t.l', 'advisor');
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('111ccccc-0111-0000-0000-00000000000a', '111aaaaa-0111-0000-0000-000000000000',
   '11111111-0111-1111-1111-111111111111', 'dossier A', 'ready_for_meeting'),
  ('111ccccc-0111-0000-0000-00000000000c', '111aaaaa-0111-0000-0000-000000000000',
   '11111111-0111-1111-1111-111111111111', 'dossier A archivé', 'archived');
insert into public.comparables (id, agency_id, project_id, title, price, is_selected, display_order) values
  ('111dddd0-0111-0000-0000-00000000000a', '111aaaaa-0111-0000-0000-000000000000',
   '111ccccc-0111-0000-0000-00000000000a', 'c', 300000, true, 1);

create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}', p_uid), true);
  execute 'set local role authenticated';
end $$;
grant execute on function pg_temp.act_as(uuid) to authenticated;

-- A. Le prix saisi au Live crée la ligne de conclusion, sans issue.
select public.save_commercialization_price('111ccccc-0111-0000-0000-00000000000a',
  '111aaaaa-0111-0000-0000-000000000000', 330000, 320000, null, 320000);
do $$
declare r record;
begin
  select * into r from public.project_meeting_conclusions
    where project_id = '111ccccc-0111-0000-0000-00000000000a';
  if r.outcome is not null or r.first_outcome is not null then
    raise exception 'FAIL A0: la saisie du prix a posé une issue';
  end if;

  perform public.conclude_meeting(
    p_project_id => '111ccccc-0111-0000-0000-00000000000a',
    p_agency_id => '111aaaaa-0111-0000-0000-000000000000',
    p_outcome => 'signed', p_reason => null, p_price => null,
    p_market_computed => null, p_advisor_analysis => null, p_advisor_price => null,
    p_mandate_type => 'exclusive');
  select * into r from public.project_meeting_conclusions
    where project_id = '111ccccc-0111-0000-0000-00000000000a';
  if r.first_outcome is distinct from 'signed' then
    raise exception 'FAIL A1: première issue % au lieu de « signé »', r.first_outcome;
  end if;
  if r.commercialization_price <> 330000 then
    raise exception 'FAIL A1b: le prix du Live a été perdu à la conclusion';
  end if;

  -- Une première issue posée ne se réécrit jamais.
  perform public.conclude_meeting(
    p_project_id => '111ccccc-0111-0000-0000-00000000000a',
    p_agency_id => '111aaaaa-0111-0000-0000-000000000000',
    p_outcome => 'follow_up', p_reason => null, p_price => null,
    p_market_computed => null, p_advisor_analysis => null, p_advisor_price => null,
    p_follow_up_motive => 'thinking_price');
  select * into r from public.project_meeting_conclusions
    where project_id = '111ccccc-0111-0000-0000-00000000000a';
  if r.first_outcome is distinct from 'signed' then
    raise exception 'FAIL A2: la première issue a été réécrite en %', r.first_outcome;
  end if;
end $$;

-- D. Le dossier est conclu : le Live n'écrit plus son prix de commercialisation.
do $$
begin
  begin
    perform public.save_commercialization_price('111ccccc-0111-0000-0000-00000000000a',
      '111aaaaa-0111-0000-0000-000000000000', 1, null, null, null);
    raise exception 'FAIL D1: prix réécrit sur un dossier conclu';
  exception when raise_exception then
    if sqlerrm not like '%live_closed%' then raise; end if;
  end;
  if (select commercialization_price from public.project_meeting_conclusions
      where project_id = '111ccccc-0111-0000-0000-00000000000a') <> 330000 then
    raise exception 'FAIL D1b: le prix a bougé';
  end if;
  begin
    perform public.save_commercialization_price('111ccccc-0111-0000-0000-00000000000c',
      '111aaaaa-0111-0000-0000-000000000000', 1, null, null, null);
    raise exception 'FAIL D2: prix écrit sur un dossier archivé';
  exception when raise_exception then
    if sqlerrm not like '%live_closed%' then raise; end if;
  end;
  -- « Changer l'issue » garde son droit d'écrire ce prix (M90).
  perform public.change_meeting_outcome(
    p_project_id => '111ccccc-0111-0000-0000-00000000000a',
    p_agency_id => '111aaaaa-0111-0000-0000-000000000000',
    p_outcome => 'signed', p_reason => null, p_mandate_type => 'simple', p_price => 325000);
  if (select commercialization_price from public.project_meeting_conclusions
      where project_id = '111ccccc-0111-0000-0000-00000000000a') <> 325000 then
    raise exception 'FAIL D3: « Changer l''issue » n''écrit plus le prix';
  end if;
end $$;

-- G. L'agence B, avec SON agency_id, sur le dossier de l'agence A : refusé.
select pg_temp.act_as('11122222-0111-2222-2222-222222222222');
do $$
begin
  begin
    insert into public.subject_properties (agency_id, project_id) values
      ('111bbbbb-0111-0000-0000-000000000000', '111ccccc-0111-0000-0000-00000000000a');
    raise exception 'FAIL G1: un bien vendeur écrit sur le dossier d''une autre agence';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.competitor_prospecting_files (agency_id, project_id, comparable_id, version) values
      ('111bbbbb-0111-0000-0000-000000000000', '111ccccc-0111-0000-0000-00000000000a',
       '111dddd0-0111-0000-0000-00000000000a', 'colleague');
    raise exception 'FAIL G2: un courrier écrit sur le concurrent d''une autre agence';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- G'. L'agence A, chez elle : le bien et le courrier s'écrivent.
select pg_temp.act_as('11111111-0111-1111-1111-111111111111');
insert into public.subject_properties (agency_id, project_id) values
  ('111aaaaa-0111-0000-0000-000000000000', '111ccccc-0111-0000-0000-00000000000a');
insert into public.competitor_prospecting_files (agency_id, project_id, comparable_id, version) values
  ('111aaaaa-0111-0000-0000-000000000000', '111ccccc-0111-0000-0000-00000000000a',
   '111dddd0-0111-0000-0000-00000000000a', 'colleague');
reset role;

do $$ begin raise notice 'chiffres_justes : OK'; end $$;

rollback;
