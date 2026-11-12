import {
  BUYER_SOFT_CRITERIA,
  BUYER_SOFT_CRITERION_LABELS,
  type BuyerSoftCriterionKey,
} from '@/features/buyers/types';
import type {
  RankingListing,
  SoftJudgment,
  SoftRanking,
  SoftReasons,
  SoftVerdict,
} from '@/features/soft-ranking/types';

// Mission 151 (partie B) — le jugement de ce qui compte pour eux, gardé au serveur comme la mesure
// l'a validé (calme 73/73, cachet 12/12, citations 69/69 le 12/11) : une citation qui ne se trouve
// pas mot pour mot dans l'annonce (accents et espaces près) fait tomber le jugement à « n'en dit
// rien » ; une annonce absente de la réponse est « non lue », jamais « rien » (M98). Le score ne
// range qu'à l'intérieur d'une catégorie : il ne change jamais un bien de catégorie et n'en écarte
// aucun (Jean-Guy, 12/11). Pur.

const MODEL_VERDICTS: Record<string, SoftVerdict> = {
  clairement: 'clearly',
  reserve: 'reserve',
  rien: 'nothing',
  contraire: 'contrary',
};

// Les mêmes règles que le barème de la mesure : casse, apostrophes, guillemets et espaces près.
export const squash = (value: string): string =>
  value
    .normalize('NFC')
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[«»"“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export const QUOTE_MAX = 240;

function verified(listing: RankingListing, quote: unknown): string | null {
  if (typeof quote !== 'string') return null;
  const trimmed = quote.trim();
  if (!trimmed || trimmed.length > QUOTE_MAX) return null;
  const haystack = squash(`${listing.text} ${listing.tags.join(' ')}`);
  return haystack.includes(squash(trimmed)) ? trimmed : null;
}

// Une citation qui contient une adresse (un numéro et un nom de voie) n'est jamais gardée : le
// jugement reste, sans elle (décision de Jean-Guy, 12/11) — le texte d'une annonce cite parfois
// l'adresse du propriétaire.
const STREET =
  /\b\d{1,4}\s*(?:bis|ter)?\s*,?\s+(?:rue|avenue|av\.?|boulevard|bd|chemin|ch\.?|route|rte|all[ée]e|impasse|imp\.?|place|pl\.?|quai|cours|passage|traverse|mont[ée]e|lotissement|r[ée]sidence|square|sentier|voie|corniche|promenade|esplanade|hameau|lieu-dit)\b/i;
export function citesAnAddress(quote: string): boolean {
  return STREET.test(quote.normalize('NFC'));
}
const withoutAddress = (quote: string | null): string | null =>
  quote != null && citesAnAddress(quote) ? null : quote;

// La réponse du modèle, relue : seulement les annonces demandées (par leur numéro d'appel), les
// critères de la fiche, des verdicts connus et des citations vérifiées. `ids` : numéro → bien.
export function guardJudgments(
  raw: unknown,
  ids: ReadonlyMap<string, RankingListing>,
  criteria: readonly BuyerSoftCriterionKey[],
): Map<string, SoftJudgment[]> {
  const answered = new Map<string, SoftJudgment[]>();
  const annonces = (raw as { annonces?: unknown } | null)?.annonces;
  if (!Array.isArray(annonces)) return answered;
  for (const item of annonces) {
    const id = (item as { id?: unknown })?.id;
    const listing = typeof id === 'string' ? ids.get(id) : undefined;
    if (!listing || answered.has(listing.key)) continue;
    const said = new Map<BuyerSoftCriterionKey, SoftJudgment>();
    const jugements = (item as { jugements?: unknown }).jugements;
    for (const one of Array.isArray(jugements) ? jugements : []) {
      const j = one as Record<string, unknown>;
      const key = BUYER_SOFT_CRITERIA.find((criterion) => criterion === j.critere);
      if (!key || !criteria.includes(key) || said.has(key)) continue;
      let verdict = typeof j.verdict === 'string' ? MODEL_VERDICTS[j.verdict] : undefined;
      if (!verdict) continue;
      const quote = verdict === 'nothing' ? null : verified(listing, j.citation);
      const counterQuote = verdict === 'reserve' ? verified(listing, j.contre_citation) : null;
      // Une citation absente de l'annonce fait tomber le jugement (les deux, pour une réserve).
      if (verdict !== 'nothing' && quote == null) verdict = 'nothing';
      if (verdict === 'reserve' && counterQuote == null) verdict = 'nothing';
      said.set(key, {
        key,
        verdict,
        quote: verdict === 'nothing' ? null : withoutAddress(quote),
        counterQuote: verdict === 'reserve' ? withoutAddress(counterQuote) : null,
        toVerify: verdict === 'clearly' && j.a_verifier === true,
      });
    }
    // Un critère que la réponse a sauté n'est pas lu : jamais « rien ».
    answered.set(
      listing.key,
      criteria.map((key) => said.get(key) ?? unread(key)),
    );
  }
  return answered;
}

export const unread = (key: BuyerSoftCriterionKey): SoftJudgment => ({
  key,
  verdict: 'unread',
  quote: null,
  counterQuote: null,
  toVerify: false,
});

// Le score d'un bien (Jean-Guy, 12/11) : clairement 2, avec réserve 1, rien ou non lu 0, le
// contraire −2, additionnés sur les critères de la fiche.
const POINTS: Record<SoftVerdict, number> = {
  clearly: 2,
  reserve: 1,
  nothing: 0,
  unread: 0,
  contrary: -2,
};
export function softScore(judgments: readonly SoftJudgment[] | undefined): number {
  return (judgments ?? []).reduce((sum, judgment) => sum + POINTS[judgment.verdict], 0);
}

// L'ordre à l'intérieur d'une catégorie : le score d'abord, puis l'ordre d'avant (le %, puis le
// prix, M71, M118). Ne retire rien, n'ajoute rien.
export function orderBySoftScore<T>(items: readonly T[], scoreOf: (item: T) => number): T[] {
  return items
    .map((item, index) => ({ item, index, score: scoreOf(item) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ item }) => item);
}

// Une liste déjà rangée par groupes (les catégories de la M118, les groupes du rapprochement :
// mandats, vendeurs à relancer, concurrents) : le score ne range qu'à l'intérieur de chaque groupe,
// les groupes gardent leur ordre et aucun bien ne change de groupe (Jean-Guy, 12/11).
export function orderWithinGroups<T>(
  items: readonly T[],
  groupOf: (item: T) => string,
  scoreOf: (item: T) => number,
): T[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const group = groupOf(item);
    groups.set(group, [...(groups.get(group) ?? []), item]);
  }
  return [...groups.values()].flatMap((members) => orderBySoftScore(members, scoreOf));
}

// --- le classement simplifié : les mots trouvés, sans jugement --------------------------------

const fold = (value: string): string =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, "'");

// Les mots que la forme simplifiée cherche, par critère, tels qu'ils s'affichent.
export const SOFT_WORDS: Record<BuyerSoftCriterionKey, readonly string[]> = {
  calme: ['calme', 'tranquille', 'paisible', 'quiétude', 'sans nuisance', 'impasse'],
  sans_vis_a_vis: ['sans vis-à-vis', 'aucun vis-à-vis', 'pas de vis-à-vis'],
  cachet: ['cachet', 'caractère', 'poutres', 'pierres', 'moulures', 'authentique'],
  lumineux: ['lumineux', 'lumineuse', 'lumière', 'baigné de soleil'],
  vue: ['vue mer', 'vue dégagée', 'vue panoramique', 'vue imprenable', 'vue sur'],
  plain_pied: ['plain-pied', 'plain pied'],
  traversant: ['traversant', 'double exposition'],
  commerces_ecoles_a_pied: ['commerces à pied', 'écoles à pied', 'tout à pied', 'à pied'],
  jardin_sans_entretien: ["facile d'entretien", 'sans entretien', "peu d'entretien"],
  pret_a_vivre: [
    'aucuns travaux',
    'aucun travaux',
    'aucun travail',
    'refait à neuf',
    'entièrement rénové',
    'prêt à vivre',
    'sans travaux',
  ],
};

export function softMentions(
  listing: Pick<RankingListing, 'text' | 'tags'>,
  criteria: readonly BuyerSoftCriterionKey[],
): string[] {
  const haystack = ` ${fold(`${listing.text} ${listing.tags.join(' ')}`).replace(/[^a-z0-9'-]+/g, ' ')} `;
  const found: string[] = [];
  for (const key of criteria) {
    const word = SOFT_WORDS[key].find((candidate) =>
      haystack.includes(
        ` ${fold(candidate)
          .replace(/[^a-z0-9'-]+/g, ' ')
          .trim()} `,
      ),
    );
    if (word && !found.includes(word)) found.push(word);
  }
  return found;
}

// --- ce que la carte dit (planche 4) ---------------------------------------------------------

// Une citation non gardée : elle citait une adresse, ou elle a été effacée au bout de 3 ans.
const WITHHELD = '(citation non gardée)';

export type WhyRow = { mark: '✓' | '≈' | '?' | '✗'; label: string; text: string };

export function whyRows(judgments: readonly SoftJudgment[]): WhyRow[] {
  return judgments.map((judgment) => {
    const label = BUYER_SOFT_CRITERION_LABELS[judgment.key];
    switch (judgment.verdict) {
      case 'clearly':
        return {
          mark: '✓',
          label,
          text:
            judgment.quote == null
              ? `l’annonce le dit ${WITHHELD}`
              : judgment.toVerify
                ? `l’étiquette du portail dit « ${judgment.quote} » · à vérifier`
                : `« ${judgment.quote} »`,
        };
      case 'reserve':
        return {
          mark: '≈',
          label,
          text:
            judgment.quote == null || judgment.counterQuote == null
              ? `avec réserve ${WITHHELD}`
              : `avec réserve : « ${judgment.quote} » mais « ${judgment.counterQuote} »`,
        };
      case 'contrary':
        return {
          mark: '✗',
          label,
          text:
            judgment.quote == null
              ? `le contraire ${WITHHELD}`
              : `le contraire : « ${judgment.quote} »`,
        };
      case 'unread':
        return { mark: '?', label, text: 'l’annonce n’a pas pu être lue' };
      default:
        return { mark: '?', label, text: 'l’annonce n’en dit rien' };
    }
  });
}

// Une annonce qui ne dit rien de ce qui compte pour eux se résume en une ligne (planche 4).
export function saysNothing(judgments: readonly SoftJudgment[]): boolean {
  return judgments.every((judgment) => judgment.verdict === 'nothing');
}

export function mentionsLine(mentions: readonly string[]): string {
  return mentions.length > 0
    ? `L’annonce mentionne ${mentions.map((word) => `« ${word} »`).join(', ')}`
    : 'L’annonce ne mentionne aucun de leurs mots';
}

// « Pourquoi 1er », « Pourquoi 2e ».
export const whyTitle = (rank: number): string => `Pourquoi ${rank}${rank === 1 ? 'er' : 'e'}`;

// Les critères en quelques mots, pour le bandeau (« au calme, sans vis-à-vis, du cachet »).
export const SOFT_SHORT_LABELS: Record<BuyerSoftCriterionKey, string> = {
  calme: 'au calme',
  sans_vis_a_vis: 'sans vis-à-vis',
  cachet: 'du cachet',
  lumineux: 'lumineux',
  vue: 'une vue',
  plain_pied: 'de plain-pied',
  traversant: 'traversant',
  commerces_ecoles_a_pied: 'commerces et écoles à pied',
  jardin_sans_entretien: 'un jardin sans gros entretien',
  pret_a_vivre: 'prêt à vivre',
};

// Le classement reçu, bien par bien, sous la forme que l'écran et la veille gardent.
export function reasonsOfRanking(ranking: SoftRanking): Record<string, SoftReasons> {
  return ranking.mode === 'full'
    ? Object.fromEntries(
        Object.entries(ranking.byKey).map(([key, judgments]) => [key, { judgments }]),
      )
    : Object.fromEntries(
        Object.entries(ranking.byKey).map(([key, mentions]) => [key, { mentions }]),
      );
}

// La raison du rang en une ligne, pour la fiche complète (M152 B) : « Ce qui compte pour eux :
// ✓ Au calme, ? Une vue ».
export function whySummary(reasons: SoftReasons | undefined): string | null {
  if (reasons == null) return null;
  if ('noText' in reasons) return 'Ce qui compte pour eux : aucun texte d’annonce à lire';
  if ('mentions' in reasons) return `Ce qui compte pour eux : ${mentionsLine(reasons.mentions)}`;
  if (reasons.judgments.length === 0) return null;
  return `Ce qui compte pour eux : ${whyRows(reasons.judgments)
    .map((row) => `${row.mark} ${row.label}`)
    .join(', ')}`;
}
