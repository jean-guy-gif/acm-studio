-- Mission 95 — le rythme du Live et sa durée, à la SOURCE DE VÉRITÉ, dans le rôle du navigateur
-- d'un conseiller :
--   §1 un dossier naît en rythme accéléré, modifiable tant que le Live n'a pas commencé ;
--   §2 le début s'écrit une fois : une reprise ne le remet pas à zéro ;
--   §3 le rythme ne se modifie plus une fois le Live commencé ;
--   §4 la fin suit le dernier « Terminer », et ne précède jamais le début ;
--   §5 un rythme inconnu est refusé.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/live_rhythm_and_duration.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values ('95111111-1111-1111-1111-111111111111');
insert into public.agencies (id, name) values ('95aaaaaa-0000-0000-0000-000000000000', 'A95');
insert into public.profiles (id, agency_id, first_name, last_name, email, role)
  values ('95111111-1111-1111-1111-111111111111', '95aaaaaa-0000-0000-0000-000000000000',
          'Al', 'A', 'a95@t.l', 'advisor');
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('95cccccc-0000-0000-0000-000000000001', '95aaaaaa-0000-0000-0000-000000000000',
   '95111111-1111-1111-1111-111111111111', 'rythme', 'ready_for_meeting');

select set_config('request.jwt.claims',
  '{"sub":"95111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;

-- §1 — accéléré par défaut, et modifiable avant le Live.
do $$
declare p public.projects%rowtype;
begin
  select * into p from public.projects where id = '95cccccc-0000-0000-0000-000000000001';
  if p.live_rhythm is distinct from 'accelerated' or p.live_started_at is not null then
    raise exception 'FAIL 1: défaut attendu accelerated sans début (%, %)',
      p.live_rhythm, p.live_started_at;
  end if;
  update public.projects set live_rhythm = 'complete'
    where id = '95cccccc-0000-0000-0000-000000000001';
  update public.projects set live_rhythm = 'accelerated'
    where id = '95cccccc-0000-0000-0000-000000000001';
  select * into p from public.projects where id = '95cccccc-0000-0000-0000-000000000001';
  if p.live_rhythm is distinct from 'accelerated' then
    raise exception 'FAIL 1: le rythme ne se modifie pas avant le Live';
  end if;
end $$;

-- §2 — le début, une fois.
do $$
declare p public.projects%rowtype;
begin
  update public.projects set live_started_at = '2026-10-15 10:00:00+00'
    where id = '95cccccc-0000-0000-0000-000000000001';
  -- La reprise après une pause renvoie « maintenant » : la base garde le premier début.
  update public.projects set live_started_at = '2026-10-15 10:25:00+00'
    where id = '95cccccc-0000-0000-0000-000000000001';
  update public.projects set live_started_at = null
    where id = '95cccccc-0000-0000-0000-000000000001';
  select * into p from public.projects where id = '95cccccc-0000-0000-0000-000000000001';
  if p.live_started_at is distinct from '2026-10-15 10:00:00+00'::timestamptz then
    raise exception 'FAIL 2: début remis à zéro (%)', p.live_started_at;
  end if;
end $$;

-- §3 — Live commencé : le rythme ne bouge plus.
do $$
declare p public.projects%rowtype;
begin
  update public.projects set live_rhythm = 'complete'
    where id = '95cccccc-0000-0000-0000-000000000001';
  select * into p from public.projects where id = '95cccccc-0000-0000-0000-000000000001';
  if p.live_rhythm is distinct from 'accelerated' then
    raise exception 'FAIL 3: rythme modifié en plein Live (%)', p.live_rhythm;
  end if;
end $$;

-- §4 — la fin suit le dernier « Terminer » ; jamais avant le début.
do $$
declare p public.projects%rowtype;
begin
  update public.projects set live_ended_at = '2026-10-15 10:41:00+00'
    where id = '95cccccc-0000-0000-0000-000000000001';
  update public.projects set live_ended_at = '2026-10-15 10:52:00+00'
    where id = '95cccccc-0000-0000-0000-000000000001';
  select * into p from public.projects where id = '95cccccc-0000-0000-0000-000000000001';
  if p.live_ended_at is distinct from '2026-10-15 10:52:00+00'::timestamptz then
    raise exception 'FAIL 4: la fin ne suit pas le dernier « Terminer » (%)', p.live_ended_at;
  end if;
  begin
    update public.projects set live_ended_at = '2026-10-15 09:00:00+00'
      where id = '95cccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 4: une fin avant le début est acceptée';
  exception when check_violation then null;
  end;
end $$;

-- §5 — un rythme inconnu est refusé.
do $$
begin
  begin
    insert into public.projects (agency_id, advisor_id, seller_name, status, live_rhythm)
      values ('95aaaaaa-0000-0000-0000-000000000000', '95111111-1111-1111-1111-111111111111',
              'x', 'draft', 'rapide');
    raise exception 'FAIL 5: rythme inconnu accepté';
  exception when check_violation then null;
  end;
end $$;

reset role;
rollback;
