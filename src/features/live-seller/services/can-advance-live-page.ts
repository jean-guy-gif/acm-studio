import type { LiveSellerSummary } from '@/features/live-seller/types';
import type {
  LiveNavComparable,
  LivePageType,
} from '@/features/live-seller/services/build-live-pages';

// Reveal gates use persisted answers only. Local form values must never let the
// global navigation skip ahead before the server has accepted the answer.
// La garde ne lit que la réponse persistée du concurrent : elle se type sur ce
// minimum, donc la donnée projetée (sans prix) la satisfait comme la donnée complète.
//
// MISSION 89 — cette garde est ce que la REPRISE (ouverture par l'adresse) exige. Elle ne doit
// pas exiger plus que le bouton « Valider et continuer » : « Votre bien » et « Un sérieux
// concurrent ? » s'enregistrent sans réponse obligatoire, donc la reprise ne renvoie plus en
// arrière pour elles. Les trois verrous restent : le prix du vendeur avant tout concurrent
// (M82), la devinette avant le prix (M41), la durée devinée avant la durée observée.
export function canAdvanceLivePage(
  pageType: LivePageType,
  entry: LiveNavComparable | null,
  summary: LiveSellerSummary | null,
): boolean {
  // THE REVEAL LOCK (Mission 41). "À quel prix ?" is the guess screen; the price
  // is revealed only on the NEXT screen ("comparable_price_reveal"). Gating the
  // guess screen on the persisted estimate is what keeps the reveal unreachable
  // until the seller has committed a guess — the core ACM invariant. Do not relax.
  if (pageType === 'comparable_price') {
    return entry?.response?.seller_estimated_listing_price != null;
  }
  // The reveal screen itself carries no mandatory pre-reveal input (the seller's
  // reaction/coherence is captured but optional, like the duration reason), so it
  // is not re-gated here — reaching it already required the guess above.
  if (pageType === 'comparable_duration') {
    return entry?.response?.seller_estimated_days_on_market != null;
  }
  // MISSION 95 — rythme accéléré. Les MÊMES verrous, sur deux écrans :
  //   • écran 1 : on ne le quitte vers la révélation qu'avec la devinette du prix PERSISTÉE
  //     (ou un « non », qui dispense de deviner et n'a pas d'écran 2) ;
  //   • écran 2 : quand une durée est à révéler, on ne le quitte qu'avec la durée devinée.
  if (pageType === 'comparable_quick_guess') {
    return (
      entry?.response?.seller_serious_competitor === 'no' ||
      entry?.response?.seller_estimated_listing_price != null
    );
  }
  if (pageType === 'comparable_quick_reveal') {
    return (
      entry?.durationKnown === false || entry?.response?.seller_estimated_days_on_market != null
    );
  }
  // MISSION 82 — le vendeur dit son prix avant de voir un concurrent : on ne quitte la
  // page qu'une fois ce prix PERSISTÉ (aucun concurrent atteignable avant, même par l'URL).
  if (pageType === 'seller_perceived_price') {
    return summary?.seller_perceived_property_price != null;
  }
  return true;
}

// MISSION 89 — le vendeur a-t-il répondu quelque chose sur cet écran ? Sert à RETROUVER où le
// rendez-vous s'est arrêté (l'écran qui suit la dernière réponse), jamais à interdire : un
// écran validé sans réponse n'est pas un écran où revenir.
export function livePageHasAnswer(
  pageType: LivePageType,
  entry: LiveNavComparable | null,
  summary: LiveSellerSummary | null,
): boolean {
  const response = entry?.response ?? null;
  switch (pageType) {
    case 'subject_property':
      return summary?.seller_property_confirmed != null;
    case 'seller_perceived_price':
      return summary?.seller_perceived_property_price != null;
    case 'comparable_competition':
      return response?.seller_serious_competitor != null;
    case 'comparable_price':
      return response?.seller_estimated_listing_price != null;
    case 'comparable_price_reveal':
      return response?.seller_price_coherence != null;
    case 'comparable_duration':
      return response?.seller_estimated_days_on_market != null;
    case 'comparable_quick_guess':
      return (
        response?.seller_serious_competitor != null ||
        response?.seller_estimated_listing_price != null
      );
    case 'comparable_quick_reveal':
      return response?.seller_estimated_days_on_market != null;
    case 'dangerous_competitor':
      return summary?.seller_most_dangerous_comparable_id != null;
    case 'seller_revised_price':
      return summary?.seller_revised_property_price != null;
    case 'closing_question':
      return summary?.seller_launch_readiness_last != null;
    default:
      return false;
  }
}
