import 'server-only';

import type { PreparationProperty } from '@/features/projects/queries/get-preparation-dossiers';
import type { Project } from '@/features/projects/types';
import type { MeetingConclusion } from '@/features/meeting-conclusion/types';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Mission 53 §4 — le Suivi : les dossiers CONCLUS (status 'meeting_completed'). Deux
// issues, signé / à relancer, portées par la conclusion. La carte lit le bien, le prix
// convenu, les quatre chiffres figés et le motif — le DÉTAIL vit ici. Aucune valeur
// inventée : un dossier conclu sans conclusion serait incohérent (garde transactionnelle
// à l'écriture), mais on tolère `conclusion: null` à la lecture sans rien inventer.
export type SuiviDossier = {
  project: Project;
  property: PreparationProperty | null;
  conclusion: MeetingConclusion | null;
};

// Retourne TOUT le Suivi (status 'meeting_completed'). Le filtre par issue et le
// rapprochement acheteur portent sur cet ensemble complet — le filtrage est une opération
// PURE et testable (filterSuiviByIssue), pas une requête de plus.
export async function getSuiviDossiers(): Promise<SuiviDossier[]> {
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
    .eq('status', 'meeting_completed')
    .order('updated_at', { ascending: false });

  const list = projects ?? [];
  if (list.length === 0) {
    return [];
  }

  const ids = list.map((p) => p.id);
  const [propertiesRes, conclusionsRes] = await Promise.all([
    supabase
      .from('subject_properties')
      .select('project_id, property_type, rooms_count, surface_area, city')
      .in('project_id', ids)
      .eq('agency_id', agencyId),
    supabase
      .from('project_meeting_conclusions')
      .select(
        'project_id, commercialization_price, frozen_market_computed, frozen_advisor_analysis, frozen_advisor_price, outcome, follow_up_reason, concluded_at, outcome_changed_at',
      )
      .in('project_id', ids)
      .eq('agency_id', agencyId),
  ]);

  const propertyByProject = new Map<string, PreparationProperty>();
  for (const row of propertiesRes.data ?? []) {
    propertyByProject.set(row.project_id, {
      propertyType: row.property_type,
      roomsCount: row.rooms_count,
      surfaceArea: row.surface_area,
      city: row.city,
    });
  }

  const conclusionByProject = new Map<string, MeetingConclusion>();
  for (const row of conclusionsRes.data ?? []) {
    conclusionByProject.set(row.project_id, {
      marketComputed: row.frozen_market_computed,
      advisorAnalysis: row.frozen_advisor_analysis,
      advisorPrice: row.frozen_advisor_price,
      commercializationPrice: row.commercialization_price,
      outcome: (row.outcome as MeetingConclusion['outcome']) ?? null,
      followUpReason: row.follow_up_reason,
      concludedAt: row.concluded_at,
      outcomeChangedAt: row.outcome_changed_at,
    });
  }

  return list.map((project) => ({
    project: project as Project,
    property: propertyByProject.get(project.id) ?? null,
    conclusion: conclusionByProject.get(project.id) ?? null,
  }));
}
