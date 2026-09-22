-- Mission 52 — rattrapage explicite des dossiers existants, et convergence vers DEUX états.
--
-- `projects.status` n'était jamais transité : les dossiers réels sont restés 'draft', et
-- des données historiques (seed, fixtures) portent encore 'preparation'. À partir de cette
-- mission, la vérité de « prêt » tient en deux valeurs : 'draft' (en préparation) et
-- 'ready_for_meeting' (prêt). On normalise donc, une seule fois, tout l'existant NON terminal
-- (draft | preparation) vers ce modèle — sans jamais toucher 'meeting_completed' ni 'archived'.
--
-- 1) Les dossiers déjà COMPLETS (mêmes 3 critères que maybePromoteToReady) basculent en
--    'ready_for_meeting' : un dossier complet ne doit pas rester caché du Live.
--      bien vendeur saisi · ≥ 3 concurrents exploitables retenus · fourchette validée.
update public.projects p
set status = 'ready_for_meeting',
    updated_at = now()
where p.status in ('draft', 'preparation')
  and exists (
    select 1 from public.subject_properties sp where sp.project_id = p.id
  )
  and exists (
    select 1 from public.project_price_positionings pp where pp.project_id = p.id
  )
  and (
    select count(*) from public.comparables c
    where c.project_id = p.id
      and c.is_selected
      and c.price is not null and c.price > 0
      and c.surface_area is not null and c.surface_area > 0
  ) >= 3;

-- 2) Les dossiers 'preparation' encore INCOMPLETS retombent sur la valeur canonique 'draft'
--    (l'écran « En cours » filtre sur 'draft') : aucun dossier ne doit disparaître de la liste.
--    Ce n'est pas un « dé-prêt » — 'preparation' n'a jamais été prêt ni visible dans le Live.
update public.projects
set status = 'draft',
    updated_at = now()
where status = 'preparation';
