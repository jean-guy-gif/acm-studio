-- Mission 132 — le financement et le dernier contact d'un acquéreur, à la SOURCE DE VÉRITÉ :
--   §1 une fiche neuve a un financement « unknown », sans date, sans contact ;
--   §2 une valeur hors liste est refusée ;
--   §3 le navigateur ne les écrit pas (lecture seule, M117), ni à l'insertion ni à la modification ;
--   §4 il les lit pour son agence, une autre agence ne voit rien.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/fiche_rapide.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values
  ('13211111-1111-1111-1111-111111111111'),
  ('13222222-2222-2222-2222-222222222222');
insert into public.agencies (id, name) values
  ('132aaaaa-0000-0000-0000-000000000000', 'A132'),
  ('132bbbbb-0000-0000-0000-000000000000', 'B132');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('13211111-1111-1111-1111-111111111111', '132aaaaa-0000-0000-0000-000000000000',
   'Al', 'A', 'a132@t.l', 'advisor'),
  ('13222222-2222-2222-2222-222222222222', '132bbbbb-0000-0000-0000-000000000000',
   'Bo', 'B', 'b132@t.l', 'advisor');
insert into public.buyers (id, agency_id, advisor_id, name, cities) values
  ('132ccccc-0000-0000-0000-000000000001', '132aaaaa-0000-0000-0000-000000000000',
   '13211111-1111-1111-1111-111111111111', 'Famille Test', array['Mougins']);

-- §1 — les défauts.
do $$
declare
  r record;
begin
  select financing, financing_changed_at, contacted_at into r from public.buyers
    where id = '132ccccc-0000-0000-0000-000000000001';
  if r.financing <> 'unknown' or r.financing_changed_at is not null or r.contacted_at is not null then
    raise exception 'FAIL 1: une fiche neuve n''a pas un financement inconnu, sans date ni contact';
  end if;
end $$;

-- §2 — hors liste refusé ; les trois valeurs acceptées.
do $$
begin
  begin
    update public.buyers set financing = 'maybe' where id = '132ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 2: un financement hors liste accepté';
  exception when check_violation then null;
  end;
end $$;
update public.buyers set financing = 'in_progress', financing_changed_at = now()
  where id = '132ccccc-0000-0000-0000-000000000001';
update public.buyers set financing = 'validated', contacted_at = now()
  where id = '132ccccc-0000-0000-0000-000000000001';

-- §3 et §4 — le navigateur lit son agence, n'écrit rien ; une autre agence ne voit rien.
select set_config('request.jwt.claims',
  '{"sub":"13211111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select financing from public.buyers where id = '132ccccc-0000-0000-0000-000000000001')
     is distinct from 'validated' then
    raise exception 'FAIL 4: l''agence ne lit pas le financement de sa fiche';
  end if;
  begin
    update public.buyers set financing = 'unknown', contacted_at = null
      where id = '132ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 3: le navigateur modifie le financement';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.buyers (agency_id, advisor_id, name, cities, financing, contacted_at)
      values ('132aaaaa-0000-0000-0000-000000000000', '13211111-1111-1111-1111-111111111111',
              'Intrus', array['Grasse'], 'validated', now());
    raise exception 'FAIL 3: le navigateur crée une fiche avec son financement';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select set_config('request.jwt.claims',
  '{"sub":"13222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.buyers where id = '132ccccc-0000-0000-0000-000000000001') <> 0 then
    raise exception 'FAIL 4: une autre agence lit la fiche';
  end if;
end $$;
reset role;

rollback;
