import { BUDGET_MARGIN_PERCENT } from '@/features/ideal-properties/services/ideal-criteria';
import type { WhyPill } from '@/features/ideal-properties/services/categorize-ideal';
import { SOFT_SHORT_LABELS } from '@/features/soft-ranking/services/judgments';
import type { SoftReasons } from '@/features/soft-ranking/types';
import { formatEuro } from '@/lib/format';

// La refonte, lot C (maquettes REFONTE-3, 5 et 6) — « Pourquoi celui-ci pour eux », en pastilles,
// dans ses mots. Les critères de la fiche que le bien satisfait viennent du classement
// (`categorize-ideal.ts`, `why`) ; ici, ce que l'annonce dit de ce qui compte pour eux (M151 B) et
// la pastille du budget. Pur. Jamais un pourcentage, jamais une citation de l'annonce (elle peut
// porter une adresse) : le critère, dans leurs mots.

// « « au calme » dans l'annonce » : dit clairement. Ce qui n'est dit qu'avec réserve, par la seule
// étiquette du portail, ou que seules les photos montrent, se dit « à vérifier ». Le contraire, ou
// rien, ne fait pas une raison. En classement simplifié, les mots trouvés dans l'annonce.
export function softWhyPills(reasons: SoftReasons | undefined): WhyPill[] {
  if (reasons == null || 'noText' in reasons) return [];
  if ('mentions' in reasons) {
    return reasons.mentions.map((word) => ({
      tone: 'said',
      label: `«\u00a0${word}\u00a0» dans l’annonce`,
    }));
  }
  return reasons.judgments.flatMap((judgment): WhyPill[] => {
    const words = SOFT_SHORT_LABELS[judgment.key];
    if (judgment.verdict === 'clearly' && !judgment.toVerify) {
      return [{ tone: 'said', label: `«\u00a0${words}\u00a0» dans l’annonce` }];
    }
    const toVerify =
      judgment.verdict === 'clearly' ||
      judgment.verdict === 'reserve' ||
      (judgment.verdict !== 'contrary' && judgment.photos?.verdict === 'shown');
    return toVerify ? [{ tone: 'said', label: `«\u00a0${words}\u00a0»\u00a0: à vérifier` }] : [];
  });
}

// Les raisons d'un bien, dans l'ordre où elles se lisent : ses indispensables (★) satisfaits, ce que
// l'annonce dit de ce qui compte pour eux, puis ses autres souhaits satisfaits.
export function whyPills(met: readonly WhyPill[], reasons: SoftReasons | undefined): WhyPill[] {
  return [
    ...met.filter((pill) => pill.tone === 'must'),
    ...softWhyPills(reasons),
    ...met.filter((pill) => pill.tone !== 'must'),
  ];
}

// La pastille du prix : verte sous le budget, orange au-dessus — jamais rouge (M122 B). Les mots
// sont ceux des cartes d'aujourd'hui (« à négocier » jusqu'à +5 %, « Budget dépassé » au-delà).
export function budgetPill(
  price: number | null,
  budgetMax: number | null,
): { tone: 'good' | 'watch'; label: string } | null {
  if (price == null || budgetMax == null) return null;
  if (price <= budgetMax) {
    return {
      tone: 'good',
      label: price === budgetMax ? 'Au budget' : `${formatEuro(budgetMax - price)} sous le budget`,
    };
  }
  const over = formatEuro(price - budgetMax);
  return {
    tone: 'watch',
    label:
      price <= budgetMax * (1 + BUDGET_MARGIN_PERCENT / 100)
        ? `${over} au-dessus du budget, à négocier`
        : `Budget dépassé de ${over}`,
  };
}

// « 8 critères sur 8 » — jamais un pourcentage ; rien quand la fiche n'a aucun critère renseigné.
export function criteriaCount(ok: number, total: number): string | null {
  return total > 0 ? `${ok} critère${ok > 1 ? 's' : ''} sur ${total}` : null;
}
