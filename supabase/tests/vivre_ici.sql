-- Mission 142 — Vivre ici, à la SOURCE DE VÉRITÉ :
--   §1 la fiche d'un bien : une par bien et par agence, une origine fermée (adresse, quartier,
--      commune), un contenu objet borné, la date posée par la base à l'insertion comme à
--      l'actualisation ;
--   §2 l'agence lit ses fiches, une autre agence, un membre retiré et un visiteur sans compte ne
--      lisent rien ; le navigateur n'écrit, ne modifie ni ne supprime rien ;
--   §3 les ★ du secteur (liste fermée), « Un lieu qui compte pour vous » (200 caractères), le jour
--      de la visite et le trajet jusqu'au lieu de l'acquéreur (un objet borné) ; le navigateur ne
--      les écrit pas ;
--   §4 la fiche part avec son agence.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/vivre_ici.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values
  ('14211111-1111-1111-1111-111111111111'),
  ('14222222-2222-2222-2222-222222222222'),
  ('14233333-3333-3333-3333-333333333333');
insert into public.agencies (id, name) values
  ('142aaaaa-0000-0000-0000-000000000000', 'A142'),
  ('142bbbbb-0000-0000-0000-000000000000', 'B142');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('14211111-1111-1111-1111-111111111111', '142aaaaa-0000-0000-0000-000000000000',
   'Al', 'A', 'a142@t.l', 'advisor'),
  ('14222222-2222-2222-2222-222222222222', '142bbbbb-0000-0000-0000-000000000000',
   'Bo', 'B', 'b142@t.l', 'advisor'),
  ('14233333-3333-3333-3333-333333333333', '142aaaaa-0000-0000-0000-000000000000',
   'Ré', 'R', 'r142@t.l', 'advisor');
update public.profiles set removed_at = now() where id = '14233333-3333-3333-3333-333333333333';
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('142ccccc-0000-0000-0000-000000000001', '142aaaaa-0000-0000-0000-000000000000',
   '14211111-1111-1111-1111-111111111111', 'dossier A', 'draft'),
  ('142ccccc-0000-0000-0000-000000000002', '142bbbbb-0000-0000-0000-000000000000',
   '14222222-2222-2222-2222-222222222222', 'dossier B', 'draft');

-- §1 — la fiche d'un bien.
insert into public.living_here_sheets (id, agency_id, property_key, origin, built_by, built_at, blocks)
values ('142eeee0-0000-0000-0000-000000000001', '142aaaaa-0000-0000-0000-000000000000',
        'listing:seloger:123456', 'district', '14211111-1111-1111-1111-111111111111',
        now() - interval '30 days', '{"daily":{"state":"empty"}}'::jsonb);
do $$
begin
  if (select built_at from public.living_here_sheets
        where id = '142eeee0-0000-0000-0000-000000000001') < now() - interval '1 minute' then
    raise exception 'FAIL 1a: la date de construction fournie a été gardée';
  end if;
  begin
    insert into public.living_here_sheets (agency_id, property_key, origin)
      values ('142aaaaa-0000-0000-0000-000000000000', 'listing:seloger:123456', 'commune');
    raise exception 'FAIL 1b: une seconde fiche pour le même bien de la même agence a été acceptée';
  exception when unique_violation then null;
  end;
  begin
    insert into public.living_here_sheets (agency_id, property_key, origin)
      values ('142aaaaa-0000-0000-0000-000000000000', 'listing:seloger:9', 'exact');
    raise exception 'FAIL 1c: une origine hors liste a été acceptée';
  exception when check_violation then null;
  end;
  begin
    insert into public.living_here_sheets (agency_id, property_key, origin, blocks)
      values ('142aaaaa-0000-0000-0000-000000000000', 'listing:seloger:10', 'address', '[]'::jsonb);
    raise exception 'FAIL 1d: un contenu qui n''est pas un objet a été accepté';
  exception when check_violation then null;
  end;
  begin
    insert into public.living_here_sheets (agency_id, property_key, origin)
      values ('142aaaaa-0000-0000-0000-000000000000', '12 rue des Lilas', 'address');
    raise exception 'FAIL 1f: une clé hors forme a été acceptée';
  exception when check_violation then null;
  end;
  begin
    insert into public.living_here_sheets (agency_id, property_key, origin)
      values ('142aaaaa-0000-0000-0000-000000000000',
              'project:142ccccc-0000-0000-0000-000000000002', 'address');
    raise exception 'FAIL 1g: la fiche du dossier d''une autre agence a été acceptée';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  begin
    insert into public.living_here_sheets (agency_id, property_key, origin)
      values ('142aaaaa-0000-0000-0000-000000000000',
              'competitor:142ddddd-0000-0000-0000-000000000009', 'district');
    raise exception 'FAIL 1h: la fiche d''un concurrent inconnu de l''agence a été acceptée';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;
-- La fiche d'un dossier de l'agence : acceptée ; elle reste quand son dossier est supprimé (elle
-- n'a pas de lien en base, un effacement l'efface par sa clé).
insert into public.living_here_sheets (agency_id, property_key, origin)
  values ('142aaaaa-0000-0000-0000-000000000000',
          'project:142ccccc-0000-0000-0000-000000000001', 'address');
-- Le même bien dans une autre agence : sa propre fiche.
insert into public.living_here_sheets (agency_id, property_key, origin)
  values ('142bbbbb-0000-0000-0000-000000000000', 'listing:seloger:123456', 'commune');
update public.living_here_sheets set built_at = now() - interval '30 days'
  where id = '142eeee0-0000-0000-0000-000000000001';
do $$
begin
  if (select built_at from public.living_here_sheets
        where id = '142eeee0-0000-0000-0000-000000000001') < now() - interval '1 minute' then
    raise exception 'FAIL 1e: l''actualisation a gardé la date fournie';
  end if;
end $$;

-- §3 — les colonnes de l'acquéreur et de la visite.
insert into public.buyers (id, agency_id, advisor_id, name, cities, sector_priorities, living_place)
values ('142ffff0-0000-0000-0000-000000000001', '142aaaaa-0000-0000-0000-000000000000',
        '14211111-1111-1111-1111-111111111111', 'Famille Test', array['Mougins'],
        array['quiet', 'schools'], 'Sophia Antipolis');
do $$
begin
  if (select sector_priorities from public.buyers where id = '142ffff0-0000-0000-0000-000000000001')
     <> array['quiet', 'schools'] then
    raise exception 'FAIL 3a: les ★ du secteur ne sont pas gardées';
  end if;
  begin
    update public.buyers set sector_priorities = array['pool']
      where id = '142ffff0-0000-0000-0000-000000000001';
    raise exception 'FAIL 3b: une ★ du secteur hors liste a été acceptée';
  exception when check_violation then null;
  end;
  begin
    update public.buyers set living_place = repeat('x', 201)
      where id = '142ffff0-0000-0000-0000-000000000001';
    raise exception 'FAIL 3c: un lieu de plus de 200 caractères a été accepté';
  exception when check_violation then null;
  end;
  begin
    update public.buyers set living_place = '   '
      where id = '142ffff0-0000-0000-0000-000000000001';
    raise exception 'FAIL 3d: un lieu vide a été accepté';
  exception when check_violation then null;
  end;
end $$;
insert into public.buyers (id, agency_id, advisor_id, name, cities)
values ('142ffff0-0000-0000-0000-000000000002', '142aaaaa-0000-0000-0000-000000000000',
        '14211111-1111-1111-1111-111111111111', 'Famille Défaut', array['Vence']);
do $$
begin
  if (select sector_priorities <> '{}' or living_place is not null from public.buyers
        where id = '142ffff0-0000-0000-0000-000000000002') then
    raise exception 'FAIL 3e: une fiche sans ces colonnes n''a pas « aucune ★ » et « aucun lieu »';
  end if;
end $$;
do $$
declare
  v_col record;
  v_found integer := 0;
begin
  for v_col in
    select column_name, is_nullable from information_schema.columns
     where table_schema = 'public' and table_name = 'buyer_visit_requests'
       and column_name in ('scheduled_at', 'living_place_trip')
  loop
    v_found := v_found + 1;
    if v_col.is_nullable <> 'YES' then
      raise exception 'FAIL 3f: % doit rester nulle par défaut', v_col.column_name;
    end if;
  end loop;
  if v_found <> 2 then
    raise exception 'FAIL 3f: les deux colonnes de la visite sont attendues, % trouvée(s)', v_found;
  end if;
  if (select count(*) from information_schema.check_constraints c
        join information_schema.constraint_column_usage u using (constraint_schema, constraint_name)
       where u.table_name = 'buyer_visit_requests' and u.column_name = 'living_place_trip') = 0 then
    raise exception 'FAIL 3g: le trajet jusqu''au lieu n''est pas borné';
  end if;
end $$;

-- §2 — qui lit, et le navigateur n'écrit rien.
select set_config('request.jwt.claims',
  '{"sub":"14211111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.living_here_sheets) <> 2 then
    raise exception 'FAIL 2a: le conseiller de l''agence ne lit pas ses deux fiches';
  end if;
  begin
    update public.buyer_visit_requests set scheduled_at = now(), living_place_trip = '{}'::jsonb;
    raise exception 'FAIL 2i: le navigateur a écrit le jour ou le trajet d''une visite';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.living_here_sheets (agency_id, property_key, origin)
      values ('142aaaaa-0000-0000-0000-000000000000', 'project:x3', 'address');
    raise exception 'FAIL 2b: le navigateur a écrit une fiche';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.living_here_sheets set origin = 'address'
      where id = '142eeee0-0000-0000-0000-000000000001';
    raise exception 'FAIL 2c: le navigateur a modifié une fiche';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.living_here_sheets where id = '142eeee0-0000-0000-0000-000000000001';
    raise exception 'FAIL 2d: le navigateur a supprimé une fiche';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.buyers set living_place = 'ailleurs'
      where id = '142ffff0-0000-0000-0000-000000000001';
    raise exception 'FAIL 2e: le navigateur a écrit le lieu de l''acquéreur';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select set_config('request.jwt.claims',
  '{"sub":"14222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.living_here_sheets
        where id = '142eeee0-0000-0000-0000-000000000001') <> 0 then
    raise exception 'FAIL 2f: une autre agence lit la fiche';
  end if;
end $$;
reset role;
select set_config('request.jwt.claims',
  '{"sub":"14233333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.living_here_sheets) <> 0 then
    raise exception 'FAIL 2g: un membre retiré lit une fiche';
  end if;
end $$;
reset role;
set local role anon;
do $$
begin
  perform count(*) from public.living_here_sheets;
  raise exception 'FAIL 2h: un visiteur sans compte lit les fiches';
exception when insufficient_privilege then null;
end $$;
reset role;

-- §4 — un dossier supprimé laisse sa fiche (aucun lien en base) ; la fiche part avec son agence.
delete from public.projects where id = '142ccccc-0000-0000-0000-000000000001';
do $$
begin
  if not exists (select 1 from public.living_here_sheets
                  where property_key = 'project:142ccccc-0000-0000-0000-000000000001') then
    raise exception 'FAIL 4b: la fiche est partie avec son dossier, sans procédure';
  end if;
end $$;
delete from public.buyers where agency_id = '142bbbbb-0000-0000-0000-000000000000';
delete from public.projects where agency_id = '142bbbbb-0000-0000-0000-000000000000';
delete from public.profiles where agency_id = '142bbbbb-0000-0000-0000-000000000000';
delete from public.agencies where id = '142bbbbb-0000-0000-0000-000000000000';
do $$
begin
  if exists (select 1 from public.living_here_sheets
              where agency_id = '142bbbbb-0000-0000-0000-000000000000') then
    raise exception 'FAIL 4a: une fiche est restée après la suppression de son agence';
  end if;
end $$;

rollback;
