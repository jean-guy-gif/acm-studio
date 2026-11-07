-- Mission 141 — Le dossier d'adresse, à la SOURCE DE VÉRITÉ :
--   §1 la base refuse le dossier d'une autre agence, un contenu qui n'est pas un objet, une
--      empreinte vide, un second dossier d'adresse pour le même dossier ; elle date la
--      construction elle-même, à l'insertion comme à l'actualisation (une date fournie est ignorée) ;
--   §2 le conseiller de l'agence lit, une autre agence, un membre retiré et un visiteur sans compte
--      ne lisent rien, le navigateur n'écrit, ne modifie ni ne supprime rien ;
--   §3 le dossier d'adresse part avec son dossier.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/dossier_adresse.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values
  ('14111111-1111-1111-1111-111111111111'),
  ('14122222-2222-2222-2222-222222222222'),
  ('14133333-3333-3333-3333-333333333333');
insert into public.agencies (id, name) values
  ('141aaaaa-0000-0000-0000-000000000000', 'A141'),
  ('141bbbbb-0000-0000-0000-000000000000', 'B141');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('14111111-1111-1111-1111-111111111111', '141aaaaa-0000-0000-0000-000000000000',
   'Al', 'A', 'a141@t.l', 'advisor'),
  ('14122222-2222-2222-2222-222222222222', '141bbbbb-0000-0000-0000-000000000000',
   'Bo', 'B', 'b141@t.l', 'advisor'),
  ('14133333-3333-3333-3333-333333333333', '141aaaaa-0000-0000-0000-000000000000',
   'Ré', 'R', 'r141@t.l', 'advisor');
update public.profiles set removed_at = now() where id = '14133333-3333-3333-3333-333333333333';
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('141ccccc-0000-0000-0000-000000000001', '141aaaaa-0000-0000-0000-000000000000',
   '14111111-1111-1111-1111-111111111111', 'dossier A', 'draft'),
  ('141ccccc-0000-0000-0000-000000000002', '141bbbbb-0000-0000-0000-000000000000',
   '14122222-2222-2222-2222-222222222222', 'dossier B', 'draft');

-- §1 — ce que la base refuse, et la date qu'elle pose.
insert into public.address_dossiers (id, agency_id, project_id, built_by, built_at, address_fingerprint, blocks)
values ('141eeee0-0000-0000-0000-000000000001', '141aaaaa-0000-0000-0000-000000000000',
        '141ccccc-0000-0000-0000-000000000001', '14111111-1111-1111-1111-111111111111',
        now() - interval '30 days', '4 chemin|06140|vence|house', '{"dvf":{"state":"empty"}}'::jsonb);
do $$
begin
  if (select built_at from public.address_dossiers
        where id = '141eeee0-0000-0000-0000-000000000001') < now() - interval '1 minute' then
    raise exception 'FAIL 1a: la date de construction fournie a été gardée';
  end if;
  begin
    insert into public.address_dossiers (agency_id, project_id, address_fingerprint)
      values ('141bbbbb-0000-0000-0000-000000000000', '141ccccc-0000-0000-0000-000000000001', 'x');
    raise exception 'FAIL 1b: un dossier d''adresse sur le dossier d''une autre agence a été accepté';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  begin
    insert into public.address_dossiers (agency_id, project_id, address_fingerprint, blocks)
      values ('141bbbbb-0000-0000-0000-000000000000', '141ccccc-0000-0000-0000-000000000002', 'x', '[]'::jsonb);
    raise exception 'FAIL 1c: un contenu qui n''est pas un objet a été accepté';
  exception when check_violation then null;
  end;
  begin
    insert into public.address_dossiers (agency_id, project_id, address_fingerprint)
      values ('141bbbbb-0000-0000-0000-000000000000', '141ccccc-0000-0000-0000-000000000002', '');
    raise exception 'FAIL 1d: une empreinte vide a été acceptée';
  exception when check_violation then null;
  end;
  begin
    insert into public.address_dossiers (agency_id, project_id, address_fingerprint)
      values ('141aaaaa-0000-0000-0000-000000000000', '141ccccc-0000-0000-0000-000000000001', 'x');
    raise exception 'FAIL 1e: un second dossier d''adresse pour le même dossier a été accepté';
  exception when unique_violation then null;
  end;
  begin
    update public.address_dossiers set project_id = '141ccccc-0000-0000-0000-000000000002'
      where id = '141eeee0-0000-0000-0000-000000000001';
    raise exception 'FAIL 1f: le dossier d''adresse a été déplacé vers le dossier d''une autre agence';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;

-- « Actualiser » : la base redate, quelle que soit la date fournie.
update public.address_dossiers
  set built_at = now() - interval '30 days', blocks = '{"dvf":{"state":"ok"}}'::jsonb
  where id = '141eeee0-0000-0000-0000-000000000001';
do $$
begin
  if (select built_at from public.address_dossiers
        where id = '141eeee0-0000-0000-0000-000000000001') < now() - interval '1 minute' then
    raise exception 'FAIL 1g: l''actualisation a gardé la date fournie';
  end if;
end $$;

-- §2 — qui lit, et le navigateur n'écrit rien.
select set_config('request.jwt.claims',
  '{"sub":"14111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.address_dossiers) <> 1 then
    raise exception 'FAIL 2a: le conseiller de l''agence ne lit pas son dossier d''adresse';
  end if;
  begin
    insert into public.address_dossiers (agency_id, project_id, address_fingerprint)
      values ('141aaaaa-0000-0000-0000-000000000000', '141ccccc-0000-0000-0000-000000000001', 'x');
    raise exception 'FAIL 2b: le navigateur a écrit un dossier d''adresse';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.address_dossiers set blocks = '{}'::jsonb
      where id = '141eeee0-0000-0000-0000-000000000001';
    raise exception 'FAIL 2c: le navigateur a modifié un dossier d''adresse';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.address_dossiers where id = '141eeee0-0000-0000-0000-000000000001';
    raise exception 'FAIL 2d: le navigateur a supprimé un dossier d''adresse';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select set_config('request.jwt.claims',
  '{"sub":"14122222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.address_dossiers) <> 0 then
    raise exception 'FAIL 2e: une autre agence lit un dossier d''adresse';
  end if;
end $$;
reset role;
select set_config('request.jwt.claims',
  '{"sub":"14133333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.address_dossiers) <> 0 then
    raise exception 'FAIL 2f: un membre retiré lit un dossier d''adresse';
  end if;
end $$;
reset role;

set local role anon;
do $$
begin
  perform count(*) from public.address_dossiers;
  raise exception 'FAIL 2g: un visiteur sans compte lit les dossiers d''adresse';
exception when insufficient_privilege then null;
end $$;
reset role;

-- §3 — il part avec son dossier.
delete from public.projects where id = '141ccccc-0000-0000-0000-000000000001';
do $$
begin
  if exists (select 1 from public.address_dossiers where id = '141eeee0-0000-0000-0000-000000000001') then
    raise exception 'FAIL 3a: le dossier d''adresse est resté après la suppression de son dossier';
  end if;
end $$;

rollback;
