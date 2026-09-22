import { candidateSignature } from '@/features/competitor-search/services/extract-search-results';
import {
  applyLearning,
  type LearnedPreferences,
} from '@/features/competitor-search/services/learn-from-decisions';
import { scoreCandidate } from '@/features/competitor-search/services/score-candidate';
import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';
import { typesConflict } from '@/features/competitor-search/utils/property-type-guard';
import type {
  CompetitorSearchCriteria,
  PortalSearchResult,
  RankedCandidate,
} from '@/features/competitor-search/types';

// MISSION 36/50 — le classement, isolé et pur : on rassemble les annonces des quatre
// portails, on les note par ressemblance, on trie. Aucune n'est retirée — une annonce
// éloignée descend, elle ne disparaît pas (le conseiller tranche).
//
// Déduplication CROISÉE entre portails : le même bien se retrouve sur plusieurs
// portails avec des URLs différentes mais la même signature prix+surface+pièces+
// commune (§6). Première occurrence gardée.
export function rankCandidates(
  criteria: CompetitorSearchCriteria,
  portals: PortalSearchResult[],
  preferences: LearnedPreferences,
): RankedCandidate[] {
  const ranked: RankedCandidate[] = [];
  const seen = new Set<string>();
  const seenSignatures = new Set<string>();

  // Le type du bien vendeur est saisi en TEXTE LIBRE FRANÇAIS (« appartement ») ; on
  // le ramène au même vocabulaire que les cartes (canonique) AVANT de comparer, sinon
  // la garde compare « appartement » à « apartment » et ne protège rien.
  const subjectType = normalizePropertyType(criteria.propertyType);
  const scoringCriteria = { ...criteria, propertyType: subjectType };

  for (const portal of portals) {
    for (const candidate of portal.candidates) {
      if (seen.has(candidate.url)) {
        continue;
      }
      const signature = candidateSignature(candidate);
      if (signature != null && seenSignatures.has(signature)) {
        continue;
      }
      // §5 point 8 — le type de bien n'est JAMAIS relâché : un appartement ne
      // concurrence pas une maison. Un type DIFFÉRENT du bien vendeur n'entre pas
      // dans la liste, quel que soit son score (même garde partagée que la recherche
      // acheteur). Type inconnu (non publié ou bien vendeur sans type) → on garde, on
      // n'exclut pas pour une absence.
      if (typesConflict(subjectType, candidate.propertyType)) {
        continue;
      }
      seen.add(candidate.url);
      if (signature != null) {
        seenSignatures.add(signature);
      }
      let host = '';
      try {
        host = new URL(candidate.url).hostname.toLowerCase();
      } catch {
        continue;
      }
      const facts = {
        price: candidate.price,
        surfaceArea: candidate.surfaceArea,
        roomsCount: candidate.roomsCount,
        // La commune est lue SUR LA CARTE : une commune voisine sort en « Autre
        // commune » au lieu d'être masquée (§6). Le type est lu sur la carte (§5) ;
        // le quartier fiable n'arrive qu'après l'enrichissement de la fiche.
        city: candidate.city ?? criteria.city,
        district: null,
        propertyType: candidate.propertyType,
      };
      const base = scoreCandidate(scoringCriteria, facts);
      const adjusted = applyLearning(
        base,
        { ...facts, listingUrl: candidate.url, listingHost: host },
        preferences,
      );
      ranked.push({
        candidate,
        portal: portal.portal,
        portalLabel: portal.label,
        host,
        score: adjusted.score,
        strengths: base.strengths,
        weaknesses: base.weaknesses,
        learnedPenalties: adjusted.penalties,
        alreadyJudged: adjusted.alreadyJudged,
      });
    }
  }

  // Les annonces déjà tranchées passent derrière : le conseiller les voit, mais après
  // celles sur lesquelles il n'a pas encore d'avis.
  ranked.sort((a, b) => {
    const judgedA = a.alreadyJudged == null ? 0 : 1;
    const judgedB = b.alreadyJudged == null ? 0 : 1;
    return judgedA !== judgedB ? judgedA - judgedB : b.score - a.score;
  });

  return ranked;
}
