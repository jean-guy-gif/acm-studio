-- Mission 115 (partie C) — collaboration obtenue ou refusée avec un confrère, prouvée dans la base :
--   §1 les deux faits sont nuls par défaut ;
--   §2 un conseiller de l'agence pose « obtenue » sur un concurrent contacté, puis l'annule ;
--   §3 ni l'un ni l'autre sans contact (contrainte) ; jamais les deux (contrainte) ;
--      jamais « obtenue » avec un mandat rentré (contrainte) ;
--   §4 « refusée » se pose, puis le parcours propriétaire (remis, rendez-vous) se redate ;
--   §5 une autre agence ne pose rien (politique : aucune ligne touchée).
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/collaboration.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id, email) values
  ('11511111-0000-0000-0000-0000000000a1', 'ca@a115.test'),
  ('11511111-0000-0000-0000-0000000000b1', 'cb@b115.test');
insert into public.agencies (id, name) values
  ('115aaaaa-0000-0000-0000-000000000000', 'Agence A 115'),
  ('115bbbbb-0000-0000-0000-000000000000', 'Agence B 115');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('11511111-0000-0000-0000-0000000000a1', '115aaaaa-0000-0000-0000-000000000000',
   'Carl', 'Conseiller', 'ca@a115.test', 'advisor'),
  ('11511111-0000-0000-0000-0000000000b1', '115bbbbb-0000-0000-0000-000000000000',
   'Boris', 'Conseiller', 'cb@b115.test', 'advisor');
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('115aaaaa-1111-0000-0000-000000000000', '115aaaaa-0000-0000-0000-000000000000',
   '11511111-0000-0000-0000-0000000000a1', 'Vendeur 115', 'meeting_completed');
insert into public.comparables (id, agency_id, project_id, title, price, is_selected, display_order, exclusivity, exclusivity_source) values
  ('115aaaaa-2222-0000-0000-000000000000', '115aaaaa-0000-0000-0000-000000000000',
   '115aaaaa-1111-0000-0000-000000000000', 'Confrère 115', 300000, true, 1, 'yes', 'badge');

create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
grant execute on function pg_temp.act_as(uuid) to authenticated;

-- Une écriture refusée par une CONTRAINTE lève 23514 ; refusée par une POLITIQUE, elle ne touche
-- aucune ligne. `attempt` rend 'contrainte', ou le nombre de lignes touchées.
create function pg_temp.attempt(p_sql text) returns text language plpgsql as $$
declare v_rows int;
begin
  execute p_sql;
  get diagnostics v_rows = row_count;
  return v_rows::text;
exception when check_violation then
  return 'contrainte';
end $$;
grant execute on function pg_temp.attempt(text) to authenticated;

create function pg_temp.expect(p_label text, p_got text, p_want text) returns void
language plpgsql as $$
begin
  if p_got is distinct from p_want then
    raise exception 'FAIL % : attendu %, obtenu %', p_label, p_want, p_got;
  end if;
  raise notice 'ok — %', p_label;
end $$;
grant execute on function pg_temp.expect(text, text, text) to authenticated;

-- §1 — nuls par défaut.
select pg_temp.expect('§1 aucune collaboration par défaut',
  (select (prospecting_collaboration_at is null and prospecting_collaboration_declined_at is null)::text
   from public.comparables where id = '115aaaaa-2222-0000-0000-000000000000'), 'true');

-- §3 — sans contact, rien ne se pose.
select pg_temp.act_as('11511111-0000-0000-0000-0000000000a1');
select pg_temp.expect('§3 « obtenue » sans contact',
  pg_temp.attempt($$update public.comparables set prospecting_collaboration_at = now()
                    where id = '115aaaaa-2222-0000-0000-000000000000'$$), 'contrainte');
select pg_temp.expect('§3 « refusée » sans contact',
  pg_temp.attempt($$update public.comparables set prospecting_collaboration_declined_at = now()
                    where id = '115aaaaa-2222-0000-0000-000000000000'$$), 'contrainte');

-- §2 — contacté, puis « obtenue », puis annulée.
select pg_temp.expect('§2 le conseiller marque le confrère contacté',
  pg_temp.attempt($$update public.comparables set prospecting_handed_at = now()
                    where id = '115aaaaa-2222-0000-0000-000000000000'$$), '1');
select pg_temp.expect('§2 le conseiller pose « collaboration obtenue »',
  pg_temp.attempt($$update public.comparables set prospecting_collaboration_at = now()
                    where id = '115aaaaa-2222-0000-0000-000000000000'$$), '1');
select pg_temp.expect('§3 jamais les deux',
  pg_temp.attempt($$update public.comparables set prospecting_collaboration_declined_at = now()
                    where id = '115aaaaa-2222-0000-0000-000000000000'$$), 'contrainte');
select pg_temp.expect('§3 jamais « obtenue » avec un mandat rentré',
  pg_temp.attempt($$update public.comparables
                    set prospecting_meeting_at = now(), prospecting_mandate_at = now()
                    where id = '115aaaaa-2222-0000-0000-000000000000'$$), 'contrainte');
select pg_temp.expect('§2 le conseiller annule la collaboration obtenue',
  pg_temp.attempt($$update public.comparables set prospecting_collaboration_at = null
                    where id = '115aaaaa-2222-0000-0000-000000000000'$$), '1');

-- §4 — « refusée », puis le parcours propriétaire se redate.
select pg_temp.expect('§4 le conseiller pose « collaboration refusée »',
  pg_temp.attempt($$update public.comparables set prospecting_collaboration_declined_at = now()
                    where id = '115aaaaa-2222-0000-0000-000000000000'$$), '1');
select pg_temp.expect('§4 remis au propriétaire, puis rendez-vous',
  pg_temp.attempt($$update public.comparables
                    set prospecting_handed_at = now() + interval '1 day',
                        prospecting_meeting_at = now() + interval '2 days'
                    where id = '115aaaaa-2222-0000-0000-000000000000'$$), '1');

-- §5 — une autre agence ne touche rien.
select pg_temp.act_as('11511111-0000-0000-0000-0000000000b1');
select pg_temp.expect('§5 une autre agence pose une collaboration',
  pg_temp.attempt($$update public.comparables set prospecting_collaboration_at = now()
                    where id = '115aaaaa-2222-0000-0000-000000000000'$$), '0');
select pg_temp.expect('§5 une autre agence retire le refus',
  pg_temp.attempt($$update public.comparables set prospecting_collaboration_declined_at = null
                    where id = '115aaaaa-2222-0000-0000-000000000000'$$), '0');

rollback;
