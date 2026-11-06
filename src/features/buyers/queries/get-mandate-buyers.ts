import 'server-only';

import {
  loadAgencyBuyers,
  loadLoopProperties,
} from '@/features/buyers/queries/get-property-buyers';
import { propertyBuyers } from '@/features/buyers/services/property-buyers';
import { createClient } from '@/lib/supabase/server';

export type MandateBuyers = {
  // Les acquéreurs prêts qui correspondent au bien (« Acquéreurs · 7 »).
  ready: number;
  // Ceux qui n'ont pas encore reçu ce bien dans une sélection depuis la signature (la tâche).
  toPropose: number;
};

// Mission 133 — pour le Suivi : chaque mandat signé et ses acquéreurs prêts, en lectures groupées
// (les acquéreurs une fois, les biens et leurs prix, les sélections qui contiennent ces biens). Un
// acquéreur « a reçu le bien » quand une sélection retenue pour lui depuis la signature le contient
// (« Envoyer le lien », ou « Biens idéaux ») : la tâche se vide d'elle-même, sans état en base.
// Une lecture en échec le dit (`failed`) : aucune tâche n'est alors déduite (M98).
export async function getMandateBuyers(
  agencyId: string,
  mandates: { projectId: string; signedAt: string | null }[],
  now: Date,
): Promise<{ byProject: Map<string, MandateBuyers>; failed: boolean }> {
  const byProject = new Map<string, MandateBuyers>();
  if (mandates.length === 0) return { byProject, failed: false };
  const projectIds = mandates.map((mandate) => mandate.projectId);
  const supabase = await createClient();
  const [agency, loop, items] = await Promise.all([
    loadAgencyBuyers(agencyId),
    loadLoopProperties(agencyId, projectIds),
    supabase
      .from('buyer_selection_items')
      .select('selection_id, reference')
      .eq('agency_id', agencyId)
      .eq('source', 'project')
      .in('reference', projectIds),
  ]);
  if (agency.failed || loop.failed || items.error) return { byProject, failed: true };
  const selectionIds = [...new Set((items.data ?? []).map((item) => item.selection_id))];
  const selections =
    selectionIds.length > 0
      ? await supabase
          .from('buyer_selections')
          .select('id, buyer_id, created_at')
          .eq('agency_id', agencyId)
          .in('id', selectionIds)
      : { data: [], error: null };
  if (selections.error) return { byProject, failed: true };
  const selectionOf = new Map((selections.data ?? []).map((row) => [row.id, row]));

  for (const { projectId, signedAt } of mandates) {
    const entry = loop.properties.get(projectId);
    const result = propertyBuyers(
      agency.buyers,
      agency.progress,
      entry?.property ?? null,
      entry?.price ?? null,
      now,
    );
    const received = new Set(
      (items.data ?? [])
        .filter((item) => item.reference === projectId)
        .map((item) => selectionOf.get(item.selection_id))
        .filter((row) => row != null && (signedAt == null || row.created_at >= signedAt))
        .map((row) => row!.buyer_id),
    );
    byProject.set(projectId, {
      ready: result.ready.length,
      toPropose: result.ready.filter(({ buyer }) => !received.has(buyer.id)).length,
    });
  }
  return { byProject, failed: false };
}
