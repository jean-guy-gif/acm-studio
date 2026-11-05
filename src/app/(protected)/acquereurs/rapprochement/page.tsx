import type { Metadata } from 'next';
import Link from 'next/link';

import { backLink, kickerLabel, pageSubtitle, pageTitle } from '@/components/ui/styles';
import { getBuyer } from '@/features/buyers/queries/get-buyers';
import { buyerToCriteria } from '@/features/buyers/services/buyer-criteria';
import { BuyerSearchPanel } from '@/features/meeting-conclusion/components/buyer-search-panel';
import { getSuiviDossiers } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import { getAgencyProspecting } from '@/features/prospecting/queries/get-agency-prospecting';
import { withoutExamples } from '@/features/welcome/services/example-exclusion';

export const metadata: Metadata = { title: 'Rapprochement acquéreur — ACM Studio' };

type MatchingPageProps = { searchParams: Promise<{ acquereur?: string }> };

// Mission 130 — le rapprochement acquéreur quitte le Suivi pour le mode Acquéreur, inchangé (M86,
// M117) : jetable, il cherche dans les mandats signés, les vendeurs à relancer et les concurrents à
// prospecter ; « Rapprocher » sur une fiche l'ouvre pré-rempli de ses critères et le joue tout de
// suite ; sans fiche, « Enregistrer cette recherche » mène à une fiche neuve.
export default async function BuyerMatchingPage({ searchParams }: MatchingPageProps) {
  const { acquereur } = await searchParams;
  const [buyer, allDossiers] = await Promise.all([
    acquereur ? getBuyer(acquereur) : null,
    getSuiviDossiers(),
  ]);
  // Mission 97 — le dossier d'exemple n'entre pas dans le rapprochement.
  const counted = withoutExamples(allDossiers);
  const { cards } = await getAgencyProspecting(counted);

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <div className="flex flex-col gap-1.5">
        {buyer ? (
          <Link href={`/acquereurs/${buyer.id}`} className={backLink}>
            ← {buyer.name}
          </Link>
        ) : (
          <Link href="/acquereurs" className={backLink}>
            ← Acquéreurs
          </Link>
        )}
        <span className={kickerLabel}>Acquéreurs</span>
        <h1 className={pageTitle}>Rapprochement acquéreur</h1>
        <p className={pageSubtitle}>
          Ce que l’agence a déjà : mandats signés, vendeurs à relancer, concurrents à prospecter.
        </p>
      </div>
      <BuyerSearchPanel
        dossiers={counted}
        entries={cards
          .filter((card) => card.row.opposedOn == null)
          .map(({ row, seller }) => ({ row, seller }))}
        initialCriteria={buyer ? buyerToCriteria(buyer) : null}
        buyerName={buyer?.name ?? null}
      />
    </div>
  );
}
