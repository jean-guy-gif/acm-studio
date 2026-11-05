import { displayCommune } from '@/features/competitor-search/utils/arrondissements';
import type { Project } from '@/features/projects/types';
import { isProjectReady } from '@/features/projects/services/project-readiness';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// MISSION 52 — la carte de Préparation se lit d'un coup d'œil : le bien, la fourchette,
// et ce qui manque pour être prêt. Le DÉTAIL ne vit qu'ici (le Live n'en a pas besoin).
// Aucune valeur inventée : un champ absent reste `null`, la carte le dira.
//
// `property.propertyType` est le TEXTE LIBRE saisi côté bien vendeur — jamais le
// vocabulaire canonique des concurrents. On l'affiche tel quel.
export type PreparationProperty = {
  propertyType: string | null;
  roomsCount: number | null;
  surfaceArea: number | null;
  city: string | null;
};

export type PreparationReadiness = {
  hasProperty: boolean;
  exploitableCount: number;
  hasPositioning: boolean;
  // Mission 108 — concurrents retenus en attente d'import : « 2 en attente d'import ».
  pendingImportCount: number;
  ready: boolean;
};

export type PreparationDossier = {
  project: Project;
  property: PreparationProperty | null;
  // Fourchette du conseiller (bornes) — jamais montrée au vendeur, à sa place ici.
  fourchette: { low: number; high: number } | null;
  readiness: PreparationReadiness;
};

// `ready = false` : la liste PAR DÉFAUT (dossiers en cours, status 'draft').
// `ready = true`  : le filtre « Prêts » (status 'ready_for_meeting').
export async function getPreparationDossiers(ready: boolean): Promise<PreparationDossier[]> {
  const profile = await getProfile();
  if (!profile) {
    return [];
  }

  const supabase = await createClient();
  const agencyId = profile.agency_id;

  const { data: projects } = await supabase
    .from('projects')
    .select(
      'id, seller_name, seller_email, seller_phone, status, created_at, updated_at, advisor_id, agency_id, live_rhythm, live_started_at, live_ended_at, is_example, demo_stage, live_presentation_mode',
    )
    .eq('agency_id', agencyId)
    .eq('status', ready ? 'ready_for_meeting' : 'draft')
    .order('created_at', { ascending: false });

  const list = projects ?? [];
  if (list.length === 0) {
    return [];
  }

  const ids = list.map((p) => p.id);
  // Trois lectures batchées (pas une par dossier) — le détail de tous les dossiers en un
  // coup.
  const [properties, comparables, positionings, pendingImports] = await Promise.all([
    supabase
      .from('subject_properties')
      .select(
        'project_id, property_type, rooms_count, surface_area, city, postal_code, advisor_price_min, advisor_price_max',
      )
      .eq('agency_id', agencyId)
      .in('project_id', ids),
    supabase
      .from('comparables')
      .select('project_id, price, surface_area, is_selected')
      .eq('agency_id', agencyId)
      .in('project_id', ids),
    supabase
      .from('project_price_positionings')
      .select('project_id')
      .eq('agency_id', agencyId)
      .in('project_id', ids),
    supabase
      .from('pending_competitor_imports')
      .select('project_id')
      .eq('agency_id', agencyId)
      .in('project_id', ids),
  ]);
  const pendingCountByProject = new Map<string, number>();
  for (const row of pendingImports.data ?? []) {
    pendingCountByProject.set(row.project_id, (pendingCountByProject.get(row.project_id) ?? 0) + 1);
  }

  const propertyByProject = new Map((properties.data ?? []).map((row) => [row.project_id, row]));
  const positioningByProject = new Map(
    (positionings.data ?? []).map((row) => [row.project_id, row]),
  );
  const exploitableCountByProject = new Map<string, number>();
  for (const c of comparables.data ?? []) {
    const exploitable =
      c.is_selected &&
      typeof c.price === 'number' &&
      c.price > 0 &&
      typeof c.surface_area === 'number' &&
      c.surface_area > 0;
    if (exploitable) {
      exploitableCountByProject.set(
        c.project_id,
        (exploitableCountByProject.get(c.project_id) ?? 0) + 1,
      );
    }
  }

  return list.map((project) => {
    const propertyRow = propertyByProject.get(project.id) ?? null;
    const positioningRow = positioningByProject.get(project.id) ?? null;
    const exploitableCount = exploitableCountByProject.get(project.id) ?? 0;
    const hasProperty = propertyRow != null;
    const hasPositioning = positioningRow != null;
    const pendingImportCount = pendingCountByProject.get(project.id) ?? 0;

    return {
      project,
      property: propertyRow
        ? {
            propertyType: propertyRow.property_type,
            roomsCount: propertyRow.rooms_count,
            surfaceArea: propertyRow.surface_area,
            // Mission 99 — « Paris 15e » : l'arrondissement se lit dans le code postal.
            city: displayCommune(propertyRow.city, propertyRow.postal_code),
          }
        : null,
      // Mission 105 — la fourchette DU CONSEILLER (M38, deux bornes ou rien, M93), jamais la plage
      // calculée par l'outil.
      fourchette:
        propertyRow?.advisor_price_min != null && propertyRow.advisor_price_max != null
          ? { low: propertyRow.advisor_price_min, high: propertyRow.advisor_price_max }
          : null,
      readiness: {
        hasProperty,
        exploitableCount,
        hasPositioning,
        pendingImportCount,
        ready: isProjectReady({
          hasProperty,
          exploitableCount,
          hasPositioning,
          pendingImportCount,
        }),
      },
    };
  });
}
