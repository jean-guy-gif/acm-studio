import type { IdealCategorization } from '@/features/ideal-properties/services/categorize-ideal';
import { IDEAL_CATEGORIES } from '@/features/ideal-properties/types';
import { orderBySoftScore, softScore } from '@/features/soft-ranking/services/judgments';
import type { SoftJudgment } from '@/features/soft-ranking/types';

// Mission 151 (partie B) — ce qui compte pour eux range les biens À L'INTÉRIEUR de chaque catégorie
// de la M118, après elle : aucun bien ne change de catégorie, aucun n'est écarté, aucun n'est
// ajouté (Jean-Guy, 12/11). Le classement d'un bien se lit par le lien de son annonce. Modifie la
// répartition reçue, en place.
export function rankCategorized(
  categorized: IdealCategorization,
  byKey: Readonly<Record<string, SoftJudgment[]>>,
): IdealCategorization {
  for (const category of IDEAL_CATEGORIES) {
    categorized.byCategory[category] = orderBySoftScore(categorized.byCategory[category], (entry) =>
      softScore(byKey[entry.candidate.url]),
    );
  }
  return categorized;
}

// Lancement, mission 9 — les biens les mieux classés, dont les photos sont lues : les catégories
// dans leur ordre (M118), le score du texte à l'intérieur (comme `rankCategorized`), et seulement
// les biens du marché qui ont une photo. Les photos sont celles de la recherche, dans leur ordre.
// Ne modifie rien. Pur.
export function topPhotoPicks(
  categorized: IdealCategorization,
  byKey: Readonly<Record<string, SoftJudgment[]>>,
  max: number,
  perListing: number,
): { key: string; urls: string[] }[] {
  return IDEAL_CATEGORIES.flatMap((category) =>
    orderBySoftScore(categorized.byCategory[category], (entry) =>
      softScore(byKey[entry.candidate.url]),
    ),
  )
    .map(({ candidate }) => ({
      key: candidate.url,
      urls: candidate.photoUrls.slice(0, perListing),
    }))
    .filter((pick) => pick.urls.length > 0)
    .slice(0, max);
}
