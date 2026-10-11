-- Mission 88 — les portes fermées, prouvées à la SOURCE DE VÉRITÉ : la base, vue comme la voit
-- le navigateur (rôle `authenticated`, identité du jeton).
--   §1 un conseiller ne peut pas se nommer manager ;
--   §2 un conseiller ne peut ni retirer un collègue, ni modifier son téléphone ;
--   §3 un conseiller modifie son propre téléphone (doit passer), et rien d'autre que « Mon profil » ;
--   §4 un manager non plus ne change pas un rôle depuis le navigateur ; ni insertion ni suppression ;
--   §5 un conseiller ne modifie pas l'agence ; un manager si (doit passer), la sienne seulement ;
--   §6 un membre retiré ne modifie plus rien, et lit encore son propre profil ;
--   §7 la lecture reste la même : les profils de son agence, jamais ceux d'une autre ;
--   §8 un invité ne peut pas créer d'agence ; il rejoint celle qui l'invite ; un non-invité peut.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/closed_doors.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

-- Identifiants : agence A (manager M, conseillers C1 et C2), agence B (manager MB),
-- un invité I (invitation en attente dans A) et un inconnu O (aucune invitation).
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'm@a.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'c1@a.test'),
  ('00000000-0000-0000-0000-0000000000c2', 'c2@a.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'm@b.test'),
  ('00000000-0000-0000-0000-0000000000e1', 'Invite@A.test'),
  ('00000000-0000-0000-0000-0000000000f1', 'inconnu@ailleurs.test');
insert into public.agencies (id, name) values
  ('aaaaaaaa-8888-0000-0000-000000000000', 'Agence A'),
  ('bbbbbbbb-8888-0000-0000-000000000000', 'Agence B');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, phone) values
  ('00000000-0000-0000-0000-0000000000a1', 'aaaaaaaa-8888-0000-0000-000000000000', 'Marie', 'Manager', 'm@a.test', 'manager', '01 00 00 00 01'),
  ('00000000-0000-0000-0000-0000000000c1', 'aaaaaaaa-8888-0000-0000-000000000000', 'Carl', 'Un', 'c1@a.test', 'advisor', '01 00 00 00 02'),
  ('00000000-0000-0000-0000-0000000000c2', 'aaaaaaaa-8888-0000-0000-000000000000', 'Cora', 'Deux', 'c2@a.test', 'advisor', '01 00 00 00 03'),
  ('00000000-0000-0000-0000-0000000000b1', 'bbbbbbbb-8888-0000-0000-000000000000', 'Boris', 'Autre', 'm@b.test', 'manager', '01 00 00 00 04');
insert into public.agency_invitations (agency_id, email, role, invited_by) values
  ('aaaaaaaa-8888-0000-0000-000000000000', 'invite@a.test', 'advisor', '00000000-0000-0000-0000-0000000000a1');

-- Se présenter comme le navigateur d'un utilisateur : rôle `authenticated` + identité du jeton.
create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
grant execute on function pg_temp.act_as(uuid) to authenticated;

-- Une écriture refusée par les PRIVILÈGES lève 42501 ; refusée par une POLITIQUE, elle ne
-- touche aucune ligne. `attempt` rend 'refus' (42501), ou le nombre de lignes touchées.
create function pg_temp.attempt(p_sql text) returns text language plpgsql as $$
declare v_rows int;
begin
  execute p_sql;
  get diagnostics v_rows = row_count;
  return v_rows::text;
exception when insufficient_privilege then
  return 'refus';
end $$;
grant execute on function pg_temp.attempt(text) to authenticated;

create function pg_temp.expect(p_label text, p_got text, p_want text) returns void
language plpgsql as $$
begin
  if p_got is distinct from p_want then
    raise exception 'FAIL % : attendu %, obtenu %', p_label, p_want, p_got;
  end if;
end $$;
grant execute on function pg_temp.expect(text, text, text) to authenticated;

-- =====================================================================
-- §1 à §3 — le conseiller C1, depuis son navigateur.
-- =====================================================================
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');

select pg_temp.expect('§1 se nommer manager',
  pg_temp.attempt($$update public.profiles set role = 'manager'
                    where id = '00000000-0000-0000-0000-0000000000c1'$$), 'refus');
select pg_temp.expect('§2 retirer un collègue',
  pg_temp.attempt($$update public.profiles set removed_at = now()
                    where id = '00000000-0000-0000-0000-0000000000c2'$$), 'refus');
select pg_temp.expect('§2 téléphone d''un collègue',
  pg_temp.attempt($$update public.profiles set phone = '09 99 99 99 99'
                    where id = '00000000-0000-0000-0000-0000000000c2'$$), '0');
select pg_temp.expect('§2 téléphone du manager',
  pg_temp.attempt($$update public.profiles set phone = '09 99 99 99 99'
                    where id = '00000000-0000-0000-0000-0000000000a1'$$), '0');
select pg_temp.expect('§3 son propre téléphone',
  pg_temp.attempt($$update public.profiles set phone = '06 12 34 56 78', updated_at = now()
                    where id = '00000000-0000-0000-0000-0000000000c1'$$), '1');
select pg_temp.expect('§3 son prénom, son nom, sa photo',
  pg_temp.attempt($$update public.profiles
                    set first_name = 'Carlos', last_name = 'Uno', photo_path = 'a/advisors/x.png'
                    where id = '00000000-0000-0000-0000-0000000000c1'$$), '1');
select pg_temp.expect('§3 son e-mail',
  pg_temp.attempt($$update public.profiles set email = 'autre@a.test'
                    where id = '00000000-0000-0000-0000-0000000000c1'$$), 'refus');
select pg_temp.expect('§3 son agence',
  pg_temp.attempt($$update public.profiles set agency_id = 'bbbbbbbb-8888-0000-0000-000000000000'
                    where id = '00000000-0000-0000-0000-0000000000c1'$$), 'refus');
select pg_temp.expect('§3 se dé-retirer / se retirer',
  pg_temp.attempt($$update public.profiles set removed_at = null
                    where id = '00000000-0000-0000-0000-0000000000c1'$$), 'refus');
select pg_temp.expect('§4 créer un profil',
  pg_temp.attempt($$insert into public.profiles (id, agency_id, first_name, last_name, email, role)
                    values ('00000000-0000-0000-0000-0000000000f1',
                            'aaaaaaaa-8888-0000-0000-000000000000', 'X', 'Y', 'x@a.test', 'manager')$$),
  'refus');
select pg_temp.expect('§4 supprimer un profil',
  pg_temp.attempt($$delete from public.profiles
                    where id = '00000000-0000-0000-0000-0000000000c2'$$), 'refus');

-- §5 — l'agence, par un conseiller : aucune ligne touchée, ni création ni suppression.
select pg_temp.expect('§5 conseiller modifie l''agence',
  pg_temp.attempt($$update public.agencies set name = 'Piratée'
                    where id = 'aaaaaaaa-8888-0000-0000-000000000000'$$), '0');
select pg_temp.expect('§5 conseiller modifie les seuils',
  pg_temp.attempt($$update public.agencies set preparation_dormant_days = 1
                    where id = 'aaaaaaaa-8888-0000-0000-000000000000'$$), '0');
select pg_temp.expect('§5 créer une agence à la main',
  pg_temp.attempt($$insert into public.agencies (name) values ('Fantôme')$$), 'refus');
select pg_temp.expect('§5 supprimer l''agence',
  pg_temp.attempt($$delete from public.agencies
                    where id = 'aaaaaaaa-8888-0000-0000-000000000000'$$), 'refus');

-- §7 — la lecture reste la même : les trois profils de son agence, jamais ceux d'une autre.
select pg_temp.expect('§7 profils lus par un conseiller',
  (select count(*)::text from public.profiles), '3');
select pg_temp.expect('§7 profils d''une autre agence',
  (select count(*)::text from public.profiles
     where agency_id = 'bbbbbbbb-8888-0000-0000-000000000000'), '0');
select pg_temp.expect('§7 agences lues', (select count(*)::text from public.agencies), '1');
select pg_temp.expect('§7 un conseiller n''est pas manager',
  public.is_current_manager()::text, 'false');

-- =====================================================================
-- §4 et §5 — la manager M, depuis son navigateur.
-- =====================================================================
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');

select pg_temp.expect('§4 manager change un rôle depuis le navigateur',
  pg_temp.attempt($$update public.profiles set role = 'manager'
                    where id = '00000000-0000-0000-0000-0000000000c2'$$), 'refus');
select pg_temp.expect('§4 manager retire un membre depuis le navigateur',
  pg_temp.attempt($$update public.profiles set removed_at = now()
                    where id = '00000000-0000-0000-0000-0000000000c2'$$), 'refus');
select pg_temp.expect('§4 manager modifie le téléphone d''un conseiller',
  pg_temp.attempt($$update public.profiles set phone = '09 99 99 99 99'
                    where id = '00000000-0000-0000-0000-0000000000c2'$$), '0');
select pg_temp.expect('§5 manager modifie son agence',
  pg_temp.attempt($$update public.agencies
                    set name = 'Agence A renommée', preparation_dormant_days = 14
                    where id = 'aaaaaaaa-8888-0000-0000-000000000000'$$), '1');
select pg_temp.expect('§5 manager modifie une autre agence',
  pg_temp.attempt($$update public.agencies set name = 'Piratée'
                    where id = 'bbbbbbbb-8888-0000-0000-000000000000'$$), '0');
select pg_temp.expect('§5 la manager est manager', public.is_current_manager()::text, 'true');

-- =====================================================================
-- État réel après ces tentatives, vu par la base elle-même.
-- =====================================================================
reset role;
do $$
declare r record;
begin
  select role, removed_at, email, agency_id, phone, first_name into r
    from public.profiles where id = '00000000-0000-0000-0000-0000000000c1';
  if r.role <> 'advisor' or r.removed_at is not null or r.email <> 'c1@a.test'
     or r.agency_id <> 'aaaaaaaa-8888-0000-0000-000000000000'
     or r.phone <> '06 12 34 56 78' or r.first_name <> 'Carlos' then
    raise exception 'FAIL état C1 : %', r;
  end if;
  select role, removed_at, phone into r
    from public.profiles where id = '00000000-0000-0000-0000-0000000000c2';
  if r.role <> 'advisor' or r.removed_at is not null or r.phone <> '01 00 00 00 03' then
    raise exception 'FAIL état C2 : %', r;
  end if;
  if (select phone from public.profiles where id = '00000000-0000-0000-0000-0000000000a1') <> '01 00 00 00 01' then
    raise exception 'FAIL état M : téléphone modifié';
  end if;
  if (select name from public.agencies where id = 'aaaaaaaa-8888-0000-0000-000000000000')
       <> 'Agence A renommée'
     or (select name from public.agencies where id = 'bbbbbbbb-8888-0000-0000-000000000000')
       <> 'Agence B' then
    raise exception 'FAIL état des agences';
  end if;
  if (select count(*) from public.profiles
        where agency_id in ('aaaaaaaa-8888-0000-0000-000000000000', 'bbbbbbbb-8888-0000-0000-000000000000')) <> 4
     or exists (select 1 from public.agencies where name = 'Fantôme')
     or (select count(*) from public.agencies
        where id in ('aaaaaaaa-8888-0000-0000-000000000000', 'bbbbbbbb-8888-0000-0000-000000000000')) <> 2 then
    raise exception 'FAIL : un profil ou une agence a été créé ou supprimé';
  end if;
end $$;

-- =====================================================================
-- §6 — un membre retiré (par la gestion d'équipe, clé service) : la manager M est retirée.
-- =====================================================================
update public.profiles set removed_at = now() where id = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');

select pg_temp.expect('§6 retirée : son téléphone',
  pg_temp.attempt($$update public.profiles set phone = '07 77 77 77 77'
                    where id = '00000000-0000-0000-0000-0000000000a1'$$), '0');
select pg_temp.expect('§6 retirée : l''agence',
  pg_temp.attempt($$update public.agencies set name = 'Vengeance'
                    where id = 'aaaaaaaa-8888-0000-0000-000000000000'$$), '0');
select pg_temp.expect('§6 retirée : n''est plus manager',
  public.is_current_manager()::text, 'false');
select pg_temp.expect('§6 retirée : lit encore son propre profil, et lui seul',
  (select string_agg(first_name, ',') from public.profiles), 'Marie');

-- =====================================================================
-- §8 — l'invité I : pas d'agence fantôme, il rejoint l'agence qui l'invite.
-- =====================================================================
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e1');

select pg_temp.expect('§8 l''invité a une invitation en attente',
  public.has_pending_invitation()::text, 'true');
do $$
begin
  begin
    perform public.bootstrap_agency_owner('Agence fantôme', 'Ivan', 'Invité');
    raise exception 'FAIL §8 : un invité a créé une agence';
  exception when sqlstate 'ACM01' then null;
  end;
end $$;
reset role;
do $$
begin
  if exists (select 1 from public.agencies where name = 'Agence fantôme')
     or exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-0000000000e1') then
    raise exception 'FAIL §8 : le refus a laissé une agence ou un profil';
  end if;
end $$;

-- Son invitation reste utilisable : il rejoint A, avec le rôle de l'invitation.
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e1');
select count(*) from public.accept_invitation('Ivan', 'Invité');
reset role;
do $$
declare r record;
begin
  select agency_id, role into r from public.profiles
    where id = '00000000-0000-0000-0000-0000000000e1';
  if r.agency_id is distinct from 'aaaaaaaa-8888-0000-0000-000000000000' or r.role <> 'advisor' then
    raise exception 'FAIL §8 : l''invité n''a pas rejoint l''agence qui l''invite (%)', r;
  end if;
end $$;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e1');
select pg_temp.expect('§8 invitation acceptée : plus rien n''attend',
  public.has_pending_invitation()::text, 'false');

-- Un compte sans invitation crée toujours son agence (ouverture d'une nouvelle agence).
select pg_temp.act_as('00000000-0000-0000-0000-0000000000f1');
select pg_temp.expect('§8 sans invitation : rien n''attend',
  public.has_pending_invitation()::text, 'false');
select count(*) from public.bootstrap_agency_owner('Nouvelle agence', 'Olga', 'Ouverte');
reset role;
do $$
begin
  if not exists (
    select 1 from public.profiles p join public.agencies a on a.id = p.agency_id
    where p.id = '00000000-0000-0000-0000-0000000000f1' and p.role = 'manager'
      and a.name = 'Nouvelle agence'
  ) then
    raise exception 'FAIL §8 : un compte sans invitation ne peut plus créer son agence';
  end if;
end $$;

-- Sans jeton (clé publique seule), rien ne se lit ni ne s'écrit.
set local role anon;
select pg_temp.expect('anonyme : lire les profils',
  pg_temp.attempt('select 1 from public.profiles'), 'refus');
select pg_temp.expect('anonyme : lire les agences',
  pg_temp.attempt('select 1 from public.agencies'), 'refus');
reset role;

rollback;
