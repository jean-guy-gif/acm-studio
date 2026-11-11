import type { Database } from '@/lib/supabase/database.types';

type ProjectRow = Database['public']['Tables']['projects']['Row'];
// Mission 99 — `search_settings` (les réglages de la recherche de concurrents) n'est lu que par la
// recherche : les listes de dossiers ne le chargent pas.
// Mission 110 — `live_shortlist_at` (le choix des concurrents montrés au Live) n'est lu que par
// le lancement du Live.
// Mission 112 — de même la trace de la confirmation « devant le vendeur ».
// Mission 147 — de même le lien client « Vivre ici » d'Academia, lu par Bien vendeur seulement.
// Mission 152 — de même la date de la vérification des annonces, lue par « Avant le rendez-vous ».
type OptionalColumns =
  | 'search_settings'
  | 'live_shortlist_at'
  | 'live_confirmed_at'
  | 'live_confirmed_by'
  | 'academia_living_here_url'
  | 'listings_checked_at';
export type Project = Omit<ProjectRow, OptionalColumns> &
  Partial<Pick<ProjectRow, OptionalColumns>>;
export type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
