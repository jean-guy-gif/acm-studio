'use server';

import { parseListingUrl } from '@/features/comparable-import/utils/normalize-listing-url';
import { importedToComparableInput } from '@/features/comparables/utils/imported-to-comparable-input';
import type { ImportAndCreateResult } from '@/features/competitor-search/actions/import-and-create-competitor';
import { createImportedCompetitor } from '@/features/competitor-search/services/create-imported-competitor';
import { DEMO_LISTING_UNKNOWN } from '@/features/demo/constants';
import { demoDelay } from '@/features/demo/services/demo-delay';
import { demoImportedData } from '@/features/demo/services/demo-listing-data';
import { demoListingUrl, findDemoListing } from '@/features/demo/services/demo-urls';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

const GENERIC_ERROR = 'L’import de cette annonce a échoué.';

// Mission 114 — l'import d'une annonce de DÉMONSTRATION : pas de page lue par l'extension, les
// données viennent du jeu de données, côté serveur, après le délai fixe de la démo. Réservé à
// l'agence de démonstration (repère lu en base) ; puis le MÊME chemin qu'une page lue
// (`createImportedCompetitor` : observation, concurrent retenu, « à vérifier », bascule « prêt »).
export async function importDemoCompetitor(
  projectId: string,
  rawUrl: string,
): Promise<ImportAndCreateResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) {
    return { ok: false, error: GENERIC_ERROR };
  }
  if (!(await isDemoAgency(profile.agency_id))) {
    return { ok: false, error: GENERIC_ERROR };
  }
  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!project) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const listing = typeof rawUrl === 'string' ? findDemoListing(rawUrl) : null;
  const url = listing ? parseListingUrl(demoListingUrl(listing)) : null;
  if (!listing || !url) {
    return { ok: false, error: DEMO_LISTING_UNKNOWN };
  }

  await demoDelay();
  const data = demoImportedData(listing, new Date());
  const input = importedToComparableInput(data);
  if (input == null) {
    return { ok: false, error: GENERIC_ERROR };
  }
  return createImportedCompetitor({
    supabase,
    projectId,
    agencyId: profile.agency_id,
    url,
    data,
    input,
    propertyType: listing.propertyType,
  });
}
