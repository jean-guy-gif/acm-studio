import { guessGap } from '@/features/live-seller/services/guess-gap';
import { launchReadinessLabel } from '@/features/meeting-conclusion/services/launch-readiness';
import { formatEuro, formatPercent } from '@/lib/format';

// Mission 96 — « Ce que le vendeur a dit » : ses réponses du Live, réunies pour le conseiller.
// Pur. Rien n'est inventé ni recalculé à partir d'autre chose : chaque ligne vient d'une réponse
// enregistrée, et une donnée absente ne produit aucune ligne. Jamais côté vendeur ; aucune
// adresse de concurrent n'entre ici (le concurrent se nomme par son libellé neutre, M51).

// Un concurrent tel que le vendeur l'a joué : sa devinette, le prix figé à la révélation
// (null pour un Live d'avant la mission 96) et le prix affiché aujourd'hui.
export type GuessedCompetitor = {
  guess: number | null;
  revealedPrice: number | null;
  currentPrice: number | null;
  // Mission 127 — le prix du rendez-vous figé à la conclusion (null : non relu, source 'current').
  meetingPrice?: number | null;
};

export type GuessSummary = {
  // Concurrents dont on connaît la devinette ET un prix à lui opposer.
  compared: number;
  under: number;
  // Écart moyen des sous-estimations (« de 6 % en moyenne »), mesuré comme dans le Live : en % du
  // prix affiché (M148) ; null si aucune.
  underAveragePercent: number | null;
  over: number;
  overAveragePercent: number | null;
  // Vrai dès qu'un prix révélé manque : la comparaison s'est faite au prix d'aujourd'hui.
  usesCurrentPrices: boolean;
};

const average = (values: number[]): number | null =>
  values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;

// L'écart d'un concurrent est CELUI DU LIVE (`guessGap`, M148) : devinette moins prix affiché, en %
// du prix affiché (il se mesurait en % de la devinette, M96), au dixième. Le conseiller ne lit
// jamais deux pourcentages différents pour la même devinette ; la moyenne porte sur ces écarts-là.
// Une devinette à 0 € ne compte pas (M96).
export function summarizeGuesses(competitors: GuessedCompetitor[]): GuessSummary | null {
  const underGaps: number[] = [];
  const overGaps: number[] = [];
  let compared = 0;
  let usesCurrentPrices = false;
  for (const competitor of competitors) {
    const real = competitor.revealedPrice ?? competitor.currentPrice;
    if (competitor.guess == null || real == null) {
      continue;
    }
    const gap = guessGap(competitor.guess, real);
    if (gap == null) {
      continue;
    }
    const percent = Math.round(Math.abs(gap.percent) * 10) / 10;
    compared += 1;
    if (competitor.revealedPrice == null) {
      usesCurrentPrices = true;
    }
    // Une réponse sous le prix affiché : le vendeur a sous-estimé.
    if (gap.direction === 'below') {
      underGaps.push(percent);
    } else if (gap.direction === 'above') {
      overGaps.push(percent);
    }
  }
  if (compared === 0) {
    return null;
  }
  return {
    compared,
    under: underGaps.length,
    underAveragePercent: average(underGaps),
    over: overGaps.length,
    overAveragePercent: average(overGaps),
    usesCurrentPrices,
  };
}

const competitors = (count: number): string => `${count} concurrent${count > 1 ? 's' : ''}`;
// Au dixième, comme l'écart affiché par le Live.
const averagePercent = (value: number): string => formatPercent(value, { maxDecimals: 1 });

// « Il a sous-estimé 4 concurrents sur 6, de 6 % en moyenne ». Mission 113 — les mêmes mots, à
// la 2e personne, dans la synthèse laissée au vendeur : « Vous avez sous-estimé… ».
export function guessLines(summary: GuessSummary, subject: 'il' | 'vous' = 'il'): string[] {
  const who = subject === 'vous' ? 'Vous avez' : 'Il a';
  const lines: string[] = [];
  if (summary.under > 0 && summary.underAveragePercent != null) {
    lines.push(
      `${who} sous-estimé ${competitors(summary.under)} sur ${summary.compared}, de ${averagePercent(summary.underAveragePercent)} en moyenne`,
    );
  }
  if (summary.over > 0 && summary.overAveragePercent != null) {
    lines.push(
      `${who} surestimé ${competitors(summary.over)} sur ${summary.compared}, de ${averagePercent(summary.overAveragePercent)} en moyenne`,
    );
  }
  if (lines.length === 0) {
    lines.push(`${who} donné le prix affiché de ${competitors(summary.compared)}`);
  }
  return lines;
}

// « Depuis le rendez-vous : N concurrents ont baissé leur prix » — le prix du rendez-vous (M127,
// figé à la conclusion), sinon le prix révélé pendant le Live, face au prix affiché aujourd'hui.
// Sans prix de référence figé, on ne sait pas : rien ne compte.
export function priceDropsSinceMeeting(list: GuessedCompetitor[]): number {
  return list.filter((competitor) => {
    const reference = competitor.meetingPrice ?? competitor.revealedPrice;
    return (
      reference != null && competitor.currentPrice != null && competitor.currentPrice < reference
    );
  }).length;
}

export function priceDropsLabel(count: number): string | null {
  if (count <= 0) {
    return null;
  }
  return count === 1
    ? 'Depuis le rendez-vous\u00a0: 1 concurrent a baissé son prix'
    : `Depuis le rendez-vous\u00a0: ${count} concurrents ont baissé leur prix`;
}

export type SellerSaidInput = {
  sellerPerceivedPrice: number | null;
  sellerRevisedPrice: number | null;
  commercializationPrice: number | null;
  competitors: GuessedCompetitor[];
  // Le concurrent le plus dangereux choisi par le vendeur : son libellé neutre et son prix.
  dangerous: { label: string; revealedPrice: number | null; currentPrice: number | null } | null;
  launchReadinessFirst: number | null;
  launchReadinessLast: number | null;
  launchReadinessMissing: string | null;
  // « Durée du Live : 41 min » (M95), déjà formulée ; null si elle n'a pas été mesurée.
  liveDuration: string | null;
  // Mission 133 — les acquéreurs prêts montrés pendant le Live ; null s'ils ne l'ont pas été.
  buyersShownCount?: number | null;
};

export type SellerSaid = {
  // « Au début : … », « Après avoir vu le marché : … », « Prix retenu : … » — les seuls connus.
  path: { label: string; value: string }[];
  guesses: string[];
  // « face aux prix affichés aujourd'hui », quand un prix révélé manque.
  guessesNote: string | null;
  dangerous: string | null;
  readiness: string | null;
  readinessMissing: string | null;
  liveDuration: string | null;
  // « 7 acquéreurs montrés au rendez-vous ».
  buyersShown: string | null;
  priceDrops: string | null;
};

export function buyersShownLabel(count: number | null | undefined): string | null {
  return count != null && count > 0 ? `${count} acquéreurs montrés au rendez-vous` : null;
}

export const CURRENT_PRICES_NOTE = 'face aux prix affichés aujourd’hui';

// Null quand le vendeur n'a rien dit : le bloc ne s'affiche pas.
export function buildSellerSaid(input: SellerSaidInput): SellerSaid | null {
  const path = [
    { label: 'Au début', price: input.sellerPerceivedPrice },
    { label: 'Après avoir vu le marché', price: input.sellerRevisedPrice },
    { label: 'Prix retenu', price: input.commercializationPrice },
  ].flatMap((step) =>
    step.price == null ? [] : [{ label: step.label, value: formatEuro(step.price) }],
  );

  const summary = summarizeGuesses(input.competitors);

  let dangerous: string | null = null;
  if (input.dangerous) {
    const price = input.dangerous.revealedPrice ?? input.dangerous.currentPrice;
    const priceText =
      price == null
        ? null
        : input.dangerous.revealedPrice != null
          ? formatEuro(price)
          : `${formatEuro(price)} (prix affiché aujourd’hui)`;
    dangerous = [input.dangerous.label, priceText].filter(Boolean).join(' — ');
  }

  const readiness = launchReadinessLabel(input.launchReadinessFirst, input.launchReadinessLast);
  const said: SellerSaid = {
    path,
    guesses: summary ? guessLines(summary) : [],
    guessesNote: summary?.usesCurrentPrices ? CURRENT_PRICES_NOTE : null,
    dangerous,
    readiness,
    readinessMissing: input.launchReadinessMissing?.trim() || null,
    liveDuration: input.liveDuration,
    buyersShown: buyersShownLabel(input.buyersShownCount),
    priceDrops: priceDropsLabel(priceDropsSinceMeeting(input.competitors)),
  };

  const empty =
    said.path.length === 0 &&
    said.guesses.length === 0 &&
    said.dangerous == null &&
    said.readiness == null &&
    said.readinessMissing == null &&
    said.liveDuration == null &&
    said.buyersShown == null &&
    said.priceDrops == null;
  return empty ? null : said;
}
