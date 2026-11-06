import { priceShown } from '@/features/live-seller/services/presentation-mode';
import { clientTexts, type TextLanguage } from '@/lib/client-texts';
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
  response:
    | (Pick<
        LiveComparableResponse,
        'seller_serious_competitor' | 'seller_estimated_listing_price'
      > & { shown_directly_at?: string | null })
    | null;
};

export function pendingBeforeAnalysis(
  pages: LivePage[],
  comparables: PendingSource[],
  summary: Pick<LiveSellerSummary, 'seller_perceived_property_price'> | null,
  // Mission 140 — dans la langue du vendeur ; `neutralLabel` est alors déjà dans sa langue.
  language: TextLanguage = 'fr',
): PendingLiveStep[] {
  const t = clientTexts(language).live.analysis;
  const steps: PendingLiveStep[] = [];

  if (summary?.seller_perceived_property_price == null) {
    const pageIndex = pages.findIndex((page) => page.type === 'seller_perceived_price');
    if (pageIndex >= 0) {
      steps.push({ key: 'seller_perceived_price', pageIndex, label: t.pendingPerceived });
    }
  }

  comparables.forEach((comparable, index) => {
    const serious = comparable.response?.seller_serious_competitor ?? null;
    if (serious === 'no' || priceShown(comparable.response)) {
      return;
    }
    // On rouvre là où le concurrent s'est arrêté : la question, sinon la devinette.
    const target = serious == null ? 'comparable_competition' : 'comparable_price';
    // Rythme accéléré (mission 95) : la question et la devinette sont sur le même écran.
    const pageIndex = pages.findIndex(
      (page) =>
        page.comparableId === comparable.id &&
        (page.type === target ||
          page.type === 'comparable_quick_guess' ||
          // Mission 131 — en directe, l'écran unique du concurrent.
          page.type === 'comparable_direct'),
    );
    if (pageIndex >= 0) {
      steps.push({
        key: comparable.id,
        pageIndex,
        label: t.pendingCompetitor(index + 1, comparable.neutralLabel),
      });
    }
  });

  return steps;
}
