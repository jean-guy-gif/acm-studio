import Link from 'next/link';
import { notFound } from 'next/navigation';

import { backLink, kickerLabel, pageSubtitle, pageTitle } from '@/components/ui/styles';
import { ManagerOverviewView } from '@/features/team/components/manager-overview';
import { getManagerOverview } from '@/features/team/queries/get-manager-overview';
import { isManagerRole } from '@/features/team/services/role';
import { getProfile } from '@/lib/auth/get-profile';

// Mission 59 jalon 1 — la vue manager. Gardée par RÔLE, écran ET adresse : un conseiller qui
// ouvre /admin/equipe directement tombe sur un 404 (notFound), pas sur les chiffres de
// l'agence. Le garde précède TOUTE lecture d'activité. La visibilité des dossiers, elle, ne
// change pour personne (§5) : c'est une vue EN PLUS, elle n'enlève aucun accès.
export default async function ManagerViewPage() {
  const profile = await getProfile();
  if (!profile || !isManagerRole(profile.role)) {
    notFound();
  }

  const overview = await getManagerOverview();
  if (!overview) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-2">
        <Link href="/admin" className={backLink}>
          ← Administration
        </Link>
        <span className={kickerLabel}>Agence · Vue manager</span>
        <h1 className={pageTitle}>L’équipe</h1>
        <p className={pageSubtitle}>
          L’activité de votre agence, orientée action. Ces chiffres restent dans l’agence.
        </p>
      </div>

      <ManagerOverviewView overview={overview} />
    </div>
  );
}
