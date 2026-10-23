'use server';

import type {
  ComparableImportResult,
  ImportedComparableData,
} from '@/features/comparable-import/types';
import { DEMO_SUBJECT_UNKNOWN } from '@/features/demo/constants';
import { demoDelay } from '@/features/demo/services/demo-delay';
import { demoSubjectImportedData } from '@/features/demo/services/demo-listing-data';
import { findDemoSubjectScenario } from '@/features/demo/services/demo-urls';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

const filled = (value: unknown): boolean =>
  Array.isArray(value) ? value.length > 0 : value != null && value !== '';

// Les champs trouvés et manquants, comme le lecteur d'annonce les compte pour l'écran.
function fieldSummary(data: ImportedComparableData): { found: string[]; missing: string[] } {
  const found: string[] = [];
  const missing: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (key === 'listingUrl' || key === 'source') continue;
    (filled(value) ? found : missing).push(key);
  }
  return { found, missing };
}

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
  const { found, missing } = fieldSummary(data);
  return { ok: true, data, foundFields: found, missingFields: missing, history: null };
}
