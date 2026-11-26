import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { alertOk, backLink, kickerLabel, pageSubtitle, pageTitle } from '@/components/ui/styles';
import { getBuyer } from '@/features/buyers/queries/get-buyers';
import { IdealPropertiesPanel } from '@/features/ideal-properties/components/ideal-properties-panel';
import { loadIdealPanel } from '@/features/ideal-properties/queries/load-ideal-panel';
import { getProfile } from '@/lib/auth/get-profile';

export const metadata: Metadata = { title: 'Biens idéaux — ACM Studio' };

type Props = {
  params: Promise<{ buyerId: string }>;
  searchParams: Promise<{ un?: string; enregistre?: string }>;
};

// Mission 118 (partie B) — « Trouver les biens idéaux » pour un acquéreur, écran du conseiller :
// l'agence d'abord (le rapprochement M86), puis le marché (lancé depuis l'écran), puis la
// sélection. Une fiche archivée est introuvable : un acquéreur archivé ne cherche plus. Ce que la
// page lit est dans `loadIdealPanel`. La refonte, lot C — `?un=1` l'ouvre sur « un bien à la
// fois » (maquette REFONTE-3) : les mêmes biens, la même sélection, un par un ; `?un=veille`, sur
// les seuls biens trouvés par la veille (la tâche « 4 nouveaux biens » mène à « Bien 1 sur 4 »).
export default async function IdealPropertiesPage({ params, searchParams }: Props) {
  const [{ buyerId }, query] = await Promise.all([params, searchParams]);
  const [buyer, profile] = await Promise.all([getBuyer(buyerId), getProfile()]);
  if (!buyer || !profile) notFound();
  const panel = await loadIdealPanel(buyer, profile);

  return (
    <div className="flex max-w-4xl flex-col">
      <IdealPropertiesPanel
        {...panel}
        initialView={query.un === 'veille' ? 'watch' : query.un != null ? 'deck' : 'list'}
        header={
          <div className="flex flex-col gap-2 md:mb-2">
            <Link href={`/acquereurs/${buyer.id}`} className={backLink}>
              ← {buyer.name}
            </Link>
            <span className={kickerLabel}>Acquéreur</span>
            <h1 className={pageTitle} data-testid="ideal-title">
              Les biens idéaux de {buyer.name}
            </h1>
            <p className={pageSubtitle}>
              Ce que l’agence a déjà, puis le marché en trois catégories ; retenez jusqu’à trois
              biens. Cet écran est pour vous : le dossier remis à l’acquéreur viendra ensuite.
            </p>
            {/* La refonte, lot D — la fiche vient d'être créée par « Trouver ses biens ». */}
            {query.enregistre ? (
              <p role="status" className={alertOk} data-testid="buyer-saved">
                Fiche enregistrée.
              </p>
            ) : null}
          </div>
        }
      />
    </div>
  );
}
