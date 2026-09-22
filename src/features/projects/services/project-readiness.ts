import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase/database.types';

// MISSION 52 — UNE SEULE VÉRITÉ : `projects.status`. Le calcul ci-dessous ne REMPLACE
// jamais l'état, il le DÉCLENCHE : quand les trois critères sont réunis, on écrit
// 'ready_for_meeting' (bascule automatique, sans clic). Une donnée retirée ensuite ne
// dé-prête RIEN — on n'écrit jamais 'draft' ici.
//
// Les trois critères sont des FAITS EN BASE (liste d'autorisation, pas d'exclusion), les
// mêmes que la readiness de buildSellerPresentation : bien vendeur saisi, ≥ 3 concurrents
// exploitables retenus, fourchette validée. `MIN_READY_COMPARABLES` reflète la constante
// de build-seller-presentation.
export const MIN_READY_COMPARABLES = 3;

export type ProjectReadiness = {
  hasProperty: boolean;
  exploitableCount: number;
  hasPositioning: boolean;
  ready: boolean;
};

// Le critère de « prêt », PUR et unique : bien vendeur saisi, ≥ 3 concurrents exploitables
// retenus, fourchette validée. La bascule automatique (maybePromoteToReady) et le rattrapage
// (migration) s'appuient tous deux dessus.
export function isProjectReady(counts: {
  hasProperty: boolean;
  exploitableCount: number;
  hasPositioning: boolean;
}): boolean {
  return (
    counts.hasProperty && counts.exploitableCount >= MIN_READY_COMPARABLES && counts.hasPositioning
  );
}

type Client = SupabaseClient<Database>;

// Un concurrent est EXPLOITABLE quand il est retenu et porte prix ET surface (> 0) —
// même règle que `isExploitable` dans build-seller-presentation.
export async function evaluateProjectReadiness(
  supabase: Client,
  projectId: string,
  agencyId: string,
): Promise<ProjectReadiness> {
  const [property, comparables, positioning] = await Promise.all([
    supabase
      .from('subject_properties')
      .select('id')
      .eq('project_id', projectId)
      .eq('agency_id', agencyId)
      .maybeSingle(),
    supabase
      .from('comparables')
      .select('price, surface_area, is_selected')
      .eq('project_id', projectId)
      .eq('agency_id', agencyId),
    supabase
      .from('project_price_positionings')
      .select('id')
      .eq('project_id', projectId)
      .eq('agency_id', agencyId)
      .maybeSingle(),
  ]);

  const exploitableCount = (comparables.data ?? []).filter(
    (c) =>
      c.is_selected &&
      typeof c.price === 'number' &&
      c.price > 0 &&
      typeof c.surface_area === 'number' &&
      c.surface_area > 0,
  ).length;

  const hasProperty = property.data != null;
  const hasPositioning = positioning.data != null;

  return {
    hasProperty,
    exploitableCount,
    hasPositioning,
    ready: isProjectReady({ hasProperty, exploitableCount, hasPositioning }),
  };
}

// Appelé APRÈS une mutation qui peut compléter le dernier critère (enregistrement du bien,
// création/import d'un concurrent, validation de la fourchette). N'écrit que la transition
// 'draft' → 'ready_for_meeting' : la clause `.eq('status', 'draft')` garantit qu'on ne
// touche jamais un dossier déjà prêt (ni ne le repasse en brouillon). Idempotent.
export async function maybePromoteToReady(
  supabase: Client,
  projectId: string,
  agencyId: string,
): Promise<boolean> {
  const { ready } = await evaluateProjectReadiness(supabase, projectId, agencyId);
  if (!ready) {
    return false;
  }
  const { data } = await supabase
    .from('projects')
    .update({ status: 'ready_for_meeting', updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('agency_id', agencyId)
    .eq('status', 'draft')
    .select('id')
    .maybeSingle();
  // `data != null` seulement si une ligne 'draft' vient de basculer — c'est le signal de
  // « bascule automatique » que l'écran peut annoncer.
  return data != null;
}
