'use server';

import { redirect } from 'next/navigation';

import {
  authorizeAdvisorRange,
  authorizeComparableReveal,
  type DeliveredFragment,
} from '@/features/live-seller/services/project-live-for-seller';
import { loadLivePresentation } from '@/features/live-seller/services/load-live-presentation';
import { writeLiveComparableResponse } from '@/features/live-seller/services/write-live-comparable-response';
import { writeLiveSellerSummary } from '@/features/live-seller/services/write-live-seller-summary';
import { writeShownDirectly } from '@/features/live-seller/services/write-shown-directly';

// MISSION 51 §2.2 — LA VOIE DE LIVRAISON, unique. Le montant n'entre jamais dans la
// charge initiale ; il est LIVRÉ ici, après persistance ET ré-vérification côté serveur
// sur la donnée fraîche :
//   • révélation d'un concurrent — autorisée par l'estimation persistée ;
//   • fourchette conseiller — autorisée par la valeur perçue persistée ET tous les
//     concurrents estimés ou écartés (mission 82), à l'entrée de « Analyse des prix ».
// Persister (rapide) puis livrer, en UN aller-retour : l'écran avance, le prix arrive
// avec la navigation autorisée, jamais avant. Le client ne peut pas forcer la livraison
// d'un montant que le vendeur n'a pas encore mérité de voir.
// Mission 131 — troisième voie : un concurrent MONTRÉ EN DIRECTE. Le fait est persisté d'abord
// (refusé hors présentation directe), puis le prix livré par la même autorisation.
export type DeliverLiveRequest =
  | { kind: 'comparable-reveal'; comparableId: string; formData: FormData }
  | { kind: 'comparable-direct'; comparableId: string }
  | { kind: 'advisor-range'; formData: FormData };

export type DeliverLiveResult =
  | { ok: true; fragment: DeliveredFragment }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function deliverLiveFragment(
  projectId: string,
  request: DeliverLiveRequest,
): Promise<DeliverLiveResult> {
  if (request.kind === 'comparable-reveal' || request.kind === 'comparable-direct') {
    const written =
      request.kind === 'comparable-direct'
        ? await writeShownDirectly(projectId, request.comparableId)
        : await writeLiveComparableResponse(projectId, request.comparableId, request.formData);
    if (!written.ok) {
      return {
        ok: false,
        error: written.error,
        fieldErrors:
          'fieldErrors' in written
            ? (written.fieldErrors as Record<string, string> | undefined)
            : undefined,
      };
    }
    const presentation = await loadLivePresentation(projectId, 'reveal');
    if (!presentation?.live) {
      // Mission 104 — plus de concurrent retenu en pleine séance : l'écran neutre de pause.
      redirect(`/live/${projectId}/pause`);
    }
    const comparable = authorizeComparableReveal(presentation.live, request.comparableId);
    if (!comparable) {
      // Ne devrait pas arriver après une écriture réussie de l'estimation ; garde serveur.
      return { ok: false, error: 'Indiquez d’abord le prix que vous imaginez.' };
    }
    return { ok: true, fragment: { kind: 'comparable', comparable } };
  }

  const written = await writeLiveSellerSummary(projectId, request.formData);
  if (!written.ok) {
    return { ok: false, error: written.error, fieldErrors: written.fieldErrors };
  }
  const presentation = await loadLivePresentation(projectId, 'reveal');
  if (!presentation?.live) {
    // Mission 104 — plus de concurrent retenu en pleine séance : l'écran neutre de pause.
    redirect(`/live/${projectId}/pause`);
  }
  const advisorRange = authorizeAdvisorRange(presentation.live);
  if (!advisorRange) {
    return {
      ok: false,
      error:
        'Il manque votre prix, ou votre réponse sur un concurrent\u00a0: revenez-y avant l’analyse.',
    };
  }
  return { ok: true, fragment: { kind: 'advisor-range', advisorRange } };
}
