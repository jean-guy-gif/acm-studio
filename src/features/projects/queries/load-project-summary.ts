import 'server-only';

import { getPropertyBuyers } from '@/features/buyers/queries/get-property-buyers';
import { getComparables } from '@/features/comparables/queries/get-comparables';
import { displayCommune } from '@/features/competitor-search/utils/arrondissements';
import { competitorsWithPriceOrSurfaceToVerify } from '@/features/imported-fields/services/fields-to-verify';
import { getConclusion } from '@/features/meeting-conclusion/queries/get-conclusion';
import { getSavedPricePositioning } from '@/features/price-positioning/services/get-saved-price-positioning';
import { getProject } from '@/features/projects/queries/get-project';
import { projectBadge, projectTiles } from '@/features/projects/services/project-summary';
import { overviewSteps } from '@/features/projects/services/overview-steps';
import { evaluateProjectReadiness } from '@/features/projects/services/project-readiness';
import { propertyLabel } from '@/features/projects/services/property-label';
import { readPhotoPaths } from '@/features/subject-property-photos/services/get-property-photos';
import { getSubjectProperty } from '@/features/subject-property/queries/get-subject-property';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// La refonte, lot E (maquette REFONTE-8) — ce que le détail de Vendeurs montre d'un dossier : son
// état, ses trois chiffres et ses cinq étapes, lus sur les mêmes faits que la Vue d'ensemble (M143,
// M104, M133), cadrés sur l'agence de l'appelant. null : un dossier introuvable, archivé ou d'une
// autre agence.
export async function loadProjectSummary(projectId: string) {
  const [project, profile] = await Promise.all([getProject(projectId), getProfile()]);
  if (!project || !profile || project.status === 'archived') return null;
  const supabase = await createClient();
  const [readiness, property, comparables, saved, conclusion, buyers] = await Promise.all([
    evaluateProjectReadiness(supabase, projectId, profile.agency_id),
    getSubjectProperty(projectId),
    getComparables(projectId),
    getSavedPricePositioning(projectId),
    project.status === 'meeting_completed' ? getConclusion(projectId) : null,
    // Mission 133 — jamais pour un dossier d'exemple.
    project.is_example ? undefined : getPropertyBuyers(profile.agency_id, projectId, new Date()),
  ]);
  const steps = overviewSteps(projectId, {
    status: project.status,
    hasProperty: readiness.hasProperty,
    photoCount: readPhotoPaths(property?.photo_urls ?? null).length,
    exploitableCount: readiness.exploitableCount,
    decisionPrice: saved?.advisorPrice ?? saved?.advisorComparativeMarketPrice ?? null,
    hasDecision: readiness.hasPositioning,
    liveStartedAt: project.live_started_at,
    liveEndedAt: project.live_ended_at,
    documentOnly: project.live_presentation_mode === 'document',
  });
  return {
    projectId,
    name: project.seller_name,
    propertyText: propertyLabel(
      property
        ? {
            propertyType: property.property_type,
            roomsCount: property.rooms_count,
            surfaceArea: property.surface_area,
            city: displayCommune(property.city, property.postal_code),
          }
        : null,
    ),
    badge: projectBadge({
      status: project.status,
      outcome: conclusion?.outcome ?? null,
      mandateType: conclusion?.mandateType ?? null,
    }),
    tiles: projectTiles({
      retained: readiness.exploitableCount,
      toVerify: competitorsWithPriceOrSurfaceToVerify(comparables).length,
      readyBuyers: buyers === undefined ? undefined : buyers == null ? null : buyers.ready.length,
    }),
    steps,
  };
}

export type ProjectSummary = NonNullable<Awaited<ReturnType<typeof loadProjectSummary>>>;
