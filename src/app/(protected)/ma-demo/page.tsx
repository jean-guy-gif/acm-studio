import { notFound } from 'next/navigation';

import { alertError, kickerLabel, pageSubtitle, pageTitle } from '@/components/ui/styles';
import { DemoDossiersPanel } from '@/features/demo/components/demo-dossiers-panel';
import { getDemoDossiers } from '@/features/demo/queries/get-demo-dossiers';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import { getProfile } from '@/lib/auth/get-profile';

type DemoPageProps = { searchParams: Promise<{ error?: string }> };

// Mission 114 (partie B) — « Ma démo », dans l'agence de démonstration seulement : introuvable
// ailleurs, à l'écran comme par son adresse.
export default async function DemoPage({ searchParams }: DemoPageProps) {
  const profile = await getProfile();
  if (!profile || !(await isDemoAgency(profile.agency_id))) {
    notFound();
  }
  const { error } = await searchParams;
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
      {error ? (
        <p role="alert" className={alertError}>
          {error}
        </p>
      ) : null}
      <DemoDossiersPanel dossiers={dossiers} />
    </div>
  );
}
