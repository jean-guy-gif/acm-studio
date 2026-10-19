-- Mission 110, partie B — un Live plus court. Au-delà de 6 concurrents retenus, « Lancer le Live »
-- propose les 6 plus pertinents (le % de correspondance de la M71), modifiables ; le conseiller
-- peut garder tout le monde. Deux colonnes, aucune ligne existante modifiée :
--   • `comparables.excluded_from_live` : le concurrent reste RETENU (prix des concurrents, règle
--     « prêt », Prospection), mais n'est pas montré pendant le Live (décision de Laurent, 19/10) ;
--   • `projects.live_shortlist_at` : quand le conseiller a fait ce choix — y compris « garder tout
--     le monde » —, pour que le lancement ne le redemande pas.
-- Le choix ne se modifie plus une fois le Live commencé (même règle que le rythme, M95) : vérifié
-- par l'action serveur ; la marque ne change rien à un Live commencé avant cette migration.
--
-- Compatible avec le code de `main` : il ne lit ni n'écrit ces colonnes ; toutes valent « montré »
-- et « pas encore choisi ».

alter table public.comparables
  add column excluded_from_live boolean not null default false;

comment on column public.comparables.excluded_from_live is
  'Concurrent retenu mais pas montré pendant le Live (mission 110). Il reste dans le prix des concurrents et la Prospection.';

alter table public.projects
  add column live_shortlist_at timestamptz;

comment on column public.projects.live_shortlist_at is
  'Quand le conseiller a choisi les concurrents montrés au Live, au-delà de 6 (mission 110).';
