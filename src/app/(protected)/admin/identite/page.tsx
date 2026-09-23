import Link from 'next/link';

import { backLink, kickerLabel, pageSubtitle, pageTitle } from '@/components/ui/styles';
import { BrandingForm } from '@/features/branding/components/branding-form';
import { getAgencyBranding } from '@/features/branding/queries/get-agency-branding';

// Mission 55 jalon 1 — L'identité de l'agence. L'agence règle son logo et sa couleur ; la
// charte s'applique à tout l'outil, et l'aperçu montre le Live tel que le vendeur le verra.
export default async function AgencyIdentityPage() {
  const branding = await getAgencyBranding();

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-2">
        <Link href="/admin" className={backLink}>
          ← Administration
        </Link>
        <span className={kickerLabel}>Agence</span>
        <h1 className={pageTitle}>Identité de l’agence</h1>
        <p className={pageSubtitle}>
          Votre logo et votre couleur de marque, appliqués à tout l’outil — jusqu’au Live que voit
          le vendeur.
        </p>
      </div>

      <BrandingForm
        initialPrimary={branding?.brand ?? '#3ea9ff'}
        initialLogoLightUrl={branding?.logoLightUrl ?? null}
        initialLogoDarkUrl={branding?.logoDarkUrl ?? null}
      />
    </div>
  );
}
