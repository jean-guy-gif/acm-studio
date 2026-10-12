-- MISSION 99 — L'expert : les réglages de la recherche de concurrents, par dossier.
--
-- `projects.search_settings` : ce que le conseiller a réglé lui-même pour la recherche Stream
-- Estate (secteur, prix, pièces, surface, élargissement automatique). NULL = tout est
-- automatique : la recherche est celle d'avant la mission. La forme est relue par l'application
-- (zod) à chaque lecture ; une valeur illisible vaut « automatique ».
--
-- Compatible avec le code de `main` : une colonne NEUVE, sans valeur pour les dossiers existants,
-- que `main` n'écrit pas ; ses lectures (`select *` compris) la reçoivent sans s'en servir.
-- Aucune ligne existante n'est modifiée. La RLS de `projects` (cloisonnement par agence) la couvre.

alter table public.projects
  add column search_settings jsonb
    check (search_settings is null or jsonb_typeof(search_settings) = 'object');

comment on column public.projects.search_settings is
  'Réglages de la recherche de concurrents posés par le conseiller (mission 99) ; NULL = recherche automatique.';
