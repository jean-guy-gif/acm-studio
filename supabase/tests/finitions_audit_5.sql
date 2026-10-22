-- Mission 108 — les finitions de l'audit n°5, à la SOURCE DE VÉRITÉ :
--   §1 un concurrent et un résultat payé ne s'écrivent que sur un dossier de SON agence, même avec
--      son propre `agency_id` ;
--   §2 les réglages de recherche par défaut du conseiller ne s'écrivent pas depuis le navigateur ;
--   §3 la date de première relance, posée par `conclude_meeting`, tombe hors « à relancer » ; un
--      appel sans date (code de `main`) garde celle qui est posée.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/finitions_audit_5.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values
  ('10811111-1111-1111-1111-111111111111'),
  ('10833333-3333-3333-3333-333333333333');
insert into public.agencies (id, name) values
  ('108aaaaa-0000-0000-0000-000000000000', 'A108'),
  ('108bbbbb-0000-0000-0000-000000000000', 'B108');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('10811111-1111-1111-1111-111111111111', '108aaaaa-0000-0000-0000-000000000000', 'Ac', 'Tif', 'a108@t.l', 'advisor'),
  ('10833333-3333-3333-3333-333333333333', '108bbbbb-0000-0000-0000-000000000000', 'Au', 'Tre', 'b108@t.l', 'advisor');
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('108ccccc-0000-0000-0000-00000000000a', '108aaaaa-0000-0000-0000-000000000000',
   '10811111-1111-1111-1111-111111111111', 'dossier A', 'ready_for_meeting'),
  ('108ccccc-0000-0000-0000-00000000000b', '108bbbbb-0000-0000-0000-000000000000',
   '10833333-3333-3333-3333-333333333333', 'dossier B', 'draft');

create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}', p_uid), true);
  execute 'set local role authenticated';
end $$;

-- §1 — le dossier d'une autre agence, avec son propre agency_id : refusé.
select pg_temp.act_as('10811111-1111-1111-1111-111111111111');
do $$
begin
  begin
    insert into public.comparables (agency_id, project_id, title, price, display_order)
    values ('108aaaaa-0000-0000-0000-000000000000', '108ccccc-0000-0000-0000-00000000000b',
            'forgé', 300000, 1);
    raise exception 'FAIL 1: un concurrent écrit sur le dossier d''une autre agence';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.stream_estate_results (agency_id, project_id, fingerprint, result)
    values ('108aaaaa-0000-0000-0000-000000000000', '108ccccc-0000-0000-0000-00000000000b',
            'x', '{}'::jsonb);
    raise exception 'FAIL 1: un résultat payé écrit sur le dossier d''une autre agence';
  exception when insufficient_privilege then null;
  end;
  -- Sur son propre dossier : accepté.
  insert into public.comparables (agency_id, project_id, title, price, display_order)
  values ('108aaaaa-0000-0000-0000-000000000000', '108ccccc-0000-0000-0000-00000000000a',
          'à moi', 300000, 1);
  insert into public.stream_estate_results (agency_id, project_id, fingerprint, result)
  values ('108aaaaa-0000-0000-0000-000000000000', '108ccccc-0000-0000-0000-00000000000a',
          'x', '{}'::jsonb);
end $$;

-- §2 — les réglages par défaut : écrits par le serveur seul.
do $$
begin
  begin
    update public.profiles set search_defaults = '{"autoWiden": false}'::jsonb
      where id = '10811111-1111-1111-1111-111111111111';
    raise exception 'FAIL 2: le navigateur écrit ses réglages par défaut';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- §3 — la date de première relance.
do $$
declare v_next date;
begin
  perform public.conclude_meeting(
    p_project_id => '108ccccc-0000-0000-0000-00000000000a',
    p_agency_id => '108aaaaa-0000-0000-0000-000000000000',
    p_outcome => 'follow_up', p_reason => null, p_price => null,
    p_market_computed => null, p_advisor_analysis => null, p_advisor_price => null,
    p_follow_up_motive => 'thinking_price', p_next_follow_up_on => date '2026-11-19');
  select next_follow_up_on into v_next from public.project_meeting_conclusions
    where project_id = '108ccccc-0000-0000-0000-00000000000a';
  if v_next is distinct from date '2026-11-19' then
    raise exception 'FAIL 3: date de première relance non posée (%)', v_next;
  end if;

  -- Un appel sans date (code de main) garde celle qui est posée.
  perform public.change_meeting_outcome(
    p_project_id => '108ccccc-0000-0000-0000-00000000000a',
    p_agency_id => '108aaaaa-0000-0000-0000-000000000000',
    p_outcome => 'follow_up', p_reason => null);
  select next_follow_up_on into v_next from public.project_meeting_conclusions
    where project_id = '108ccccc-0000-0000-0000-00000000000a';
  if v_next is distinct from date '2026-11-19' then
    raise exception 'FAIL 3: un appel sans date a effacé la date posée';
  end if;

  -- Hors « à relancer », la date tombe.
  perform public.change_meeting_outcome(
    p_project_id => '108ccccc-0000-0000-0000-00000000000a',
    p_agency_id => '108aaaaa-0000-0000-0000-000000000000',
    p_outcome => 'withdrawn', p_reason => null);
  select next_follow_up_on into v_next from public.project_meeting_conclusions
    where project_id = '108ccccc-0000-0000-0000-00000000000a';
  if v_next is not null then
    raise exception 'FAIL 3: la date de relance reste hors « à relancer »';
  end if;

  -- La base refuse une date sur une autre issue.
  begin
    update public.project_meeting_conclusions set next_follow_up_on = date '2026-11-19'
      where project_id = '108ccccc-0000-0000-0000-00000000000a';
    raise exception 'FAIL 3: une date de relance posée sur « retiré de la vente »';
  exception when check_violation then null;
  end;
end $$;

-- Les fonctions de conclusion restent fermées au navigateur.
-- Mission 113 — le droit se lit (has_function_privilege), comme dans finitions.sql : appeler une
-- fonction fermée fait tomber le serveur Postgres de la CI (signal 11, image Supabase 17.6 x86).
do $$
declare v_fn regprocedure;
begin
  for v_fn in
    select p.oid::regprocedure from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname = 'conclude_meeting'
  loop
    if has_function_privilege('authenticated', v_fn, 'execute')
       or has_function_privilege('anon', v_fn, 'execute') then
      raise exception 'FAIL 3: le navigateur appelle %', v_fn;
    end if;
  end loop;
  if not found then
    raise exception 'FAIL 3: conclude_meeting introuvable';
  end if;
end $$;

do $$ begin raise notice 'finitions_audit_5 : OK'; end $$;

rollback;
