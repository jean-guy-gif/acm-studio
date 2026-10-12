import type { Database } from '@/lib/supabase/database.types';

type ProjectRow = Database['public']['Tables']['projects']['Row'];
// Mission 99 — `search_settings` (les réglages de la recherche de concurrents) n'est lu que par la
// recherche : les listes de dossiers ne le chargent pas.
export type Project = Omit<ProjectRow, 'search_settings'> &
  Partial<Pick<ProjectRow, 'search_settings'>>;
export type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
