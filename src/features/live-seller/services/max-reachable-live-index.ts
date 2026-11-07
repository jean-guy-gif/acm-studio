import {
  canAdvanceLivePage,
  livePageHasAnswer,
} from '@/features/live-seller/services/can-advance-live-page';
import type {
  LiveNavComparable,
  LivePage,
  LivePageType,
} from '@/features/live-seller/services/build-live-pages';
import type { LiveSellerSummary } from '@/features/live-seller/types';

// Minimum structurel lu par la borne : concurrents (id + réponse) et résumé vendeur.
// Donnée complète et donnée projetée le satisfont toutes deux.
type LiveReachSource = {
  comparables: LiveNavComparable[];
  sellerSummary: LiveSellerSummary | null;
};

// MISSION 51 §2.2 — le prix ne doit fuir sur AUCUN chemin. La garde d'avancement
// (canAdvanceLivePage) protège le bouton « Suivant », mais PAS l'ouverture directe par
// l'URL (« ?fiche=N ») : ouvrir l'étape de révélation avant d'avoir estimé affichait le
// titre brut, prix compris.
//
// On borne l'index d'ouverture à la page la plus loin LÉGITIMEMENT atteinte, calculée à
// partir des réponses PERSISTÉES uniquement : on ne peut arriver sur une page que si
// toutes celles d'avant autorisent l'avancement. La page de révélation est donc
// inatteignable — même par l'URL — tant que l'estimation n'est pas enregistrée. Calculé
// côté serveur : le HTML de la révélation (avec le prix) n'est même pas produit.
export function maxReachableLiveIndex(pages: LivePage[], live: LiveReachSource | null): number {
  const summary = live?.sellerSummary ?? null;
  let reachable = 0;
  for (let i = 0; i < pages.length - 1; i += 1) {
    const page = pages[i];
    const entry =
      page.comparableId != null
        ? (live?.comparables.find((comparable) => comparable.id === page.comparableId) ?? null)
        : null;
    if (!canAdvanceLivePage(page.type, entry, summary)) {
      break;
    }
    reachable = i + 1;
  }
  return reachable;
}

// Mission 143-144 — les écrans qui posent une question au vendeur ; leur réponse peut partir en
// fond (M51, M144) et se perdre dans un rechargement.
const ASKING_SCREENS: ReadonlySet<LivePageType> = new Set<LivePageType>([
  'subject_property',
  'seller_perceived_price',
  'comparable_competition',
  'comparable_price',
  'comparable_price_reveal',
  'comparable_duration',
  'comparable_quick_guess',
  'comparable_quick_reveal',
  'dangerous_competitor',
  'seller_revised_price',
  'closing_question',
]);

// Mission 144 — après un rechargement, le Live reprend au plus loin à la première question qui
// suit la dernière réponse ENREGISTRÉE en base, jamais plus loin (décision de Jean-Guy, 07/11) :
// une réponse partie en fond et perdue se redemande. Les écrans sans question (DPE, analyse,
// conclusion) ne retiennent pas ; une question passée sans réponse AVANT la dernière réponse non
// plus. Pur.
export function answeredResumeBound(
  pages: LivePage[],
  live: LiveReachSource | null,
  // Mission 131 — en présentation directe, « Votre bien » ne demande rien.
  mode: 'interactive' | 'direct' = 'interactive',
): number {
  const summary = live?.sellerSummary ?? null;
  const entryOf = (page: LivePage) =>
    page.comparableId != null
      ? (live?.comparables.find((comparable) => comparable.id === page.comparableId) ?? null)
      : null;
  let lastAnswered = -1;
  pages.forEach((page, i) => {
    if (livePageHasAnswer(page.type, entryOf(page), summary)) lastAnswered = i;
  });
  for (let i = lastAnswered + 1; i < pages.length; i += 1) {
    const page = pages[i]!;
    if (!ASKING_SCREENS.has(page.type)) continue;
    if (mode === 'direct' && page.type === 'subject_property') continue;
    const entry = entryOf(page);
    // « Non » à « Un sérieux concurrent ? » saute la suite de ce concurrent (M41) : elle ne
    // retient pas.
    if (
      entry?.response?.seller_serious_competitor === 'no' &&
      page.type !== 'comparable_competition'
    )
      continue;
    // L'écran 2 du rythme accéléré ne demande la durée que si elle est connue (M92, M95).
    if (page.type === 'comparable_quick_reveal' && entry?.durationKnown === false) continue;
    return i;
  }
  return Math.max(0, pages.length - 1);
}

// L'index d'ouverture réellement sûr : la demande de l'URL, bornée à la page atteignable et à la
// dernière réponse enregistrée (M144).
export function clampInitialLiveIndex(
  requested: number,
  pages: LivePage[],
  live: LiveReachSource | null,
  mode: 'interactive' | 'direct' = 'interactive',
): number {
  if (requested <= 0) {
    return 0;
  }
  return Math.min(
    requested,
    maxReachableLiveIndex(pages, live),
    answeredResumeBound(pages, live, mode),
  );
}
