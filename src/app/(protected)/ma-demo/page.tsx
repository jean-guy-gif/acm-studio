import { notFound } from 'next/navigation';

import { kickerLabel, pageSubtitle, pageTitle } from '@/components/ui/styles';
import { DemoDossiersPanel } from '@/features/demo/components/demo-dossiers-panel';
import { getDemoDossiers } from '@/features/demo/queries/get-demo-dossiers';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import { getProfile } from '@/lib/auth/get-profile';

// Mission 114 (partie B) — « Ma démo », dans l'agence de démonstration seulement : introuvable
// ailleurs, à l'écran comme par son adresse.
export default async function DemoPage() {
  const profile = await getProfile();
  if (!profile || !(await isDemoAgency(profile.agency_id))) {
    notFound();
  }
  const dossiers = await getDemoDossiers();
  return (
    <div className="flex max-w-3xl flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-1.5">
        <span className={kickerLabel}>Démo</span>
        <h1 className={pageTitle}>Ma démo</h1>
        <p className={pageSubtitle}>
          Vos dossiers pour dérouler l’outil de bout en bout, et les remettre à neuf quand vous
          voulez.
        </p>
      </div>
      <DemoDossiersPanel dossiers={dossiers} />
    </div>
  );
}
