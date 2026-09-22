-- Mission 53 — la conclusion et le Suivi, testés à la SOURCE DE VÉRITÉ.
-- Les fonctions save_commercialization_price / conclude_meeting sont EXACTEMENT ce
-- qu'exécutent les Server Actions. On y vérifie les comportements du §7 (1 à 4) :
--   1. un prix saisi est enregistré et les montants sont FIGÉS à cet instant ;
--   2. « à relancer » envoie en Suivi avec son motif, hors du Live ;
--   3. « signé » envoie en Suivi à l'état signé ;
--   4. un Live quitté sans conclusion laisse le dossier dans le Live.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/meeting_conclusion.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111');
insert into public.agencies (id, name) values ('aaaaaaaa-0000-0000-0000-000000000000', 'A');
insert into public.profiles (id, agency_id, first_name, last_name, email, role)
  values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000000',
          'Al', 'A', 'a@t.l', 'owner');

-- Trois dossiers PRÊTS (dans le Live).
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111', 'Signe', 'ready_for_meeting'),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111', 'Relance', 'ready_for_meeting'),
  ('cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111', 'Intact', 'ready_for_meeting');

-- =====================================================================
-- §7.1 — le prix de commercialisation est enregistré, et ①②③ sont FIGÉS à cet instant.
-- =====================================================================
select public.save_commercialization_price(
  'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000',
  480000, 500400, 372000, 498765);

do $$
declare r public.project_meeting_conclusions%rowtype;
begin
  select * into r from public.project_meeting_conclusions
    where project_id = 'cccccccc-0000-0000-0000-000000000001';
  if r.commercialization_price <> 480000
     or r.frozen_market_computed <> 500400
     or r.frozen_advisor_analysis <> 372000
     or r.frozen_advisor_price <> 498765 then
    raise exception 'FAIL 7.1: prix/montants non figés correctement (%, %, %, %)',
      r.commercialization_price, r.frozen_market_computed, r.frozen_advisor_analysis, r.frozen_advisor_price;
  end if;
end $$;

-- FIGÉ = définitif : une nouvelle saisie (montants différents six mois plus tard) met à
-- jour le prix mais NE recalcule PAS les montants déjà figés.
select public.save_commercialization_price(
  'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000',
  490000, 999999, 888888, 777777);

do $$
declare r public.project_meeting_conclusions%rowtype;
begin
  select * into r from public.project_meeting_conclusions
    where project_id = 'cccccccc-0000-0000-0000-000000000001';
  if r.commercialization_price <> 490000 then
    raise exception 'FAIL 7.1: le prix aurait dû être mis à jour';
  end if;
  if r.frozen_market_computed <> 500400
     or r.frozen_advisor_analysis <> 372000
     or r.frozen_advisor_price <> 498765 then
    raise exception 'FAIL 7.1: des montants figés ont été recalculés';
  end if;
end $$;

-- §7.4 (partiel) — enregistrer un prix ne conclut PAS : le dossier reste dans le Live.
do $$ begin
  if (select status from public.projects where id = 'cccccccc-0000-0000-0000-000000000001')
       is distinct from 'ready_for_meeting' then
    raise exception 'FAIL 7.4: enregistrer un prix a sorti le dossier du Live';
  end if;
end $$;

-- =====================================================================
-- §7.3 — « signé » envoie le dossier en Suivi à l'état signé.
-- =====================================================================
do $$
declare v_became boolean;
begin
  select public.conclude_meeting(
    'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000',
    'signed', 'motif à ignorer', null, 500400, 372000, 498765) into v_became;
  if not v_became then
    raise exception 'FAIL 7.3: la conclusion n''a pas fait basculer le dossier en Suivi';
  end if;
end $$;

do $$
declare r public.project_meeting_conclusions%rowtype; st text;
begin
  select status into st from public.projects where id = 'cccccccc-0000-0000-0000-000000000001';
  select * into r from public.project_meeting_conclusions
    where project_id = 'cccccccc-0000-0000-0000-000000000001';
  if st is distinct from 'meeting_completed' then
    raise exception 'FAIL 7.3: status attendu meeting_completed, obtenu %', st;
  end if;
  if r.outcome is distinct from 'signed' then
    raise exception 'FAIL 7.3: issue attendue signed, obtenue %', r.outcome;
  end if;
  -- « signé » n'a pas de motif : la fonction annule tout motif fourni.
  if r.follow_up_reason is not null then
    raise exception 'FAIL 7.3: un motif a été conservé pour un mandat signé';
  end if;
  -- Le prix figé au Live est conservé (COALESCE).
  if r.commercialization_price <> 490000 then
    raise exception 'FAIL 7.3: le prix figé au Live a été perdu';
  end if;
end $$;

-- =====================================================================
-- §7.2 — « à relancer » envoie en Suivi avec son motif, hors du Live. Ici SANS prix saisi
-- au préalable (le vendeur n'a pas donné de prix) : la conclusion crée l'enregistrement et
-- fige ①②③ à cet instant, prix null.
-- =====================================================================
select public.conclude_meeting(
  'cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000',
  'follow_up', 'Le vendeur veut réfléchir une semaine.', null, 480000, 360000, 495000);

do $$
declare r public.project_meeting_conclusions%rowtype; st text;
begin
  select status into st from public.projects where id = 'cccccccc-0000-0000-0000-000000000002';
  select * into r from public.project_meeting_conclusions
    where project_id = 'cccccccc-0000-0000-0000-000000000002';
  if st is distinct from 'meeting_completed' then
    raise exception 'FAIL 7.2: un « à relancer » n''est pas passé en Suivi (status %)', st;
  end if;
  if r.outcome is distinct from 'follow_up'
     or r.follow_up_reason is distinct from 'Le vendeur veut réfléchir une semaine.' then
    raise exception 'FAIL 7.2: issue/motif « à relancer » incorrects';
  end if;
  if r.commercialization_price is not null then
    raise exception 'FAIL 7.2: un prix a été inventé alors que le vendeur n''a pas parlé';
  end if;
  -- SANS prix saisi au préalable, save_commercialization_price n'a jamais tourné pour ce
  -- dossier : c'est conclude_meeting qui doit figer ①②③. Ce sont justement les dossiers
  -- « à relancer » qui ont le plus besoin de cette photo (relance deux mois plus tard).
  if r.frozen_market_computed is distinct from 480000
     or r.frozen_advisor_analysis is distinct from 360000
     or r.frozen_advisor_price is distinct from 495000 then
    raise exception 'FAIL 7.2: ①②③ non figés à la conclusion « à relancer » sans prix (%, %, %)',
      r.frozen_market_computed, r.frozen_advisor_analysis, r.frozen_advisor_price;
  end if;
end $$;

-- §7.2 — sortie du Live : la liste du Live (getReadyProjects : status ready_for_meeting)
-- ne contient plus les deux dossiers conclus.
do $$
declare c int;
begin
  select count(*) into c from public.projects
    where agency_id = 'aaaaaaaa-0000-0000-0000-000000000000'
      and status = 'ready_for_meeting'
      and id in ('cccccccc-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000002');
  if c <> 0 then
    raise exception 'FAIL 7.2: un dossier conclu apparaît encore dans le Live';
  end if;
end $$;

-- =====================================================================
-- §7.4 — un Live quitté SANS conclusion laisse le dossier dans le Live. Le 3ᵉ dossier n'a
-- jamais été conclu : il reste ready_for_meeting, et n'a aucune conclusion.
-- =====================================================================
do $$ begin
  if (select status from public.projects where id = 'cccccccc-0000-0000-0000-000000000003')
       is distinct from 'ready_for_meeting' then
    raise exception 'FAIL 7.4: un dossier non conclu a quitté le Live';
  end if;
  if exists (select 1 from public.project_meeting_conclusions
             where project_id = 'cccccccc-0000-0000-0000-000000000003') then
    raise exception 'FAIL 7.4: une conclusion a été inventée sans clic';
  end if;
end $$;

-- La garde M52 : un dossier en meeting_completed a TOUJOURS une conclusion (jamais « en
-- Suivi sans issue »), parce que status et issue sont écrits dans la même transaction.
do $$
declare orphelin int;
begin
  select count(*) into orphelin from public.projects p
    where p.status = 'meeting_completed'
      and not exists (
        select 1 from public.project_meeting_conclusions c
        where c.project_id = p.id and c.outcome is not null
      );
  if orphelin <> 0 then
    raise exception 'FAIL: % dossier(s) en Suivi sans issue', orphelin;
  end if;
end $$;

do $$ begin raise notice 'ALL SCENARIOS PASSED'; end $$;

rollback;
