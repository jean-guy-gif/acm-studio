import type { LiveComparativeData } from '@/features/seller-presentation/types/seller-presentation';
import type { ConclusionAmounts, MeetingConclusion } from '@/features/meeting-conclusion/types';

// Les trois repères ①②③ tels qu'ils VALENT MAINTENANT, dérivés de la présentation Live.
// Ce sont eux que l'écran de conclusion fige au moment de conclure ; avant la conclusion,
// ils servent d'aperçu. ④ (prix convenu) ne vient jamais d'ici : il est saisi au Live.
export function liveDerivedAmounts(live: LiveComparativeData | null): ConclusionAmounts {
  return {
    marketComputed: live?.competitiveMarketCentral ?? null,
    // Mission 58 — l'analyse du conseiller vient du positionnement (préparation), plus du
    // résumé Live. Le gel à la conclusion (M56) capte donc la même valeur, depuis sa source.
    advisorAnalysis: live?.advisorDecision?.advisorComparativeMarketPrice ?? null,
    advisorPrice: live?.advisorDecision?.advisorPrice ?? null,
    commercializationPrice: null,
  };
}

// Mission 56 — les quatre FAITS capturés à la conclusion, dérivés de la présentation.
// Absent reste absent (prix null → null) ; les comptes sont des entiers dès que le Live
// existe (retenus = concurrents is_selected ; exploitables = retenus avec prix et surface).
export type CapturedFacts = {
  sellerWanted: number | null; // prix souhaité par le vendeur (départ)
  sellerPerceived: number | null; // valeur perçue par le vendeur (Live)
  retained: number | null; // concurrents retenus — le nombre humain
  exploitable: number | null; // concurrents exploitables — derrière frozen_market_computed
};

export function liveCapturedFacts(live: LiveComparativeData | null): CapturedFacts {
  if (!live) {
    return { sellerWanted: null, sellerPerceived: null, retained: null, exploitable: null };
  }
  return {
    sellerWanted: live.advisorDecision?.sellerPrice ?? null,
    sellerPerceived: live.sellerSummary?.seller_perceived_property_price ?? null,
    retained: live.comparables.length,
    exploitable: live.comparables.filter(
      (comparable) =>
        comparable.price > 0 && comparable.surfaceArea != null && comparable.surfaceArea > 0,
    ).length,
  };
}

// Ce qu'on AFFICHE : une fois figés, on montre les montants figés (§3 « figés, pas
// recalculés ») ; tant qu'un montant n'est pas figé, on retombe sur la valeur courante.
// Le prix convenu vient de la conclusion (saisi au Live), jamais du live-dérivé.
export function resolveConclusionAmounts(
  conclusion: MeetingConclusion | null,
  live: LiveComparativeData | null,
): ConclusionAmounts {
  const current = liveDerivedAmounts(live);
  return {
    marketComputed: conclusion?.marketComputed ?? current.marketComputed,
    advisorAnalysis: conclusion?.advisorAnalysis ?? current.advisorAnalysis,
    advisorPrice: conclusion?.advisorPrice ?? current.advisorPrice,
    commercializationPrice: conclusion?.commercializationPrice ?? null,
  };
}
