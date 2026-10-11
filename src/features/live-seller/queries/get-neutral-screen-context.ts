import 'server-only';

import { getAgencyBranding } from '@/features/branding/queries/get-agency-branding';
import { getProject } from '@/features/projects/queries/get-project';
import { getAgency } from '@/lib/auth/get-agency';
import { getProfile } from '@/lib/auth/get-profile';

// Mission 92 — ce qu'un écran neutre du Live a le droit de connaître : l'identité de l'agence
// et le prénom du conseiller connecté. LISTE D'AUTORISATION : rien du dossier n'en sort — ni
// nom de vendeur, ni bien, ni montant. Le dossier n'est lu que pour vérifier qu'il appartient à
// l'agence (sinon null → 404).
export type NeutralScreenContext = {
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  agencyName: string | null;
  advisorFirstName: string | null;
};

export async function getNeutralScreenContext(
  projectId: string,
): Promise<NeutralScreenContext | null> {
  const project = await getProject(projectId);
  if (!project) {
    return null;
  }
  const [branding, profile] = await Promise.all([getAgencyBranding(), getProfile()]);
  const agency = profile ? await getAgency(profile.agency_id) : null;
  return {
    logoLightUrl: branding?.logoLightUrl ?? null,
    logoDarkUrl: branding?.logoDarkUrl ?? null,
    agencyName: agency?.name ?? null,
    advisorFirstName: profile?.first_name?.trim() || null,
  };
}
