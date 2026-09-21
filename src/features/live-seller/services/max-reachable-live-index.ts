import { canAdvanceLivePage } from '@/features/live-seller/services/can-advance-live-page';
import type { LiveNavComparable, LivePage } from '@/features/live-seller/services/build-live-pages';
import type { LiveSellerSummary } from '@/features/live-seller/types';

// Minimum structurel lu par la borne : concurrents (id + réponse) et résumé vendeur.
// Donnée complète et donnée projetée le satisfont toutes deux.
type LiveReachSource = { comparables: LiveNavComparable[]; sellerSummary: LiveSellerSummary | null };

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

// L'index d'ouverture réellement sûr : la demande de l'URL, bornée à la page atteignable.
export function clampInitialLiveIndex(
  requested: number,
  pages: LivePage[],
  live: LiveReachSource | null,
): number {
  if (requested <= 0) {
    return 0;
  }
  return Math.min(requested, maxReachableLiveIndex(pages, live));
}
