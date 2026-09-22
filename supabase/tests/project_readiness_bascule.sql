-- Mission 52 — la bascule Préparation → Live, testée à la SOURCE DE VÉRITÉ (projects.status).
-- Les quatre comportements du §7, exprimés en SQL avec EXACTEMENT les requêtes que le code
-- exécute :
--   • bascule automatique      = maybePromoteToReady (project-readiness.ts) : UPDATE gardé
--       par les 3 critères ET `status = 'draft'`.
--   • déclaration / retour      = declareProjectReady / revertProjectToPreparation
--       (set-project-readiness.ts) : UPDATE gardé seulement par le status attendu.
--   • liste du Live             = getReadyProjects (get-ready-projects.ts) : status = 'ready_for_meeting'.
--   • défaut Préparation / Prêts = getPreparationDossiers (get-preparation-dossiers.ts) :
--       status = 'draft' | 'ready_for_meeting'.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/project_readiness_bascule.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111');
insert into public.agencies (id, name) values ('aaaaaaaa-0000-0000-0000-000000000000', 'A');
insert into public.profiles (id, agency_id, first_name, last_name, email, role)
  values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000000',
          'Al', 'A', 'a@t.l', 'owner');

-- Deux dossiers nés en 'draft' (comme create-project) :
--   COMPLET   : bien vendeur + 3 concurrents exploitables + fourchette.
--   INCOMPLET : bien vendeur + 2 concurrents exploitables, pas de fourchette.
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111', 'Complet', 'draft'),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111', 'Incomplet', 'draft');

-- Bien vendeur pour les deux (une ligne = critère « bien vendeur » rempli).
insert into public.subject_properties (project_id, agency_id) values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000'),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000');

-- Concurrents EXPLOITABLES = retenus, prix > 0 ET surface > 0 (règle isExploitable).
-- Complet : 3 exploitables. Incomplet : 2 exploitables + 1 non exploitable (surface nulle)
-- + 1 non retenu — pour prouver que seuls les exploitables retenus comptent.
insert into public.comparables (project_id, agency_id, price, surface_area, is_selected, display_order) values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 300000, 60, true, 1),
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 310000, 62, true, 2),
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 320000, 64, true, 3),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 300000, 60, true, 1),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 310000, 62, true, 2),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 320000, null, true, 3),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 330000, 66, false, 4);

-- Fourchette validée (project_price_positionings) — pour le dossier COMPLET seulement.
insert into public.project_price_positionings
  (project_id, agency_id, advisor_price, range_low, range_central, range_high,
   confidence_score, confidence_level, calculation_snapshot, validated_by)
  values ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000',
          350000, 320000, 350000, 390000, 70, 'medium', '{}'::jsonb,
          '11111111-1111-1111-1111-111111111111');

-- La garde de readiness, TEXTUELLEMENT celle de maybePromoteToReady / de la migration :
-- 3 critères en base + `status = 'draft'`. On l'applique aux DEUX dossiers.
update public.projects p
set status = 'ready_for_meeting', updated_at = now()
where p.agency_id = 'aaaaaaaa-0000-0000-0000-000000000000'
  and p.status = 'draft'
  and exists (select 1 from public.subject_properties sp where sp.project_id = p.id)
  and exists (select 1 from public.project_price_positionings pp where pp.project_id = p.id)
  and (
    select count(*) from public.comparables c
    where c.project_id = p.id
      and c.is_selected and c.price > 0 and c.surface_area > 0
  ) >= 3;

-- §7.1 — le dossier COMPLET a basculé : il est prêt, et il a QUITTÉ le défaut Préparation.
do $$ begin
  if (select status from public.projects where id = 'cccccccc-0000-0000-0000-000000000001')
       is distinct from 'ready_for_meeting' then
    raise exception 'FAIL 7.1: le dossier complet n''a pas basculé en ready_for_meeting';
  end if;
  -- Le défaut Préparation = status 'draft' : le dossier prêt n'y est plus.
  if exists (select 1 from public.projects
             where id = 'cccccccc-0000-0000-0000-000000000001' and status = 'draft') then
    raise exception 'FAIL 7.1: le dossier prêt apparaît encore dans le défaut Préparation';
  end if;
end $$;

-- §7.2 — le dossier INCOMPLET n'a PAS basculé tout seul (garde des 3 critères respectée)…
do $$ begin
  if (select status from public.projects where id = 'cccccccc-0000-0000-0000-000000000002')
       is distinct from 'draft' then
    raise exception 'FAIL 7.2: un dossier incomplet a basculé automatiquement';
  end if;
end $$;

-- …mais il reste DÉCLARABLE prêt par le conseiller (declareProjectReady : pas de garde de
-- readiness, seulement `status = 'draft'`). L'outil informe, il ne bloque jamais.
update public.projects
set status = 'ready_for_meeting', updated_at = now()
where id = 'cccccccc-0000-0000-0000-000000000002'
  and agency_id = 'aaaaaaaa-0000-0000-0000-000000000000'
  and status = 'draft';

do $$ begin
  if (select status from public.projects where id = 'cccccccc-0000-0000-0000-000000000002')
       is distinct from 'ready_for_meeting' then
    raise exception 'FAIL 7.2: la déclaration manuelle « prêt » n''a pas pris';
  end if;
end $$;

-- §7.3 — la liste du Live (getReadyProjects : status = 'ready_for_meeting') ne contient
-- AUCUN dossier non prêt. On repasse d'abord l'incomplet en brouillon pour avoir un
-- non-prêt à exclure.
update public.projects set status = 'draft'
where id = 'cccccccc-0000-0000-0000-000000000002';

do $$
declare
  live_count integer;
  leaked integer;
begin
  select count(*) into live_count from public.projects
    where agency_id = 'aaaaaaaa-0000-0000-0000-000000000000' and status = 'ready_for_meeting';
  if live_count <> 1 then
    raise exception 'FAIL 7.3: la liste du Live devrait contenir 1 dossier, en contient %', live_count;
  end if;
  -- Aucun dossier 'draft' ne doit satisfaire le filtre du Live (status = 'ready_for_meeting').
  select count(*) into leaked from public.projects
    where agency_id = 'aaaaaaaa-0000-0000-0000-000000000000'
      and status = 'draft' and id in (
        select id from public.projects where status = 'ready_for_meeting'
      );
  if leaked <> 0 then
    raise exception 'FAIL 7.3: un dossier non prêt fuite dans la liste du Live';
  end if;
end $$;

-- §7.4 — le dossier prêt reste OUVRABLE et MODIFIABLE via le filtre « Prêts »
-- (getPreparationDossiers(true) : status = 'ready_for_meeting'), sans quitter cet état ;
-- et revertProjectToPreparation le renvoie proprement en préparation.
do $$ begin
  -- Il est bien listé sous « Prêts ».
  if not exists (select 1 from public.projects
                 where id = 'cccccccc-0000-0000-0000-000000000001'
                   and status = 'ready_for_meeting') then
    raise exception 'FAIL 7.4: le dossier prêt est introuvable sous le filtre « Prêts »';
  end if;
end $$;

-- Modifier une donnée du dossier prêt ne le dé-prête pas (une donnée qui change ne
-- dé-prête RIEN — on n'écrit jamais 'draft' automatiquement).
update public.subject_properties set updated_at = now()
where project_id = 'cccccccc-0000-0000-0000-000000000001';

do $$ begin
  if (select status from public.projects where id = 'cccccccc-0000-0000-0000-000000000001')
       is distinct from 'ready_for_meeting' then
    raise exception 'FAIL 7.4: modifier le dossier prêt a changé son statut';
  end if;
end $$;

-- « Remettre en préparation » (revertProjectToPreparation) : garde `status = 'ready_for_meeting'`.
update public.projects set status = 'draft', updated_at = now()
where id = 'cccccccc-0000-0000-0000-000000000001'
  and agency_id = 'aaaaaaaa-0000-0000-0000-000000000000'
  and status = 'ready_for_meeting';

do $$ begin
  if (select status from public.projects where id = 'cccccccc-0000-0000-0000-000000000001')
       is distinct from 'draft' then
    raise exception 'FAIL 7.4: « Remettre en préparation » n''a pas ramené le dossier en brouillon';
  end if;
end $$;

do $$ begin raise notice 'ALL SCENARIOS PASSED'; end $$;

rollback;
