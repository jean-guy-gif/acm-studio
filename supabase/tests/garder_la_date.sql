-- Mission 145 (partie B) — « Garder la date », à la SOURCE DE VÉRITÉ :
--   §1 une conclusion neuve n'a rien de gardé ; `conclude_meeting` n'y touche pas ;
--   §2 le moment et le nombre vont ensemble ; le nombre vaut 1 au moins ;
--   §3 le serveur (clé de service) les pose et les retire ; le changement d'issue et une conclusion
--      corrigée (second appel de `conclude_meeting`) ne les touchent pas ;
--   §4 depuis le navigateur : ni le conseiller, ni le manager de l'agence, ni un membre retiré, ni un
--      visiteur sans compte ne les écrivent ; le conseiller de l'agence les lit ; une autre agence et
--      un membre retiré ne les lisent pas.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/garder_la_date.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values
  ('14511111-1111-1111-1111-111111111111'),
  ('14522222-2222-2222-2222-222222222222'),
  ('14533333-3333-3333-3333-333333333333'),
  ('14544444-4444-4444-4444-444444444444');
insert into public.agencies (id, name) values
  ('145aaaaa-0000-0000-0000-000000000000', 'A145'),
  ('145bbbbb-0000-0000-0000-000000000000', 'B145');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('14511111-1111-1111-1111-111111111111', '145aaaaa-0000-0000-0000-000000000000',
   'Al', 'A', 'a145@t.l', 'advisor'),
  ('14522222-2222-2222-2222-222222222222', '145aaaaa-0000-0000-0000-000000000000',
   'Ma', 'M', 'm145@t.l', 'manager'),
  ('14533333-3333-3333-3333-333333333333', '145bbbbb-0000-0000-0000-000000000000',
   'Bo', 'B', 'b145@t.l', 'advisor');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, removed_at) values
  ('14544444-4444-4444-4444-444444444444', '145aaaaa-0000-0000-0000-000000000000',
   'Ré', 'R', 'r145@t.l', 'advisor', now());
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('145ccccc-0000-0000-0000-000000000001', '145aaaaa-0000-0000-0000-000000000000',
   '14511111-1111-1111-1111-111111111111', 'à relancer', 'ready_for_meeting');

-- §1 — une conclusion « à relancer » neuve : rien de gardé.
do $$
begin
  perform public.conclude_meeting(
    '145ccccc-0000-0000-0000-000000000001', '145aaaaa-0000-0000-0000-000000000000',
    'follow_up', null, 393000, 400000, 395000, 395000,
    p_follow_up_motive => 'thinking_price');
  if exists (select 1 from public.project_meeting_conclusions
             where project_id = '145ccccc-0000-0000-0000-000000000001'
               and (early_follow_up_kept_at is not null or early_follow_up_kept_ready is not null)) then
    raise exception 'FAIL 1: une conclusion neuve a une date gardée';
  end if;
end $$;

-- §2 — ensemble, et 1 au moins.
do $$
begin
  begin
    update public.project_meeting_conclusions set early_follow_up_kept_at = now()
      where project_id = '145ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 2: le moment accepté sans le nombre';
  exception when check_violation then null;
  end;
  begin
    update public.project_meeting_conclusions set early_follow_up_kept_ready = 2
      where project_id = '145ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 2: le nombre accepté sans le moment';
  exception when check_violation then null;
  end;
  begin
    update public.project_meeting_conclusions
      set early_follow_up_kept_at = now(), early_follow_up_kept_ready = 0
      where project_id = '145ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 2: un nombre à 0 accepté';
  exception when check_violation then null;
  end;
end $$;

-- §3 — le serveur les pose ; le changement d'issue ne les touche pas ; le serveur les retire.
set local role service_role;
update public.project_meeting_conclusions
  set early_follow_up_kept_at = now(), early_follow_up_kept_ready = 2
  where project_id = '145ccccc-0000-0000-0000-000000000001';
reset role;
do $$
declare
  r record;
begin
  perform public.change_meeting_outcome(
    '145ccccc-0000-0000-0000-000000000001', '145aaaaa-0000-0000-0000-000000000000',
    'follow_up', null, p_follow_up_motive => 'consulting_relative');
  select * into r from public.project_meeting_conclusions
    where project_id = '145ccccc-0000-0000-0000-000000000001';
  if r.early_follow_up_kept_ready is distinct from 2 or r.early_follow_up_kept_at is null then
    raise exception 'FAIL 3: le changement d''issue a touché la date gardée';
  end if;
  -- Une conclusion corrigée : le chemin de mise à jour de `conclude_meeting`.
  perform public.conclude_meeting(
    '145ccccc-0000-0000-0000-000000000001', '145aaaaa-0000-0000-0000-000000000000',
    'follow_up', null, 390000, 400000, 395000, 395000,
    p_follow_up_motive => 'thinking_price');
  select * into r from public.project_meeting_conclusions
    where project_id = '145ccccc-0000-0000-0000-000000000001';
  if r.early_follow_up_kept_ready is distinct from 2 or r.early_follow_up_kept_at is null then
    raise exception 'FAIL 3: une conclusion corrigée a touché la date gardée';
  end if;
end $$;
set local role service_role;
update public.project_meeting_conclusions
  set early_follow_up_kept_at = null, early_follow_up_kept_ready = null
  where project_id = '145ccccc-0000-0000-0000-000000000001';
reset role;
update public.project_meeting_conclusions
  set early_follow_up_kept_at = now(), early_follow_up_kept_ready = 3
  where project_id = '145ccccc-0000-0000-0000-000000000001';

-- §4 — le navigateur n'écrit rien : conseiller et manager de l'agence, membre retiré, visiteur.
select set_config('request.jwt.claims',
  '{"sub":"14511111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  update public.project_meeting_conclusions
    set early_follow_up_kept_at = null, early_follow_up_kept_ready = null
    where project_id = '145ccccc-0000-0000-0000-000000000001';
  raise exception 'FAIL 4: le conseiller de lagence écrit la date gardée depuis le navigateur';
exception when insufficient_privilege then null;
end $$;
reset role;
select set_config('request.jwt.claims',
  '{"sub":"14522222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  update public.project_meeting_conclusions
    set early_follow_up_kept_at = null, early_follow_up_kept_ready = null
    where project_id = '145ccccc-0000-0000-0000-000000000001';
  raise exception 'FAIL 4: le manager de lagence écrit la date gardée depuis le navigateur';
exception when insufficient_privilege then null;
end $$;
reset role;
select set_config('request.jwt.claims',
  '{"sub":"14544444-4444-4444-4444-444444444444","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  update public.project_meeting_conclusions
    set early_follow_up_kept_at = null, early_follow_up_kept_ready = null
    where project_id = '145ccccc-0000-0000-0000-000000000001';
  raise exception 'FAIL 4: un membre retiré écrit la date gardée depuis le navigateur';
exception when insufficient_privilege then null;
end $$;
reset role;
set local role anon;
do $$
begin
  update public.project_meeting_conclusions
    set early_follow_up_kept_at = null, early_follow_up_kept_ready = null
    where project_id = '145ccccc-0000-0000-0000-000000000001';
  raise exception 'FAIL 4: un visiteur sans compte écrit la date gardée';
exception when insufficient_privilege then null;
end $$;
reset role;

-- Le conseiller de l'agence lit la date gardée (contrôle positif).
select set_config('request.jwt.claims',
  '{"sub":"14511111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select early_follow_up_kept_ready from public.project_meeting_conclusions
      where project_id = '145ccccc-0000-0000-0000-000000000001') is distinct from 3 then
    raise exception 'FAIL 4: le conseiller de l''agence ne lit pas la date gardée';
  end if;
end $$;
reset role;

-- Un membre retiré ne la lit pas.
select set_config('request.jwt.claims',
  '{"sub":"14544444-4444-4444-4444-444444444444","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if exists (select 1 from public.project_meeting_conclusions
             where project_id = '145ccccc-0000-0000-0000-000000000001') then
    raise exception 'FAIL 4: un membre retiré lit la date gardée';
  end if;
end $$;
reset role;

-- La conclusion de l'agence A ne se lit pas depuis une autre agence ; la date gardée est intacte.
select set_config('request.jwt.claims',
  '{"sub":"14533333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if exists (select 1 from public.project_meeting_conclusions
             where project_id = '145ccccc-0000-0000-0000-000000000001') then
    raise exception 'FAIL 4: une autre agence lit la date gardée';
  end if;
end $$;
reset role;
do $$
begin
  if (select early_follow_up_kept_ready from public.project_meeting_conclusions
      where project_id = '145ccccc-0000-0000-0000-000000000001') is distinct from 3 then
    raise exception 'FAIL 4: la date gardée a bougé';
  end if;
end $$;

rollback;
