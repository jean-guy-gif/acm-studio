'use server';

import {
  authorizeAdvisorRange,
  authorizeComparableReveal,
  type DeliveredFragment,
} from '@/features/live-seller/services/project-live-for-seller';
import { loadLivePresentation } from '@/features/live-seller/services/load-live-presentation';
import { writeLiveComparableResponse } from '@/features/live-seller/services/write-live-comparable-response';
import { writeLiveSellerSummary } from '@/features/live-seller/services/write-live-seller-summary';

// MISSION 51 §2.2 — LA VOIE DE LIVRAISON, unique. Le montant n'entre jamais dans la
// charge initiale ; il est LIVRÉ ici, après persistance ET ré-vérification côté serveur
// sur la donnée fraîche :
//   • révélation d'un concurrent — autorisée par l'estimation persistée ;
//   • fourchette conseiller — autorisée par la valeur perçue persistée (écrans 7/8).
// Persister (rapide) puis livrer, en UN aller-retour : l'écran avance, le prix arrive
// avec la navigation autorisée, jamais avant. Le client ne peut pas forcer la livraison
// d'un montant que le vendeur n'a pas encore mérité de voir.
export type DeliverLiveRequest =
  | { kind: 'comparable-reveal'; comparableId: string; formData: FormData }
  | { kind: 'advisor-range'; formData: FormData };

export type DeliverLiveResult =
  | { ok: true; fragment: DeliveredFragment }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function deliverLiveFragment(
  projectId: string,
  request: DeliverLiveRequest,
): Promise<DeliverLiveResult> {
  if (request.kind === 'comparable-reveal') {
    const written = await writeLiveComparableResponse(projectId, request.comparableId, request.formData);
    if (!written.ok) {
      return { ok: false, error: written.error, fieldErrors: written.fieldErrors };
    }
    const presentation = await loadLivePresentation(projectId);
    if (!presentation?.live) {
      return { ok: false, error: 'Dossier indisponible.' };
    }
    const comparable = authorizeComparableReveal(presentation.live, request.comparableId);
    if (!comparable) {
      // Ne devrait pas arriver après une écriture réussie de l'estimation ; garde serveur.
      return { ok: false, error: 'Révélation non autorisée : estimation manquante.' };
    }
    return { ok: true, fragment: { kind: 'comparable', comparable } };
  }

  const written = await writeLiveSellerSummary(projectId, request.formData);
  if (!written.ok) {
    return { ok: false, error: written.error, fieldErrors: written.fieldErrors };
  }
  const presentation = await loadLivePresentation(projectId);
  if (!presentation?.live) {
    return { ok: false, error: 'Dossier indisponible.' };
  }
  const advisorRange = authorizeAdvisorRange(presentation.live);
  if (!advisorRange) {
    return { ok: false, error: 'Fourchette non autorisée : valeur perçue manquante.' };
  }
  return { ok: true, fragment: { kind: 'advisor-range', advisorRange } };
}
