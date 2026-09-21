-- Mission 50 — type de bien du concurrent, pour un libellé neutre « sans prix » au
-- Live et une comparaison de type comme à la recherche.
--
-- Colonne NULLABLE, PAS de backfill : les nouveaux imports la remplissent avec le type
-- déjà lu à la recherche (apartment/house/land/…) ; les lignes existantes restent nulles
-- et le libellé neutre garde sa forme actuelle. On ne DEVINE pas le type d'anciennes
-- fiches à partir d'un titre — c'est exactement l'erreur qu'on passe la semaine à éviter.

alter table public.comparables
  add column property_type text;

comment on column public.comparables.property_type is
  'Type de bien en vocabulaire CANONIQUE (apartment/house/land/…), jamais le texte libre français saisi côté bien vendeur — normaliser avec normalizePropertyType avant écriture. Lu sur la carte de recherche à l''import. Null = non renseigné (ancien import ou saisie manuelle) — aucune supposition.';
