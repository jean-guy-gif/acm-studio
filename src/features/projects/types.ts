import type { Database } from '@/lib/supabase/database.types';

type ProjectRow = Database['public']['Tables']['projects']['Row'];
// Mission 99 — `search_settings` (les réglages de la recherche de concurrents) n'est lu que par la
// recherche : les listes de dossiers ne le chargent pas.
// Mission 110 — `live_shortlist_at` (le choix des concurrents montrés au Live) n'est lu que par
// le lancement du Live.
// Mission 112 — de même la trace de la confirmation « devant le vendeur ».
type OptionalColumns =
  'search_settings' | 'live_shortlist_at' | 'live_confirmed_at' | 'live_confirmed_by';
export type Project = Omit<ProjectRow, OptionalColumns> &
  Partial<Pick<ProjectRow, OptionalColumns>>;
export type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
