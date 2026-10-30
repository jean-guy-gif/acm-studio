import { median } from '@/features/comparables/services/calculate-comparable-summary';
import { pricePosition } from '@/features/live-seller/services/price-position';
import { formatEuro } from '@/lib/format';

// Mission 127 — les trois lignes de prix de la dernière page du Point marché, à la même échelle :
//   1. au rendez-vous (prix du rendez-vous des concurrents retenus) ;
//   2. aujourd'hui (prix du jour ; les disparus sortent de la ligne et sont comptés à part) ;
//   3. face aux nouveaux venus (vide ce soir : « Aucun nouveau venu retenu depuis le rendez-vous »).
// Sur chacune : le plus bas, la médiane, le plus haut, le plus dangereux (M110) et le prix retenu
// ensemble. Les phrases sous les lignes sont des faits calculés, jamais une recommandation de prix.
// Pur.

export type PriceLine = {
  // Les prix des concurrents portés par la ligne, du plus bas au plus haut.
  prices: number[];
  lowest: number;
  highest: number;
  median: number;
  // Le prix du plus dangereux sur cette ligne, s'il y est (jamais pour un disparu, ligne 2).
  dangerousPrice: number | null;
  // Le prix retenu ensemble, le même sur les trois lignes.
  subjectPrice: number | null;
  sentence: string | null;
};

export type PriceLineCompetitor = {
  // Mission 127 B — un nouveau venu (retenu après le rendez-vous) ne porte que la ligne 3.
  newcomer?: boolean;
  meetingPrice: number | null;
  currentPrice: number | null;
  // 'unknown' : disparue sans durée connue — hors de la ligne 2, comptée à part, aucune conclusion.
  gone: 'probable_sale' | 'withdrawn' | 'unknown' | null;
  dangerous: boolean;
};

export type GoneCounts = { probableSale: number; withdrawn: number; unknown: number };

export type PriceLines = {
  meeting: PriceLine | null;
  today: PriceLine | null;
  todayGone: GoneCounts;
  newcomers: PriceLine | null;
  newcomersCount: number;
  // L'échelle commune des trois lignes.
  scale: { min: number; max: number } | null;
};

const positive = (value: number | null): value is number =>
  value != null && Number.isFinite(value) && value > 0;

function line(
  prices: number[],
  dangerousPrice: number | null,
  subjectPrice: number | null,
  sentence: string | null,
): PriceLine | null {
  const sorted = prices.filter(positive).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  return {
    prices: sorted,
    lowest: sorted[0],
    highest: sorted[sorted.length - 1],
    median: median(sorted) as number,
    dangerousPrice,
    subjectPrice: positive(subjectPrice) ? subjectPrice : null,
    sentence,
  };
}

const ordinal = (rank: number): string => (rank === 1 ? '1er' : `${rank}e`);
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

// « le moins cher des 6 biens comparés », « le 2e moins cher des 4 biens encore en vente ».
function where(price: number, competitorPrices: number[], of: string): string | null {
  const position = pricePosition(price, competitorPrices);
  if (!position) return null;
  const total = competitorPrices.length + 1;
  switch (position.kind) {
    case 'most_expensive':
      return `le plus cher des ${total} ${of}`;
    case 'cheapest':
      return `le moins cher des ${total} ${of}`;
    case 'among_most_expensive':
      return `parmi les plus chers des ${total} ${of}`;
    case 'among_cheapest':
      return `parmi les moins chers des ${total} ${of}`;
    case 'middle':
      return `dans la moyenne des ${total} ${of}`;
    case 'rank':
      return `le ${ordinal(position.rank)} moins cher des ${total} ${of}`;
  }
}

export function meetingSentence(subjectPrice: number | null, prices: number[]): string | null {
  if (!positive(subjectPrice) || prices.length === 0) return null;
  const place = where(subjectPrice, prices, 'biens comparés');
  if (!place) return null;
  const lowest = Math.min(...prices);
  const count = plural(prices.length, 'concurrent', 'concurrents');
  const lead =
    subjectPrice < lowest
      ? `Au rendez-vous, votre prix retenu était sous le plus bas des ${count}`
      : subjectPrice > Math.max(...prices)
        ? `Au rendez-vous, votre prix retenu était au-dessus du plus haut des ${count}`
        : `Au rendez-vous, votre prix retenu était parmi ceux des ${count}`;
  return `${lead} : ${place}.`;
}

// Un fait calculé, jamais une recommandation : « sous votre prix » compte les prix du jour
// inférieurs ; « passé dessous depuis le rendez-vous » ne compte que ceux qui étaient au niveau ou
// au-dessus du prix retenu au rendez-vous et sont dessous aujourd'hui.
export function todaySentence(
  subjectPrice: number | null,
  stillListed: { meetingPrice: number | null; currentPrice: number | null }[],
  gone: GoneCounts,
): string | null {
  const parts: string[] = [];
  const prices = stillListed.map((item) => item.currentPrice).filter(positive);
  if (positive(subjectPrice) && prices.length > 0) {
    const under = prices.filter((price) => price < subjectPrice).length;
    const crossed = stillListed.filter(
      (item) =>
        positive(item.currentPrice) &&
        item.currentPrice < subjectPrice &&
        item.meetingPrice != null &&
        item.meetingPrice >= subjectPrice,
    ).length;
    const place = where(subjectPrice, prices, 'biens encore en vente');
    const total = plural(prices.length, 'concurrent', 'concurrents');
    const lead =
      under === 0
        ? `Aujourd’hui, aucun des ${total} n’est sous votre prix`
        : `Aujourd’hui, ${under} concurrent${under > 1 ? 's' : ''} sur ${prices.length} ${under > 1 ? 'sont' : 'est'} sous votre prix${
            crossed > 0
              ? `, dont ${crossed} passé${crossed > 1 ? 's' : ''} dessous depuis le rendez-vous`
              : ''
          }`;
    parts.push(place ? `${lead} : vous êtes ${place}.` : `${lead}.`);
  }
  const goneTotal = gone.probableSale + gone.withdrawn + gone.unknown;
  if (goneTotal > 0) {
    const detail = [
      gone.probableSale > 0
        ? plural(gone.probableSale, 'vente probable', 'ventes probables')
        : null,
      gone.withdrawn > 0
        ? plural(gone.withdrawn, 'retirée sans vente', 'retirées sans vente')
        : null,
      gone.unknown > 0
        ? plural(gone.unknown, 'retirée, durée inconnue', 'retirées, durée inconnue')
        : null,
    ]
      .filter(Boolean)
      .join(', ');
    parts.push(
      `${goneTotal > 1 ? `${goneTotal} annonces ont disparu` : '1 annonce a disparu'} : ${detail}.`,
    );
  }
  return parts.length > 0 ? parts.join(' ') : null;
}

export function newcomersSentence(subjectPrice: number | null, prices: number[]): string | null {
  if (prices.length === 0) return null;
  const count = plural(prices.length, 'nouveau venu retenu', 'nouveaux venus retenus');
  if (!positive(subjectPrice)) return `${count} depuis le rendez-vous.`;
  const under = prices.filter((price) => price < subjectPrice).length;
  const over = prices.filter((price) => price > subjectPrice).length;
  const med = median(prices) as number;
  const gap = med - subjectPrice;
  const medianPart =
    gap === 0
      ? 'Leur prix médian est le vôtre'
      : `Leur prix médian est ${formatEuro(Math.abs(gap))} ${gap > 0 ? 'au-dessus' : 'en dessous'} du vôtre`;
  return `${count} depuis le rendez-vous : ${under} ${under > 1 ? 'sont' : 'est'} sous votre prix, ${over} au-dessus. ${medianPart}.`;
}

export const NO_NEWCOMER_LABEL = 'Aucun nouveau venu retenu depuis le rendez-vous';

export function buildPriceLines(
  all_: PriceLineCompetitor[],
  subjectPrice: number | null,
  newcomerPrices: number[] = [],
): PriceLines {
  const competitors = all_.filter((item) => !item.newcomer);
  const dangerous = competitors.find((item) => item.dangerous) ?? null;
  const meetingPrices = competitors.map((item) => item.meetingPrice).filter(positive);
  const meeting = line(
    meetingPrices,
    positive(dangerous?.meetingPrice ?? null) ? (dangerous!.meetingPrice as number) : null,
    subjectPrice,
    meetingSentence(subjectPrice, meetingPrices),
  );
  const stillListed = competitors.filter((item) => item.gone == null);
  const todayPrices = stillListed.map((item) => item.currentPrice).filter(positive);
  const todayGone: GoneCounts = {
    probableSale: competitors.filter((item) => item.gone === 'probable_sale').length,
    withdrawn: competitors.filter((item) => item.gone === 'withdrawn').length,
    unknown: competitors.filter((item) => item.gone === 'unknown').length,
  };
  const today = line(
    todayPrices,
    dangerous && dangerous.gone == null && positive(dangerous.currentPrice)
      ? dangerous.currentPrice
      : null,
    subjectPrice,
    todaySentence(subjectPrice, stillListed, todayGone),
  );
  const newcomers = line(
    newcomerPrices,
    null,
    subjectPrice,
    newcomersSentence(subjectPrice, newcomerPrices.filter(positive)),
  );
  const all = [
    ...meetingPrices,
    ...todayPrices,
    ...newcomerPrices.filter(positive),
    ...(positive(subjectPrice) ? [subjectPrice] : []),
  ];
  return {
    meeting,
    today,
    todayGone,
    newcomers,
    newcomersCount: newcomerPrices.filter(positive).length,
    scale: all.length > 0 ? { min: Math.min(...all), max: Math.max(...all) } : null,
  };
}
