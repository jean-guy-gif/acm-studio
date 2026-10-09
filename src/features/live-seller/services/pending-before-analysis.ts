import type { LivePage } from '@/features/live-seller/services/build-live-pages';
import type { LiveComparableResponse, LiveSellerSummary } from '@/features/live-seller/types';

// MISSION 82 — « Analyse des prix » ne s'ouvre qu'une fois le prix du vendeur donné et
// chaque concurrent estimé ou écarté par « non » (même règle que isAdvisorRangeAuthorized,
// côté serveur). Quand une étape a été sautée, l'écran ne reste pas vide : il nomme ce
// qui reste à passer et y mène. Fonction PURE.
//
// Le libellé d'un concurrent est son libellé NEUTRE (pièces · surface · commune) : jamais
// le titre du portail, qui porte souvent le prix (M51), ni son adresse (M75).
export type PendingLiveStep = {
  key: string;
  pageIndex: number;
  label: string;
};

type PendingSource = {
  id: string;
  neutralLabel: string;
  response: Pick<
    LiveComparableResponse,
    'seller_serious_competitor' | 'seller_estimated_listing_price'
  > | null;
};

export function pendingBeforeAnalysis(
  pages: LivePage[],
  comparables: PendingSource[],
  summary: Pick<LiveSellerSummary, 'seller_perceived_property_price'> | null,
): PendingLiveStep[] {
  const steps: PendingLiveStep[] = [];

  if (summary?.seller_perceived_property_price == null) {
    const pageIndex = pages.findIndex((page) => page.type === 'seller_perceived_price');
    if (pageIndex >= 0) {
      steps.push({ key: 'seller_perceived_price', pageIndex, label: 'Votre valeur perçue' });
    }
  }

  comparables.forEach((comparable, index) => {
    const serious = comparable.response?.seller_serious_competitor ?? null;
    if (serious === 'no' || comparable.response?.seller_estimated_listing_price != null) {
      return;
    }
    // On rouvre là où le concurrent s'est arrêté : la question, sinon la devinette.
    const target = serious == null ? 'comparable_competition' : 'comparable_price';
    const pageIndex = pages.findIndex(
      (page) => page.comparableId === comparable.id && page.type === target,
    );
    if (pageIndex >= 0) {
      steps.push({
        key: comparable.id,
        pageIndex,
        label: `Concurrent ${index + 1} (${comparable.neutralLabel})`,
      });
    }
  });

  return steps;
}
