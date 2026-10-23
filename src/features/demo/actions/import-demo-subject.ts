'use server';

import type { ComparableImportResult } from '@/features/comparable-import/types';
import { summarizeListingFields } from '@/features/comparable-import/services/normalize-listing-data';
import { DEMO_SUBJECT_UNKNOWN } from '@/features/demo/constants';
import { demoDelay } from '@/features/demo/services/demo-delay';
import { demoSubjectImportedData } from '@/features/demo/services/demo-listing-data';
import { findDemoSubjectScenario } from '@/features/demo/services/demo-urls';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Mission 114 — « Importer une annonce » sur le bien vendeur, en démonstration : l'annonce
// proposée d'avance est celle du scénario ; ses données arrivent du jeu de données, côté serveur,
// après le délai fixe, dans la MÊME forme qu'une annonce lue (`ComparableImportResult`) — le
// mapper du bien vendeur garde le prix hors des champs (M38), comme toujours. Réservé à l'agence
// de démonstration. Même signature que l'import par adresse, pour se brancher à sa place.
export async function importDemoSubjectListing(
  projectId: string,
  formData: FormData,
): Promise<ComparableImportResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  if (!(await isDemoAgency(profile.agency_id))) {
    return { ok: false, error: DEMO_SUBJECT_UNKNOWN };
  }
  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!project) {
    return { ok: false, error: 'Dossier introuvable.' };
  }
  const raw = formData.get('url');
  const scenario = typeof raw === 'string' ? findDemoSubjectScenario(raw.trim()) : null;
  if (!scenario) {
    return { ok: false, error: DEMO_SUBJECT_UNKNOWN };
  }
  await demoDelay();
  const data = demoSubjectImportedData(scenario, new Date());
  // Trouvé et manquant comptés comme pour une annonce lue : les champs du résumé, pas les clés.
  const { foundFields, missingFields } = summarizeListingFields(data);
  return { ok: true, data, foundFields, missingFields, history: null };
}
