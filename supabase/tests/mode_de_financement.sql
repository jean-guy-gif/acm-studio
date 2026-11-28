-- Lot B (Jean-Guy, 27/11) — le mode de financement d'un acquéreur, à la SOURCE DE VÉRITÉ :
--   §1 une fiche neuve est « Pas encore dit », sans apport, ni prêt, ni accord ;
--   §2 un mode hors liste est refusé, et le vide aussi ;
--   §3 l'apport, le prêt et l'accord n'existent qu'avec un prêt, et dans leurs bornes ;
--   §4 « Avec prêt » ne redevient « Comptant » qu'en vidant ses détails dans la même écriture ;
--   §5 les droits, en toutes lettres : anon rien, le navigateur la lecture seule (colonne par
--      colonne pour les quatre nouvelles), le serveur l'écriture ;
--   §6 le navigateur lit son agence et n'écrit rien ; une autre agence et un membre retiré ne
--      lisent rien ;
--   §7 le mode et le statut de financement (M132) restent indépendants.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/mode_de_financement.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec ; chaque refus est attrapé par
-- son code exact (leçon M164 : jamais un refus qui passerait pour un autre).

begin;

insert into auth.users (id) values
  ('21711111-1111-1111-1111-111111111111'),
  ('21722222-2222-2222-2222-222222222222'),
  ('21733333-3333-3333-3333-333333333333');
insert into public.agencies (id, name) values
  ('217aaaaa-0000-0000-0000-000000000000', 'A217'),
  ('217bbbbb-0000-0000-0000-000000000000', 'B217');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('21711111-1111-1111-1111-111111111111', '217aaaaa-0000-0000-0000-000000000000',
   'Al', 'A', 'a217@t.l', 'advisor'),
  ('21722222-2222-2222-2222-222222222222', '217bbbbb-0000-0000-0000-000000000000',
   'Bo', 'B', 'b217@t.l', 'advisor');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, removed_at) values
  ('21733333-3333-3333-3333-333333333333', '217aaaaa-0000-0000-0000-000000000000',
   'Ré', 'R', 'r217@t.l', 'advisor', now());
insert into public.buyers (id, agency_id, advisor_id, name, cities) values
  ('217ccccc-0000-0000-0000-000000000001', '217aaaaa-0000-0000-0000-000000000000',
   '21711111-1111-1111-1111-111111111111', 'Famille Test', array['Mougins']);

-- §1 — les défauts.
do $$
declare
  r record;
begin
  select financing_mode, loan_contribution, loan_amount, loan_agreement into r
    from public.buyers where id = '217ccccc-0000-0000-0000-000000000001';
  if r.financing_mode is distinct from 'not_said' or r.loan_contribution is not null
     or r.loan_amount is not null or r.loan_agreement is not null then
    raise exception 'FAIL 1: une fiche neuve n''est pas « Pas encore dit », sans détail';
  end if;
end $$;

-- §2 — un mode hors liste, ou vide, est refusé ; les trois modes sont acceptés.
do $$
begin
  begin
    update public.buyers set financing_mode = 'credit'
      where id = '217ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 2: un mode hors liste accepté';
  exception when check_violation then null;
  end;
  begin
    update public.buyers set financing_mode = null
      where id = '217ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 2: un mode vide accepté';
  exception when not_null_violation then null;
  end;
end $$;
update public.buyers set financing_mode = 'cash' where id = '217ccccc-0000-0000-0000-000000000001';
update public.buyers set financing_mode = 'not_said' where id = '217ccccc-0000-0000-0000-000000000001';

-- §3 — les détails n'existent qu'avec un prêt, et dans leurs bornes.
do $$
begin
  begin
    update public.buyers set loan_amount = 300000
      where id = '217ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 3: un montant de prêt sans prêt accepté';
  exception when check_violation then null;
  end;
  begin
    update public.buyers set financing_mode = 'cash', loan_agreement = true
      where id = '217ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 3: un accord de principe sur un achat comptant accepté';
  exception when check_violation then null;
  end;
  begin
    update public.buyers set financing_mode = 'loan', loan_contribution = -1
      where id = '217ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 3: un apport négatif accepté';
  exception when check_violation then null;
  end;
  begin
    update public.buyers set financing_mode = 'loan', loan_amount = 0
      where id = '217ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 3: un prêt de 0 € accepté';
  exception when check_violation then null;
  end;
  begin
    update public.buyers set financing_mode = 'loan', loan_amount = 100000000
      where id = '217ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 3: un prêt hors bornes accepté';
  exception when check_violation then null;
  end;
end $$;
-- Avec un prêt : tout facultatif, et tout ensemble.
update public.buyers set financing_mode = 'loan' where id = '217ccccc-0000-0000-0000-000000000001';
update public.buyers
  set loan_contribution = 0, loan_amount = 540000, loan_agreement = false
  where id = '217ccccc-0000-0000-0000-000000000001';
update public.buyers
  set loan_contribution = 250000, loan_agreement = true
  where id = '217ccccc-0000-0000-0000-000000000001';

-- §4 — « Avec prêt » ne redevient « Comptant » qu'en vidant ses détails dans la même écriture.
do $$
begin
  begin
    update public.buyers set financing_mode = 'cash'
      where id = '217ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 4: « Comptant » accepté avec les détails d''un prêt';
  exception when check_violation then null;
  end;
end $$;
update public.buyers
  set financing_mode = 'cash', loan_contribution = null, loan_amount = null, loan_agreement = null
  where id = '217ccccc-0000-0000-0000-000000000001';
update public.buyers
  set financing_mode = 'loan', loan_contribution = 250000, loan_amount = 540000, loan_agreement = true
  where id = '217ccccc-0000-0000-0000-000000000001';

-- §5 — les droits, en toutes lettres, PUBLIC et droits d'une seule colonne compris : anon n'a
-- rien ; le navigateur lit, n'écrit aucune colonne et ne vide pas la table ; le serveur écrit.
do $$
declare
  detail text;
begin
  if has_any_column_privilege('anon', 'public.buyers', 'SELECT')
     or has_any_column_privilege('anon', 'public.buyers', 'INSERT')
     or has_any_column_privilege('anon', 'public.buyers', 'UPDATE')
     or has_table_privilege('anon', 'public.buyers', 'DELETE')
     or has_table_privilege('anon', 'public.buyers', 'TRUNCATE') then
    raise exception 'FAIL 5: anon a un droit sur les fiches acquéreur';
  end if;
  if not has_table_privilege('authenticated', 'public.buyers', 'SELECT') then
    raise exception 'FAIL 5: le navigateur ne lit pas les fiches acquéreur';
  end if;
  if has_any_column_privilege('authenticated', 'public.buyers', 'INSERT')
     or has_any_column_privilege('authenticated', 'public.buyers', 'UPDATE')
     or has_table_privilege('authenticated', 'public.buyers', 'DELETE')
     or has_table_privilege('authenticated', 'public.buyers', 'TRUNCATE') then
    raise exception 'FAIL 5: le navigateur a le droit d''écrire une fiche acquéreur';
  end if;
  foreach detail in array array['financing_mode', 'loan_contribution', 'loan_amount', 'loan_agreement']
  loop
    if not has_column_privilege('authenticated', 'public.buyers', detail, 'SELECT') then
      raise exception 'FAIL 5: le navigateur ne lit pas la colonne %', detail;
    end if;
    if has_column_privilege('authenticated', 'public.buyers', detail, 'INSERT')
       or has_column_privilege('authenticated', 'public.buyers', detail, 'UPDATE') then
      raise exception 'FAIL 5: le navigateur peut écrire la colonne %', detail;
    end if;
  end loop;
  if not (
    has_table_privilege('service_role', 'public.buyers', 'INSERT')
    and has_table_privilege('service_role', 'public.buyers', 'UPDATE')
    and has_table_privilege('service_role', 'public.buyers', 'DELETE')
  ) then
    raise exception 'FAIL 5: le serveur ne peut pas écrire les fiches acquéreur';
  end if;
end $$;

-- §6 — le navigateur lit son agence, n'écrit rien ; une autre agence ne voit rien.
select set_config('request.jwt.claims',
  '{"sub":"21711111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
do $$
declare
  r record;
begin
  select financing_mode, loan_contribution, loan_amount, loan_agreement into r
    from public.buyers where id = '217ccccc-0000-0000-0000-000000000001';
  if r.financing_mode is distinct from 'loan' or r.loan_contribution is distinct from 250000
     or r.loan_amount is distinct from 540000 or r.loan_agreement is distinct from true then
    raise exception 'FAIL 6: l''agence ne lit pas le mode de financement de sa fiche';
  end if;
  begin
    update public.buyers set financing_mode = 'cash', loan_contribution = null,
      loan_amount = null, loan_agreement = null
      where id = '217ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 6: le navigateur modifie le mode de financement';
  exception when insufficient_privilege then
    -- Le même code sert au refus de la RLS : seul le droit qui manque compte ici.
    if sqlerrm <> 'permission denied for table buyers' then raise; end if;
  end;
  begin
    insert into public.buyers (agency_id, advisor_id, name, cities, financing_mode)
      values ('217aaaaa-0000-0000-0000-000000000000', '21711111-1111-1111-1111-111111111111',
              'Intrus', array['Grasse'], 'cash');
    raise exception 'FAIL 6: le navigateur crée une fiche avec son mode de financement';
  exception when insufficient_privilege then
    if sqlerrm <> 'permission denied for table buyers' then raise; end if;
  end;
end $$;
reset role;
select set_config('request.jwt.claims',
  '{"sub":"21722222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.buyers where id = '217ccccc-0000-0000-0000-000000000001') <> 0 then
    raise exception 'FAIL 6: une autre agence lit la fiche';
  end if;
end $$;
reset role;
-- Un membre retiré de l'agence ne lit plus rien (M105).
select set_config('request.jwt.claims',
  '{"sub":"21733333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.buyers) <> 0 then
    raise exception 'FAIL 6: un membre retiré lit les fiches acquéreur';
  end if;
end $$;
reset role;

-- §7 — le mode et le statut de financement (M132) restent indépendants : l'un ne pose pas
-- l'autre, dans un sens comme dans l'autre.
do $$
declare
  r record;
begin
  select financing, financing_mode into r
    from public.buyers where id = '217ccccc-0000-0000-0000-000000000001';
  if r.financing <> 'unknown' then
    raise exception 'FAIL 7: un prêt avec accord a changé le statut de financement';
  end if;
end $$;
update public.buyers set financing = 'validated' where id = '217ccccc-0000-0000-0000-000000000001';
do $$
begin
  if (select financing_mode from public.buyers where id = '217ccccc-0000-0000-0000-000000000001')
     <> 'loan' then
    raise exception 'FAIL 7: le statut « validé » a changé le mode de financement';
  end if;
end $$;

rollback;
