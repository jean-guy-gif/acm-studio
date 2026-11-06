import { NO_REASONS, type ItemAnswer, type NoReason } from '@/features/buyer-deck/types';
import type { BuyerCriterion, BuyerInput } from '@/features/buyers/types';
import { communeKey } from '@/features/competitor-search/utils/commune-name';
import { formatEuro, formatSquareMeters } from '@/lib/format';

// Mission 122 — les réponses nourrissent la fiche, sans la changer : quand une même raison de
// « Pas pour moi » revient sur deux biens DIFFÉRENTS, toutes sélections confondues, la fiche
// propose un changement que le conseiller accepte ou ignore (décision de Jean-Guy, 25/10). Rien ne
// s'applique sans son clic ; une suggestion ignorée ne revient plus ; elle disparaît d'elle-même
// quand le critère est déjà au niveau proposé. Service pur.

// Une réponse relue, avec ce qu'il faut du bien pour chiffrer une proposition. `bienKey` désigne
// le bien lui-même (source + référence) : le même bien dans deux sélections compte une fois.
export type AnswerForSuggestion = {
  bienKey: string;
  answer: ItemAnswer;
  reasons: NoReason[];
  answeredAt: string;
  surfaceArea: number | null;
  price: number | null;
  // Mission 135 — la commune du bien refusé, pour « Le quartier ».
  city?: string | null;
};

// Le changement de fiche qu'une suggestion propose : uniquement des champs de la fiche.
export type BuyerPatch = {
  surfaceMin?: number;
  outdoor?: true;
  parking?: true;
  worksAccepted?: false;
  budgetMax?: number;
  budgetIdeal?: number | null;
  mustHave?: BuyerCriterion[];
  // Mission 135 — les communes de la fiche, sans celle que ses refus écartent.
  cities?: string[];
};

export type AnswerSuggestion = {
  kind: NoReason;
  count: number;
  text: string;
  // null : un constat seul (le quartier, les photos, autre) — rien à changer sur la fiche.
  patch: BuyerPatch | null;
};

const REFUSED: Record<NoReason, string> = {
  district: 'Le quartier a été refusé',
  surface: 'La surface a été refusée',
  outdoor: 'L’extérieur a été refusé',
  parking: 'Le parking a été refusé',
  price: 'Le prix a été refusé',
  works: 'Les travaux ont été refusés',
  photos: 'Les photos ont été refusées',
  other: 'La raison « Autre » a été donnée',
};

const TIMES = ['', 'une fois', 'deux fois', 'trois fois', 'quatre fois', 'cinq fois'];
const times = (count: number): string => TIMES[count] ?? `${count} fois`;

// La dernière réponse donnée à chaque bien (le même bien peut avoir été présenté puis revu).
function latestByBien(answers: AnswerForSuggestion[]): AnswerForSuggestion[] {
  const latest = new Map<string, AnswerForSuggestion>();
  for (const answer of answers) {
    const known = latest.get(answer.bienKey);
    if (!known || answer.answeredAt > known.answeredAt) latest.set(answer.bienKey, answer);
  }
  return [...latest.values()];
}

const withMust = (buyer: BuyerInput, criterion: BuyerCriterion): BuyerCriterion[] =>
  buyer.mustHave.includes(criterion) ? buyer.mustHave : [...buyer.mustHave, criterion];

// La proposition d'une raison, ou null quand le critère est déjà au niveau proposé (la suggestion
// disparaît alors d'elle-même). `undefined` : un constat sans proposition.
function proposal(
  kind: NoReason,
  buyer: BuyerInput,
  refused: AnswerForSuggestion[],
): { patch: BuyerPatch; text: string } | null | undefined {
  switch (kind) {
    case 'surface': {
      const surfaces = refused
        .map((answer) => answer.surfaceArea)
        .filter((value): value is number => value != null);
      if (surfaces.length === 0) return undefined;
      // La plus grande surface refusée, à la dizaine au-dessus : 68 m² → 70 m², 70 m² → 80 m².
      const value = (Math.floor(Math.max(...surfaces) / 10) + 1) * 10;
      if (buyer.surfaceMin != null && buyer.surfaceMin >= value) return null;
      return {
        patch: { surfaceMin: value },
        text: `passer la surface minimum à ${formatSquareMeters(value)} ?`,
      };
    }
    case 'outdoor':
      if (buyer.outdoor === true && buyer.mustHave.includes('outdoor')) return null;
      return {
        patch: { outdoor: true, mustHave: withMust(buyer, 'outdoor') },
        text: 'rendre l’extérieur indispensable ?',
      };
    case 'parking':
      if (buyer.parking === true && buyer.mustHave.includes('parking')) return null;
      return {
        patch: { parking: true, mustHave: withMust(buyer, 'parking') },
        text: 'rendre le parking indispensable ?',
      };
    case 'works':
      if (buyer.worksAccepted === false) return null;
      return { patch: { worksAccepted: false }, text: 'passer « Travaux acceptés » à non ?' };
    case 'price': {
      const prices = refused
        .map((answer) => answer.price)
        .filter((value): value is number => value != null && value > 0);
      if (prices.length === 0) return undefined;
      // Sous le plus bas prix refusé, au millier en dessous.
      const value = Math.floor((Math.min(...prices) - 1) / 1000) * 1000;
      if (value <= 0) return undefined;
      if (buyer.budgetMax != null && buyer.budgetMax <= value) return null;
      return {
        patch: {
          budgetMax: value,
          // Le budget idéal ne dépasse jamais le plafond (M117).
          ...(buyer.budgetIdeal != null && buyer.budgetIdeal > value ? { budgetIdeal: value } : {}),
        },
        text: `passer le budget plafond à ${formatEuro(value)} ?`,
      };
    }
    // Mission 135 (décision de Jean-Guy, 06/11) — « Le quartier » : la commune de la fiche qui porte
    // au moins deux de ces refus se propose au retrait, écrite comme sur la fiche ; jamais la
    // dernière commune ; des communes différentes ne donnent que le constat.
    case 'district': {
      if (buyer.cities.length < 2) return undefined;
      const counts = new Map<string, number>();
      for (const answer of refused) {
        const key = answer.city ? communeKey(answer.city) : null;
        if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      const [key, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
      if (!key || count < 2) return undefined;
      const city = buyer.cities.find((entry) => communeKey(entry) === key);
      if (!city) return undefined;
      return {
        patch: { cities: buyer.cities.filter((entry) => communeKey(entry) !== key) },
        text: `retirer ${city} de sa recherche ?`,
      };
    }
    default:
      return undefined;
  }
}

// Mission 135 — ce que l'ajustement a changé, écrit par le serveur pour « Ce qui s'est passé » :
// « Budget plafond : 1 650 000 € → 1 579 000 € ». 200 caractères au plus.
export function adjustmentSummary(buyer: BuyerInput, patch: BuyerPatch): string {
  const parts: string[] = [];
  if (patch.budgetMax !== undefined) {
    parts.push(
      `Budget plafond : ${buyer.budgetMax != null ? `${formatEuro(buyer.budgetMax)} → ` : ''}${formatEuro(patch.budgetMax)}`,
    );
  }
  if (patch.surfaceMin !== undefined) {
    parts.push(
      `Surface minimum : ${buyer.surfaceMin != null ? `${formatSquareMeters(buyer.surfaceMin)} → ` : ''}${formatSquareMeters(patch.surfaceMin)}`,
    );
  }
  if (patch.cities !== undefined) {
    const removed = buyer.cities.filter((city) => !patch.cities!.includes(city));
    parts.push(`Communes : ${removed.join(', ')} retirée${removed.length > 1 ? 's' : ''}`);
  }
  if (patch.outdoor !== undefined) parts.push('Extérieur indispensable');
  if (patch.parking !== undefined) parts.push('Parking indispensable');
  if (patch.worksAccepted !== undefined) parts.push('Travaux acceptés : non');
  const text = parts.join(' · ') || 'Recherche ajustée';
  return text.length > 200 ? `${text.slice(0, 199)}…` : text;
}

export function answerSuggestions(
  buyer: BuyerInput,
  ignored: readonly string[],
  answers: AnswerForSuggestion[],
): AnswerSuggestion[] {
  const refusals = latestByBien(answers).filter((answer) => answer.answer === 'no');
  const suggestions: AnswerSuggestion[] = [];
  for (const kind of NO_REASONS) {
    if (ignored.includes(kind)) continue;
    const refused = refusals.filter((answer) => answer.reasons.includes(kind));
    if (refused.length < 2) continue;
    const proposed = proposal(kind, buyer, refused);
    if (proposed === null) continue;
    const head = `${REFUSED[kind]} ${times(refused.length)}`;
    suggestions.push({
      kind,
      count: refused.length,
      text: proposed ? `${head} : ${proposed.text}` : `${head}.`,
      patch: proposed ? proposed.patch : null,
    });
  }
  return suggestions;
}
