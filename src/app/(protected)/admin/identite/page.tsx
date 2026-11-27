import Link from 'next/link';

import { backLink, kickerLabel, pageSubtitle, pageTitle } from '@/components/ui/styles';
import { BrandingForm } from '@/features/branding/components/branding-form';
import { getAgencyBranding } from '@/features/branding/queries/get-agency-branding';
import { isManagerRole } from '@/features/team/services/role';
import { getAgency } from '@/lib/auth/get-agency';
import { getProfile } from '@/lib/auth/get-profile';
import { LegalIdentityForm } from '@/features/legal-identity/components/legal-identity-form';
import { readLegalIdentity } from '@/features/legal-identity/queries/get-legal-identity';
import {
  EMPTY_LEGAL_IDENTITY,
  legalIdentityGaps,
} from '@/features/legal-identity/services/legal-identity';
import { createClient } from '@/lib/supabase/server';

// Mission 55 jalon 1 — L'identité de l'agence. L'agence règle son logo et sa couleur ; la
// charte s'applique à tout l'outil, et l'aperçu montre le Live tel que le vendeur le verra.
export default async function AgencyIdentityPage() {
  const branding = await getAgencyBranding();
  const profile = await getProfile();
  const agency = profile ? await getAgency(profile.agency_id) : null;
  // Mission 137 — l'identité légale, pour le bon de visite et l'offre d'achat.
  const legal = profile ? await readLegalIdentity(await createClient(), profile.agency_id) : null;
  const identity = legal?.ok ? legal.identity : EMPTY_LEGAL_IDENTITY;
  const readOnly = !profile || Boolean(profile.removed_at) || !isManagerRole(profile.role);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-2">
        <Link href="/admin" className={backLink}>
          ← Administration
        </Link>
        <span className={kickerLabel}>Agence</span>
        <h1 className={pageTitle}>Identité de l’agence</h1>
        <p className={pageSubtitle}>
          Votre logo, votre couleur et votre police de marque, appliqués à tout l’outil — jusqu’au
          Live que voit le vendeur.
        </p>
      </div>

      <BrandingForm
        initialPrimary={branding?.brand ?? '#3ea9ff'}
        initialLogoLightUrl={branding?.logoLightUrl ?? null}
        initialLogoDarkUrl={branding?.logoDarkUrl ?? null}
        initialFont={branding?.fontFamily ?? ''}
        initialSiteUrl={branding?.siteUrl ?? ''}
        initialPostalAddress={branding?.postalAddress ?? ''}
        initialProfessionalCard={branding?.professionalCard ?? ''}
        initialProfessionalCardIssuer={branding?.professionalCardIssuer ?? ''}
        initialFinancialGuarantee={branding?.financialGuarantee ?? ''}
        initialDocumentName={branding?.documentName ?? ''}
        agencyName={agency?.name ?? ''}
        // Mission 88 — un conseiller (ou un membre retiré) voit l'identité, sans la modifier.
        readOnly={readOnly}
      />

      {legal && !legal.ok ? (
        <p role="alert" className="text-sm font-semibold text-red-700">
          L’identité légale n’a pas pu être lue&nbsp;: rechargez la page.
        </p>
      ) : (
        <LegalIdentityForm
          initial={identity}
          initialGuaranteeText={
            legal?.ok && !legal.saved ? (branding?.financialGuarantee ?? null) : null
          }
          gaps={legalIdentityGaps(identity, branding)}
          readOnly={readOnly}
        />
      )}
    </div>
  );
}
