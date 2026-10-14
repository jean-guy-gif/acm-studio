-- Mission 100 — le cloisonnement entre agences, prouvé sur TOUTES les tables publiques, vues comme
-- les voit le navigateur (rôle `authenticated`, identité du jeton). Le test ne nomme pas les
-- tables : il les lit dans le catalogue. Une table ajoutée demain y passe donc d'office, et une
-- table sans cloisonnement fait échouer la CI.
--
--   §0 chaque table publique a la RLS activée et au moins une politique ; elle porte `agency_id`,
--      ou figure dans la courte liste des exceptions décidées (`pg_temp.exception_reason`) ;
--   §1 une ligne d'essai est posée dans chaque table, pour l'agence A et pour l'agence B, par une
--      chaîne cohérente (le bien de B tient au dossier de B, etc.) ;
--   §2 un conseiller de A relit les lignes de A (contrôle : le test ne passe pas à vide), ne lit
--      AUCUNE ligne de B, n'en modifie ni n'en supprime aucune, et n'en ajoute aucune ;
--   §3 un membre retiré de A ne lit plus rien, sauf son propre profil ;
--   §4 un visiteur non connecté (`anon`) ne lit rien, nulle part ;
--   §5 les exceptions tiennent ce qu'elles disent : l'agence d'un autre est invisible, la table
--      partagée des identifiants de lieu ne s'écrit pas depuis le navigateur, le journal des
--      erreurs ne se lit ni ne s'écrit.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/agency_isolation_all_tables.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

-- Agence A (conseiller CA, et R, retiré), agence B (conseiller CB).
insert into auth.users (id, email) values
  ('10000000-0000-0000-0000-0000000000a1', 'ca@a100.test'),
  ('10000000-0000-0000-0000-0000000000d1', 'retire@a100.test'),
  ('10000000-0000-0000-0000-0000000000b1', 'cb@b100.test');
insert into public.agencies (id, name) values
  ('100aaaaa-0000-0000-0000-000000000000', 'Agence A 100'),
  ('100bbbbb-0000-0000-0000-000000000000', 'Agence B 100');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, removed_at) values
  ('10000000-0000-0000-0000-0000000000a1', '100aaaaa-0000-0000-0000-000000000000', 'Carl', 'A', 'ca@a100.test', 'advisor', null),
  ('10000000-0000-0000-0000-0000000000d1', '100aaaaa-0000-0000-0000-000000000000', 'Rémi', 'Retiré', 'retire@a100.test', 'advisor', now()),
  ('10000000-0000-0000-0000-0000000000b1', '100bbbbb-0000-0000-0000-000000000000', 'Boris', 'B', 'cb@b100.test', 'advisor', null);

-- ---------------------------------------------------------------------------------------------
-- Les exceptions DÉCIDÉES : les seules tables publiques sans colonne `agency_id`. Toute autre
-- table sans `agency_id` fait échouer le test — c'est ici qu'on écrit la décision, avec sa raison.
-- ---------------------------------------------------------------------------------------------
create function pg_temp.exception_reason(p_table text) returns text language sql immutable as $$
  select case p_table
    when 'agencies' then 'la ligne de l''agence elle-même : cloisonnée par son id (§5)'
    when 'portal_place_ids' then 'identifiants de lieu des portails, communs à toutes les agences (M69) : lecture seule depuis le navigateur (§5)'
  end
$$;

-- Les tables à `agency_id` que PERSONNE ne lit depuis le navigateur, pas même leur agence.
create function pg_temp.closed_to_browser(p_table text) returns boolean language sql immutable as $$
  select p_table in ('app_errors', 'live_reopenings')
$$;

-- Une valeur d'essai imposée par une contrainte CHECK, que le générateur ne peut pas deviner.
-- Une nouvelle contrainte de ce genre fait échouer §1 en nommant la table : on l'ajoute ici.
create function pg_temp.fixture(p_table text, p_column text) returns text language sql immutable as $$
  select case p_table || '.' || p_column
    when 'agency_invitations.role' then $v$'advisor'$v$
    when 'app_errors.source' then $v$'server'$v$
    when 'app_errors.page' then $v$'/essai'$v$
    when 'competitor_decisions.decision' then $v$'rejected'$v$
    when 'competitor_prospecting_files.version' then $v$'owner'$v$
    when 'project_price_positionings.confidence_level' then $v$'medium'$v$
    when 'projects.status' then $v$'draft'$v$
    when 'prospecting_oppositions.address_key' then $v$'1 rue du test ' || substr(md5(random()::text), 1, 8)$v$
    else null
  end
$$;

create temp table seeds (
  tbl text not null,
  agency uuid not null,
  payload jsonb not null,
  primary key (tbl, agency)
);
grant select on seeds to authenticated, anon;

-- §0 ------------------------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select c.relname as tbl, c.relrowsecurity as rls,
           (select count(*) from pg_policies p
             where p.schemaname = 'public' and p.tablename = c.relname) as policies,
           exists (select 1 from information_schema.columns k
                    where k.table_schema = 'public' and k.table_name = c.relname
                      and k.column_name = 'agency_id') as has_agency
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
    order by 1
  loop
    if not r.rls then
      raise exception 'FAIL §0 % : la RLS n''est pas activée', r.tbl;
    end if;
    if r.policies = 0 then
      raise exception 'FAIL §0 % : aucune politique RLS', r.tbl;
    end if;
    if not r.has_agency and pg_temp.exception_reason(r.tbl) is null then
      raise exception 'FAIL §0 % : ni colonne agency_id, ni exception décidée (pg_temp.exception_reason)', r.tbl;
    end if;
    if r.has_agency and pg_temp.exception_reason(r.tbl) is not null then
      raise exception 'FAIL §0 % : porte agency_id, ce n''est plus une exception', r.tbl;
    end if;
  end loop;
end $$;

-- §1 ------------------------------------------------------------------------------------------
-- Une ligne par table et par agence. Les clés étrangères suivent la chaîne de l'agence (dossier →
-- bien → …) ; les autres colonnes obligatoires reçoivent une valeur du bon type. Déclencheurs et
-- vérification des clés étrangères sont suspendus pendant la pose (`replica`) : ce sont les
-- POLITIQUES qu'on éprouve ensuite, sur des lignes qui existent.
create function pg_temp.seed_table(p_table text, p_agency uuid, p_user uuid) returns void
language plpgsql as $$
declare
  c record;
  v_cols text[] := '{}';
  v_vals text[] := '{}';
  v_val text;
  v_ref text;
  v_payload jsonb;
begin
  for c in
    select a.attname::text as col, format_type(a.atttypid, a.atttypmod) as typ,
           t.typtype, t.typcategory, a.atttypid, a.attnotnull as required,
           a.atthasdef as has_default, a.attgenerated <> '' or a.attidentity <> '' as computed
    from pg_attribute a join pg_type t on t.oid = a.atttypid
    where a.attrelid = format('public.%I', p_table)::regclass and a.attnum > 0 and not a.attisdropped
    order by a.attnum
  loop
    continue when c.computed;
    v_val := null;
    select k.confrelid::regclass::text into v_ref
    from pg_constraint k
    where k.contype = 'f' and k.conrelid = format('public.%I', p_table)::regclass
      and array_length(k.conkey, 1) = 1
      and k.conkey[1] = (select attnum from pg_attribute
                          where attrelid = k.conrelid and attname = c.col)
    limit 1;

    if c.col = 'agency_id' or v_ref in ('agencies', 'public.agencies') then
      v_val := quote_literal(p_agency);
    elsif pg_temp.fixture(p_table, c.col) is not null then
      v_val := pg_temp.fixture(p_table, c.col);
    elsif v_ref in ('profiles', 'public.profiles', 'auth.users') then
      v_val := quote_literal(p_user);
    elsif v_ref is not null then
      select quote_literal(s.payload ->> 'id') into v_val
      from seeds s where s.tbl = replace(v_ref, 'public.', '') and s.agency = p_agency;
      if v_val is null and c.required then
        v_val := 'gen_random_uuid()';
      end if;
    elsif c.col = 'id' and c.typ = 'uuid' then
      v_val := 'gen_random_uuid()';
    elsif not c.required or c.has_default then
      v_val := null; -- la valeur par défaut, ou rien
    elsif c.typ = 'uuid' then
      v_val := 'gen_random_uuid()';
    elsif c.typcategory = 'S' then
      v_val := quote_literal('essai ' || substr(md5(random()::text), 1, 10));
    elsif c.typcategory = 'N' then
      v_val := '1';
    elsif c.typcategory = 'B' then
      v_val := 'false';
    elsif c.typcategory = 'D' then
      v_val := 'now()';
    elsif c.typcategory = 'A' then
      v_val := quote_literal('{}');
    elsif c.typ in ('jsonb', 'json') then
      v_val := quote_literal('{}');
    elsif c.typtype = 'e' then
      select quote_literal(e.enumlabel) into v_val
      from pg_enum e where e.enumtypid = c.atttypid order by e.enumsortorder limit 1;
    else
      raise exception 'FAIL §1 %.% : type % sans valeur d''essai (pg_temp.fixture)', p_table, c.col, c.typ;
    end if;

    if v_val is not null then
      v_cols := v_cols || quote_ident(c.col);
      v_vals := v_vals || v_val;
    end if;
  end loop;

  begin
    execute format('insert into public.%I as t (%s) values (%s) returning to_jsonb(t.*)',
                   p_table, array_to_string(v_cols, ', '), array_to_string(v_vals, ', '))
      into v_payload;
  exception when others then
    raise exception 'FAIL §1 % : ligne d''essai refusée (%) — ajoutez la valeur attendue dans pg_temp.fixture', p_table, sqlerrm;
  end;
  insert into seeds (tbl, agency, payload) values (p_table, p_agency, v_payload);
end $$;

-- `profiles` est déjà posée : on la range dans les lignes d'essai, pour qu'elle passe en §2.
insert into seeds (tbl, agency, payload)
select 'profiles', p.agency_id, to_jsonb(p.*)
from public.profiles p
where p.id in ('10000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000b1');

do $$
declare
  v_pending text[];
  v_next text[];
  v_table text;
  v_ready boolean;
  v_forced boolean := false;
begin
  set local session_replication_role = replica;
  select array_agg(c.relname::text order by c.relname) into v_pending
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relname <> 'profiles'
    and exists (select 1 from information_schema.columns k
                 where k.table_schema = 'public' and k.table_name = c.relname
                   and k.column_name = 'agency_id');

  while coalesce(array_length(v_pending, 1), 0) > 0 loop
    v_next := '{}';
    foreach v_table in array v_pending loop
      -- Prête quand toutes les tables à `agency_id` qu'elle référence sont déjà posées.
      select not exists (
        select 1
        from pg_constraint k join pg_class ref on ref.oid = k.confrelid
        where k.contype = 'f' and k.conrelid = format('public.%I', v_table)::regclass
          and ref.relnamespace = 'public'::regnamespace
          and ref.relname::text = any (v_pending) and ref.relname::text <> v_table
      ) into v_ready;
      if v_ready or v_forced then
        perform pg_temp.seed_table(v_table, '100aaaaa-0000-0000-0000-000000000000',
                                   '10000000-0000-0000-0000-0000000000a1');
        perform pg_temp.seed_table(v_table, '100bbbbb-0000-0000-0000-000000000000',
                                   '10000000-0000-0000-0000-0000000000b1');
      else
        v_next := v_next || v_table;
      end if;
    end loop;
    -- Aucune table n'a avancé : des tables se référencent en rond, on les pose telles quelles.
    v_forced := coalesce(array_length(v_next, 1), 0) = coalesce(array_length(v_pending, 1), 0);
    v_pending := v_next;
  end loop;
  set local session_replication_role = origin;
end $$;

-- Se présenter comme le navigateur d'un utilisateur : rôle `authenticated` + identité du jeton.
create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
grant execute on function pg_temp.act_as(uuid) to authenticated;

-- Le nombre de lignes lues, ou 'refus' quand les privilèges ferment la table (42501).
create function pg_temp.read_count(p_sql text) returns text language plpgsql as $$
declare v_count bigint;
begin
  execute p_sql into v_count;
  return v_count::text;
exception when insufficient_privilege then return 'refus';
end $$;
grant execute on function pg_temp.read_count(text) to authenticated, anon;

-- Le nombre de lignes touchées, 'refus' (42501 : privilège ou politique), sinon le code de l'erreur.
create function pg_temp.attempt(p_sql text) returns text language plpgsql as $$
declare v_rows int;
begin
  execute p_sql;
  get diagnostics v_rows = row_count;
  return v_rows::text;
exception
  when insufficient_privilege then return 'refus';
  when others then return 'erreur ' || sqlstate || ' : ' || sqlerrm;
end $$;
grant execute on function pg_temp.attempt(text) to authenticated, anon;

-- §2 ------------------------------------------------------------------------------------------
select pg_temp.act_as('10000000-0000-0000-0000-0000000000a1');

do $$
declare
  s record;
  v_got text;
  v_a constant text := '100aaaaa-0000-0000-0000-000000000000';
  v_b constant text := '100bbbbb-0000-0000-0000-000000000000';
begin
  for s in select tbl, payload from seeds where agency = v_b::uuid order by tbl loop
    -- Contrôle : les lignes de SON agence se lisent (sauf table fermée au navigateur).
    v_got := pg_temp.read_count(format('select count(*) from public.%I where agency_id = %L', s.tbl, v_a));
    if pg_temp.closed_to_browser(s.tbl) then
      if v_got not in ('0', 'refus') then
        raise exception 'FAIL §2 % : table fermée au navigateur, et pourtant lue (%)', s.tbl, v_got;
      end if;
    elsif v_got in ('0', 'refus') then
      raise exception 'FAIL §2 % : un conseiller ne relit pas la ligne de sa propre agence (%) — le test passerait à vide', s.tbl, v_got;
    end if;

    v_got := pg_temp.read_count(format('select count(*) from public.%I where agency_id = %L', s.tbl, v_b));
    if v_got not in ('0', 'refus') then
      raise exception 'FAIL §2 % : un conseiller de A LIT % ligne(s) de l''agence B', s.tbl, v_got;
    end if;

    v_got := pg_temp.attempt(format('update public.%I set agency_id = agency_id where agency_id = %L', s.tbl, v_b));
    if v_got not in ('0', 'refus') then
      raise exception 'FAIL §2 % : un conseiller de A MODIFIE une ligne de l''agence B (%)', s.tbl, v_got;
    end if;

    v_got := pg_temp.attempt(format('delete from public.%I where agency_id = %L', s.tbl, v_b));
    if v_got not in ('0', 'refus') then
      raise exception 'FAIL §2 % : un conseiller de A SUPPRIME une ligne de l''agence B (%)', s.tbl, v_got;
    end if;

    -- Une ligne valide de B (celle du jeu d'essai, sous un nouvel id) : seul le cloisonnement
    -- peut la refuser. Toute autre issue — ajout réussi, ou erreur d'une autre nature — échoue.
    v_got := pg_temp.attempt(format(
      'insert into public.%I select * from jsonb_populate_record(null::public.%I, %L::jsonb || jsonb_build_object(''id'', gen_random_uuid()))',
      s.tbl, s.tbl, s.payload));
    if v_got <> 'refus' then
      raise exception 'FAIL §2 % : un conseiller de A AJOUTE une ligne à l''agence B, ou le refus ne vient pas du cloisonnement (%)', s.tbl, v_got;
    end if;
  end loop;
end $$;

-- §3 — le membre retiré de A : plus rien, sauf son propre profil.
select pg_temp.act_as('10000000-0000-0000-0000-0000000000d1');

do $$
declare
  s record;
  v_got text;
begin
  for s in select distinct tbl from seeds order by tbl loop
    v_got := pg_temp.read_count(format('select count(*) from public.%I', s.tbl));
    if s.tbl = 'profiles' then
      if v_got <> '1' then
        raise exception 'FAIL §3 profiles : un membre retiré lit % profil(s), attendu le sien seul', v_got;
      end if;
    elsif v_got not in ('0', 'refus') then
      raise exception 'FAIL §3 % : un membre retiré lit encore % ligne(s)', s.tbl, v_got;
    end if;
  end loop;
  if (select count(*) from public.agencies) <> 0 then
    raise exception 'FAIL §3 agencies : un membre retiré lit encore une agence';
  end if;
end $$;

-- §4 — sans connexion : rien, nulle part.
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.jwt.claim.sub', '', true);
set local role anon;

do $$
declare
  r record;
  v_got text;
begin
  for r in
    select tablename::text as tbl from pg_tables where schemaname = 'public' order by 1
  loop
    v_got := pg_temp.read_count(format('select count(*) from public.%I', r.tbl));
    if v_got not in ('0', 'refus') then
      raise exception 'FAIL §4 % : un visiteur non connecté lit % ligne(s)', r.tbl, v_got;
    end if;
  end loop;
end $$;

-- §5 — les exceptions tiennent ce qu'elles disent.
reset role;
select pg_temp.act_as('10000000-0000-0000-0000-0000000000a1');

do $$
declare
  v_got text;
begin
  if (select count(*) from public.agencies) <> 1 then
    raise exception 'FAIL §5 agencies : un conseiller lit une autre agence que la sienne';
  end if;
  v_got := pg_temp.attempt($q$update public.agencies set name = 'piratée'
                             where id = '100bbbbb-0000-0000-0000-000000000000'$q$);
  if v_got not in ('0', 'refus') then
    raise exception 'FAIL §5 agencies : un conseiller modifie une autre agence (%)', v_got;
  end if;
  v_got := pg_temp.attempt($q$insert into public.agencies (name) values ('Agence pirate')$q$);
  if v_got <> 'refus' then
    raise exception 'FAIL §5 agencies : un conseiller crée une agence depuis le navigateur (%)', v_got;
  end if;

  v_got := pg_temp.attempt($q$insert into public.portal_place_ids (portal, city_key, place_id)
                             values ('seloger', 'essai-cent|06', 'x')$q$);
  if v_got <> 'refus' then
    raise exception 'FAIL §5 portal_place_ids : la table partagée s''écrit depuis le navigateur (%)', v_got;
  end if;
  v_got := pg_temp.attempt($q$update public.portal_place_ids set place_id = 'x'$q$);
  if v_got not in ('0', 'refus') then
    raise exception 'FAIL §5 portal_place_ids : la table partagée se modifie depuis le navigateur (%)', v_got;
  end if;
  v_got := pg_temp.attempt($q$delete from public.portal_place_ids$q$);
  if v_got not in ('0', 'refus') then
    raise exception 'FAIL §5 portal_place_ids : la table partagée se vide depuis le navigateur (%)', v_got;
  end if;

  v_got := pg_temp.attempt($q$insert into public.app_errors (source, page, message)
                             values ('browser', '/essai', 'faux')$q$);
  if v_got <> 'refus' then
    raise exception 'FAIL §5 app_errors : le journal des erreurs s''écrit depuis le navigateur (%)', v_got;
  end if;
end $$;

reset role;
select 'agency_isolation_all_tables : OK' as resultat;

rollback;
