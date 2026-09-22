import type { Project } from '@/features/projects/types';
import { MIN_READY_COMPARABLES } from '@/features/projects/services/project-readiness';
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
      'id, seller_name, seller_email, seller_phone, status, created_at, updated_at, advisor_id, agency_id',
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
  const [properties, comparables, positionings] = await Promise.all([
    supabase
      .from('subject_properties')
      .select('project_id, property_type, rooms_count, surface_area, city')
      .eq('agency_id', agencyId)
      .in('project_id', ids),
    supabase
      .from('comparables')
      .select('project_id, price, surface_area, is_selected')
      .eq('agency_id', agencyId)
      .in('project_id', ids),
    supabase
      .from('project_price_positionings')
      .select('project_id, range_low, range_high')
      .eq('agency_id', agencyId)
      .in('project_id', ids),
  ]);

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

    return {
      project,
      property: propertyRow
        ? {
            propertyType: propertyRow.property_type,
            roomsCount: propertyRow.rooms_count,
            surfaceArea: propertyRow.surface_area,
            city: propertyRow.city,
          }
        : null,
      fourchette:
        positioningRow != null
          ? { low: positioningRow.range_low, high: positioningRow.range_high }
          : null,
      readiness: {
        hasProperty,
        exploitableCount,
        hasPositioning,
        ready: hasProperty && exploitableCount >= MIN_READY_COMPARABLES && hasPositioning,
      },
    };
  });
}
