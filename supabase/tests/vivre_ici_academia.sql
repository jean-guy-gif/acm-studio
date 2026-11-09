-- Mission 147 (partie A) — le lien client « Vivre ici » d'Academia, à la SOURCE DE VÉRITÉ :
--   §1 vide par défaut ; un lien au format réel d'Academia (identifiant.signature) accepté, puis
--      vidé ;
--   §2 tout le reste refusé : un autre site, un hôte qui imite, http, une autre page, /l/ vide, un
--      espace, « ? », « # », un « / » de plus, des capitales, 501 caractères ;
--   §3 le conseiller de l'agence le pose, dossier conclu compris ; une autre agence, un membre
--      retiré et un visiteur sans compte, non.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/vivre_ici_academia.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values
  ('14711111-1111-1111-1111-111111111111'),
  ('14722222-2222-2222-2222-222222222222'),
  ('14733333-3333-3333-3333-333333333333');
insert into public.agencies (id, name) values
  ('147aaaaa-0000-0000-0000-000000000000', 'A147'),
  ('147bbbbb-0000-0000-0000-000000000000', 'B147');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('14711111-1111-1111-1111-111111111111', '147aaaaa-0000-0000-0000-000000000000',
   'Al', 'A', 'a147@t.l', 'advisor'),
  ('14722222-2222-2222-2222-222222222222', '147bbbbb-0000-0000-0000-000000000000',
   'Bo', 'B', 'b147@t.l', 'advisor');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, removed_at) values
  ('14733333-3333-3333-3333-333333333333', '147aaaaa-0000-0000-0000-000000000000',
   'Ré', 'R', 'r147@t.l', 'advisor', now());
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('147ccccc-0000-0000-0000-000000000001', '147aaaaa-0000-0000-0000-000000000000',
   '14711111-1111-1111-1111-111111111111', 'Lopez', 'meeting_completed');

-- §1 — vide par défaut ; accepté, puis vidé.
do $$
begin
  if (select academia_living_here_url from public.projects
      where id = '147ccccc-0000-0000-0000-000000000001') is not null then
    raise exception 'FAIL 1: le lien n''est pas vide par défaut';
  end if;
  update public.projects set academia_living_here_url = 'https://app.myacademia.ai/l/v3k9-2mq7.8f2c1a9e4b7d'
    where id = '147ccccc-0000-0000-0000-000000000001';
  update public.projects set academia_living_here_url = null
    where id = '147ccccc-0000-0000-0000-000000000001';
end $$;

-- §2 — tout le reste refusé.
do $$
declare
  bad text;
begin
  foreach bad in array array[
    'https://www.seloger.com/annonces/123.htm',
    'https://app.myacademia.ai.evil.com/l/x',
    'https://evil.com/https://app.myacademia.ai/l/x',
    'http://app.myacademia.ai/l/x',
    'https://app.myacademia.ai/x/abc',
    'https://app.myacademia.ai/app/ouvrir?adresse=1',
    'https://app.myacademia.ai/l/',
    'https://app.myacademia.ai/l/ab cd',
    'https://app.myacademia.ai/l/v3k9-2mq7.8f2c?x=1',
    'https://app.myacademia.ai/l/v3k9-2mq7.8f2c#haut',
    'https://app.myacademia.ai/l/v3k9-2mq7/8f2c',
    'HTTPS://APP.MYACADEMIA.AI/l/x',
    'https://app.myacademia.ai/l/' || repeat('a', 473),
    ''
  ] loop
    begin
      update public.projects set academia_living_here_url = bad
        where id = '147ccccc-0000-0000-0000-000000000001';
      raise exception 'FAIL 2: un lien refusé passe : %', bad;
    exception when check_violation then null;
    end;
  end loop;
  -- 500 caractères tout juste : accepté.
  update public.projects
    set academia_living_here_url = 'https://app.myacademia.ai/l/' || repeat('a', 472)
    where id = '147ccccc-0000-0000-0000-000000000001';
  update public.projects set academia_living_here_url = null
    where id = '147ccccc-0000-0000-0000-000000000001';
end $$;

-- §3 — qui le pose : le conseiller de l'agence, sur un dossier conclu.
select set_config('request.jwt.claims',
  '{"sub":"14711111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
update public.projects set academia_living_here_url = 'https://app.myacademia.ai/l/conseiller'
  where id = '147ccccc-0000-0000-0000-000000000001';
reset role;
do $$
begin
  if (select academia_living_here_url from public.projects
      where id = '147ccccc-0000-0000-0000-000000000001')
     is distinct from 'https://app.myacademia.ai/l/conseiller' then
    raise exception 'FAIL 3: le conseiller de l''agence ne pose pas le lien';
  end if;
end $$;

-- Une autre agence : 0 ligne touchée, valeur inchangée.
select set_config('request.jwt.claims',
  '{"sub":"14722222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
do $$
declare
  touched integer;
begin
  update public.projects set academia_living_here_url = 'https://app.myacademia.ai/l/autre'
    where id = '147ccccc-0000-0000-0000-000000000001';
  get diagnostics touched = row_count;
  if touched <> 0 then
    raise exception 'FAIL 3: % ligne(s) touchée(s) par autre', touched;
  end if;
end $$;
reset role;
-- Un membre retiré : 0 ligne touchée.
select set_config('request.jwt.claims',
  '{"sub":"14733333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;
do $$
declare
  touched integer;
begin
  update public.projects set academia_living_here_url = 'https://app.myacademia.ai/l/retire'
    where id = '147ccccc-0000-0000-0000-000000000001';
  get diagnostics touched = row_count;
  if touched <> 0 then
    raise exception 'FAIL 3: % ligne(s) touchée(s) par retire', touched;
  end if;
end $$;
reset role;
do $$
begin
  if (select academia_living_here_url from public.projects
      where id = '147ccccc-0000-0000-0000-000000000001')
     is distinct from 'https://app.myacademia.ai/l/conseiller' then
    raise exception 'FAIL 3: une autre agence ou un membre retiré change le lien';
  end if;
end $$;

-- Un visiteur sans compte : ni lecture ni écriture.
set local role anon;
do $$
begin
  if exists (select 1 from public.projects where id = '147ccccc-0000-0000-0000-000000000001') then
    raise exception 'FAIL 3: un visiteur sans compte lit le dossier';
  end if;
end $$;
do $$
begin
  update public.projects set academia_living_here_url = 'https://app.myacademia.ai/l/anon'
    where id = '147ccccc-0000-0000-0000-000000000001';
exception when insufficient_privilege then null;
end $$;
reset role;
do $$
begin
  if (select academia_living_here_url from public.projects
      where id = '147ccccc-0000-0000-0000-000000000001')
     is distinct from 'https://app.myacademia.ai/l/conseiller' then
    raise exception 'FAIL 3: un visiteur sans compte change le lien';
  end if;
end $$;

rollback;
