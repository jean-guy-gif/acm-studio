-- Mission 110, partie A — à la SOURCE DE VÉRITÉ :
--   §1 les objections : liste fermée, gardées par un appel sans objections (code d'avant),
--      remplacées par un appel qui en fournit ;
--   §2 les liens de la synthèse : écrits par le serveur seul, lus par la seule agence, jamais
--      depuis le navigateur d'une autre ; 30 jours par défaut.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/prise_de_mandat.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values
  ('11011111-1111-1111-1111-111111111111'),
  ('11033333-3333-3333-3333-333333333333');
insert into public.agencies (id, name) values
  ('110aaaaa-0000-0000-0000-000000000000', 'A110'),
  ('110bbbbb-0000-0000-0000-000000000000', 'B110');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('11011111-1111-1111-1111-111111111111', '110aaaaa-0000-0000-0000-000000000000', 'Ac', 'Tif', 'a110@t.l', 'advisor'),
  ('11033333-3333-3333-3333-333333333333', '110bbbbb-0000-0000-0000-000000000000', 'Au', 'Tre', 'b110@t.l', 'advisor');
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('110ccccc-0000-0000-0000-00000000000a', '110aaaaa-0000-0000-0000-000000000000',
   '11011111-1111-1111-1111-111111111111', 'dossier A', 'ready_for_meeting');

create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}', p_uid), true);
  execute 'set local role authenticated';
end $$;
grant execute on function pg_temp.act_as(uuid) to authenticated;

-- §1 — les objections.
do $$
declare r public.project_meeting_conclusions%rowtype;
begin
  perform public.conclude_meeting(
    p_project_id => '110ccccc-0000-0000-0000-00000000000a',
    p_agency_id => '110aaaaa-0000-0000-0000-000000000000',
    p_outcome => 'follow_up', p_reason => null, p_price => null,
    p_market_computed => null, p_advisor_analysis => null, p_advisor_price => null,
    p_follow_up_motive => 'thinking_price',
    p_objections => array['price', 'timing'], p_objection_note => '  attend la vente  ');
  select * into r from public.project_meeting_conclusions
    where project_id = '110ccccc-0000-0000-0000-00000000000a';
  if r.objections is distinct from array['price', 'timing'] or r.objection_note is distinct from 'attend la vente' then
    raise exception 'FAIL 1: objections non posées (% / %)', r.objections, r.objection_note;
  end if;

  -- Un appel sans objections (code de main) les garde.
  perform public.change_meeting_outcome(
    p_project_id => '110ccccc-0000-0000-0000-00000000000a',
    p_agency_id => '110aaaaa-0000-0000-0000-000000000000',
    p_outcome => 'follow_up', p_reason => null);
  select * into r from public.project_meeting_conclusions
    where project_id = '110ccccc-0000-0000-0000-00000000000a';
  if r.objections is distinct from array['price', 'timing'] then
    raise exception 'FAIL 1: un appel sans objections les a effacées';
  end if;

  -- Un appel qui en fournit les remplace.
  perform public.change_meeting_outcome(
    p_project_id => '110ccccc-0000-0000-0000-00000000000a',
    p_agency_id => '110aaaaa-0000-0000-0000-000000000000',
    p_outcome => 'follow_up', p_reason => null, p_objections => array['not_ready']);
  select * into r from public.project_meeting_conclusions
    where project_id = '110ccccc-0000-0000-0000-00000000000a';
  if r.objections is distinct from array['not_ready'] or r.objection_note is not null then
    raise exception 'FAIL 1: objections non remplacées';
  end if;

  -- Hors liste : refusé par la base.
  begin
    update public.project_meeting_conclusions set objections = array['pirate']
      where project_id = '110ccccc-0000-0000-0000-00000000000a';
    raise exception 'FAIL 1: une objection hors liste acceptée';
  exception when check_violation then null;
  end;
end $$;

-- §2 — les liens de la synthèse.
insert into public.seller_synthesis_links (agency_id, project_id, created_by, token_hash)
  values ('110aaaaa-0000-0000-0000-000000000000', '110ccccc-0000-0000-0000-00000000000a',
          '11011111-1111-1111-1111-111111111111', repeat('a', 64));
do $$
begin
  if (select expires_at from public.seller_synthesis_links where token_hash = repeat('a', 64))
     not between now() + interval '29 days 23 hours' and now() + interval '30 days 1 hour' then
    raise exception 'FAIL 2: le lien n''expire pas après 30 jours';
  end if;
end $$;

select pg_temp.act_as('11011111-1111-1111-1111-111111111111');
do $$
begin
  if (select count(*) from public.seller_synthesis_links) <> 1 then
    raise exception 'FAIL 2: l''agence ne lit pas son lien';
  end if;
  begin
    insert into public.seller_synthesis_links (agency_id, project_id, token_hash)
      values ('110aaaaa-0000-0000-0000-000000000000', '110ccccc-0000-0000-0000-00000000000a', repeat('b', 64));
    raise exception 'FAIL 2: le navigateur crée un lien';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.seller_synthesis_links set expires_at = now() + interval '1 year';
    raise exception 'FAIL 2: le navigateur prolonge un lien';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select pg_temp.act_as('11033333-3333-3333-3333-333333333333');
do $$
begin
  if (select count(*) from public.seller_synthesis_links) <> 0 then
    raise exception 'FAIL 2: une autre agence lit le lien';
  end if;
end $$;
reset role;

-- §3 — « Retirer le lien » : refusé depuis le navigateur, fait par le serveur ; le lien n'existe
-- plus. Puis l'effacement A (PROCEDURE_EFFACEMENT.md) emporte les liens du dossier.
select pg_temp.act_as('11011111-1111-1111-1111-111111111111');
do $$
begin
  delete from public.seller_synthesis_links where token_hash = repeat('a', 64);
  if not exists (select 1 from public.seller_synthesis_links where token_hash = repeat('a', 64)) then
    raise exception 'FAIL 3: le navigateur a retiré un lien';
  end if;
exception when insufficient_privilege then null;
end $$;
reset role;
delete from public.seller_synthesis_links where token_hash = repeat('a', 64);
do $$
begin
  if exists (select 1 from public.seller_synthesis_links where token_hash = repeat('a', 64)) then
    raise exception 'FAIL 3: le lien retiré existe encore';
  end if;
end $$;

insert into public.seller_synthesis_links (agency_id, project_id, token_hash)
  values ('110aaaaa-0000-0000-0000-000000000000', '110ccccc-0000-0000-0000-00000000000a', repeat('c', 64));
-- Effacement A, dans l'ordre de la procédure.
delete from public.seller_synthesis_links where project_id = '110ccccc-0000-0000-0000-00000000000a' and agency_id = '110aaaaa-0000-0000-0000-000000000000';
delete from public.comparables where project_id = '110ccccc-0000-0000-0000-00000000000a' and agency_id = '110aaaaa-0000-0000-0000-000000000000';
delete from public.subject_properties where project_id = '110ccccc-0000-0000-0000-00000000000a' and agency_id = '110aaaaa-0000-0000-0000-000000000000';
delete from public.projects where id = '110ccccc-0000-0000-0000-00000000000a' and agency_id = '110aaaaa-0000-0000-0000-000000000000';
do $$
begin
  if exists (select 1 from public.seller_synthesis_links where project_id = '110ccccc-0000-0000-0000-00000000000a')
     or exists (select 1 from public.project_meeting_conclusions where project_id = '110ccccc-0000-0000-0000-00000000000a') then
    raise exception 'FAIL 3: l''effacement laisse un lien ou la conclusion';
  end if;
end $$;
-- Et même sans la ligne explicite, supprimer le dossier emporte ses liens.
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('110ccccc-0000-0000-0000-00000000000b', '110aaaaa-0000-0000-0000-000000000000',
   '11011111-1111-1111-1111-111111111111', 'dossier B', 'draft');
insert into public.seller_synthesis_links (agency_id, project_id, token_hash)
  values ('110aaaaa-0000-0000-0000-000000000000', '110ccccc-0000-0000-0000-00000000000b', repeat('d', 64));
delete from public.projects where id = '110ccccc-0000-0000-0000-00000000000b';
do $$
begin
  if exists (select 1 from public.seller_synthesis_links where token_hash = repeat('d', 64)) then
    raise exception 'FAIL 3: un dossier supprimé laisse son lien';
  end if;
end $$;

do $$ begin raise notice 'prise_de_mandat : OK'; end $$;

rollback;
