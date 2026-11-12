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
