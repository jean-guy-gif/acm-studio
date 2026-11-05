import { livePageHasAnswer } from '@/features/live-seller/services/can-advance-live-page';
import { maxReachableLiveIndex } from '@/features/live-seller/services/max-reachable-live-index';
import type { LiveNavComparable, LivePage } from '@/features/live-seller/services/build-live-pages';
import type { LiveSellerSummary } from '@/features/live-seller/types';

// Mission 89 — un rendez-vous interrompu reprend là où il s'était arrêté. Pur.
//
// Deux bornes, à ne pas confondre :
//   • la borne PERMISE (maxReachableLiveIndex, canAdvanceLivePage) : jusqu'où l'on a le droit
//     d'ouvrir — c'est elle qui tient « jamais le prix avant la devinette » ;
//   • l'écran de REPRISE proposé : celui qui suit la dernière réponse du vendeur. Il ne
//     dépasse jamais la borne permise, et ne renvoie pas en arrière vers un écran validé sans
//     réponse (« Votre bien », « Un sérieux concurrent ? » : le bouton ne l'exigeait pas).

type ResumeSource = {
  comparables: LiveNavComparable[];
  sellerSummary: LiveSellerSummary | null;
};

export type LiveResume = {
  // Le vendeur a-t-il déjà répondu à quelque chose ? Sinon : « Lancer le Live ».
  started: boolean;
  // L'écran où reprendre (index dans les pages) et le nombre d'écrans.
  index: number;
  total: number;
};

const SUMMARY_ANSWERS = [
  'seller_property_confirmed',
  'seller_perceived_property_price',
  'seller_most_dangerous_comparable_id',
  'seller_revised_property_price',
  'seller_launch_readiness_last',
] as const;

// Mission 131 — un concurrent montré en directe : le Live a commencé, même sans réponse.
const RESPONSE_ANSWERS = [
  'shown_directly_at',
  'seller_serious_competitor',
  'seller_estimated_listing_price',
  'seller_price_coherence',
  'seller_estimated_days_on_market',
  'seller_market_duration_reason',
] as const;

export function hasLiveStarted(live: ResumeSource | null): boolean {
  if (!live) {
    return false;
  }
  const summary = live.sellerSummary;
  if (summary && SUMMARY_ANSWERS.some((field) => summary[field] != null)) {
    return true;
  }
  return live.comparables.some((comparable) => {
    const response = comparable.response;
    return response != null && RESPONSE_ANSWERS.some((field) => response[field] != null);
  });
}

export function liveResume(pages: LivePage[], live: ResumeSource | null): LiveResume {
  const summary = live?.sellerSummary ?? null;
  let lastAnswered = -1;
  pages.forEach((page, i) => {
    const entry =
      page.comparableId != null
        ? (live?.comparables.find((comparable) => comparable.id === page.comparableId) ?? null)
        : null;
    if (livePageHasAnswer(page.type, entry, summary)) {
      lastAnswered = i;
    }
  });
  const next = Math.min(lastAnswered + 1, Math.max(0, pages.length - 1));
  return {
    started: hasLiveStarted(live),
    index: Math.min(next, maxReachableLiveIndex(pages, live)),
    total: pages.length,
  };
}

// « Reprendre (écran 7 sur 20) ».
export function resumeLabel(resume: LiveResume): string {
  return `Reprendre (écran ${resume.index + 1} sur ${resume.total})`;
}

// La position gardée par l'appareil du conseiller pendant le Live (rien du dossier, un numéro
// d'écran) : la reprise rouvre exactement là. Le serveur la borne de toute façon.
export const LIVE_POSITION_KEY_PREFIX = 'acm-live-position:';

export function livePositionKey(projectId: string): string {
  return `${LIVE_POSITION_KEY_PREFIX}${projectId}`;
}

// L'écran de reprise : la position gardée par l'appareil si elle est plausible, sinon celle que
// disent les réponses enregistrées.
export function resumeIndexFor(resume: LiveResume, storedPosition: string | null): number {
  const stored = Number.parseInt(storedPosition ?? '', 10);
  if (Number.isInteger(stored) && stored > 0 && stored < resume.total) {
    return stored;
  }
  return resume.index;
}
