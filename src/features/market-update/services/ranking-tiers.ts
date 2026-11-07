import { FRENCH_TEXTS } from '@/lib/client-texts/fr';

// Mission 129 — la couleur d'une place dans le classement, par tiers (règle de Jean-Guy, 30/10) :
// rang ≤ ⌈N/3⌉ vert (pas de problème), rang ≤ ⌈2N/3⌉ orange (attention), au-delà rouge (danger),
// N étant le nombre de biens classés, vendeur compris. 9 biens : 1-3 / 4-6 / 7-9 ; 8 : 1-3 / 4-6 /
// 7-8 ; 6 : 1-2 / 3-4 / 5-6. Pur.

export type RankingTier = 'green' | 'orange' | 'red';

export function tierOf(rank: number, total: number): RankingTier {
  if (total <= 0 || rank <= Math.ceil(total / 3)) return 'green';
  if (rank <= Math.ceil((2 * total) / 3)) return 'orange';
  return 'red';
}

// Mission 140 — les mots vivent dans les textes du client ; ces noms gardent le français.
export const TIER_WORDS: Record<RankingTier, string> =
  FRENCH_TEXTS.documents.marketUpdate.ranking.words;

export const TIER_LEGEND: Record<RankingTier, string> =
  FRENCH_TEXTS.documents.marketUpdate.ranking.legend;
