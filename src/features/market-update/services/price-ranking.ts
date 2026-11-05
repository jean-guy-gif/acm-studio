import type {
  MarketUpdateCompetitor,
  MarketUpdateSummary,
} from '@/features/market-update/services/market-update-summary';
import {
  tierOf,
  TIER_WORDS,
  type RankingTier,
} from '@/features/market-update/services/ranking-tiers';
import { formatEuro, formatPercent } from '@/lib/format';

// Mission 129 — « Où en est votre prix » devient un classement (maquette v2 validée par Jean-Guy) :
// le verdict, de la couleur de la place actuelle ; trois étapes (au rendez-vous → aujourd'hui →
// avec les nouveaux venus) ; le classement d'aujourd'hui, du moins cher au plus cher, nouveaux
// venus compris, disparus exclus. Tout se recalcule depuis le point figé (M127) : rien de plus
// n'est écrit. À égalité de prix, le vendeur prend le meilleur rang. Pur.

export type RankedItem = { id: string; price: number; position: number };

export type RankingStep = {
  rank: number;
  total: number;
  tier: RankingTier;
  // Pour la réglette : la couleur de chaque case, et la case du vendeur.
  cells: RankingTier[];
  subjectIndex: number;
};

export type DangerousBadge = 'meeting' | 'today';

export type RankingRow = {
  key: string;
  subject: boolean;
  rank: number;
  tier: RankingTier;
  label: string;
  newcomer: boolean;
  dangerous: DangerousBadge | null;
  // « votre choix au rendez-vous » : le plus dangereux désigné par le vendeur au rendez-vous.
  meetingChoice: boolean;
  detail: string | null;
  meetingPrice: number | null;
  currentPrice: number;
};

export type PriceRanking = {
  verdict: {
    tier: RankingTier;
    rank: number;
    total: number;
    // « Attention : vous êtes 4e sur 8 » se compose à l'affichage (l'exposant de « e »).
    word: string;
    sentence: string;
    // Le passage de la phrase à mettre en valeur, s'il y en a un.
    emphasis: string | null;
  };
  steps: {
    meeting: RankingStep | null;
    today: RankingStep;
    // null : « Aucun nouveau venu retenu », rien n'est compté.
    newcomers: RankingStep | null;
  };
  rows: RankingRow[];
};

// La place du vendeur parmi des prix : à égalité, il prend le meilleur rang.
export function subjectRank(prices: number[], subjectPrice: number): number {
  return prices.filter((price) => price < subjectPrice).length + 1;
}

function step(prices: number[], subjectPrice: number): RankingStep {
  const total = prices.length + 1;
  const rank = subjectRank(prices, subjectPrice);
  return {
    rank,
    total,
    tier: tierOf(rank, total),
    cells: Array.from({ length: total }, (_, index) => tierOf(index + 1, total)),
    subjectIndex: rank - 1,
  };
}

const listed = (item: MarketUpdateCompetitor) => item.conclusion == null && item.state !== 'gone';

// Un nouveau venu dont la première date connue précède le jour du rendez-vous était déjà en vente :
// il n'a pas été montré alors, il ne compte pas parmi les nouveaux venus (M129, cas de Biot).
export function seenBeforeMeeting(
  item: Pick<MarketUpdateCompetitor, 'newcomer' | 'seenSince'>,
  meetingDate: string | null,
): boolean {
  if (!item.newcomer || !item.seenSince || !meetingDate) return false;
  const seen = isoDayInParis(item.seenSince);
  const meeting = isoDayInParis(meetingDate);
  return seen != null && meeting != null && seen < meeting;
}

// Le jour de Paris d'une date (« 2025-06-17 »), comme la recherche des nouveaux venus ; une date
// sans heure est déjà un jour.
const PARIS_ISO_DAY = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'Europe/Paris',
});
function isoDayInParis(value: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : PARIS_ISO_DAY.format(date);
}

// Le plus dangereux en vigueur : celui désigné aujourd'hui s'il est encore en vente, sinon celui
// du rendez-vous s'il l'est encore. `needsNew` : celui du rendez-vous a disparu, aucun autre n'est
// désigné — le Suivi propose d'en désigner un autre.
export function dangerousInForce(
  summary: Pick<MarketUpdateSummary, 'competitors' | 'dangerousToday'>,
): {
  meetingId: string | null;
  currentId: string | null;
  changed: boolean;
  needsNew: boolean;
} {
  const meeting = summary.competitors.find((item) => item.dangerous) ?? null;
  const today = summary.dangerousToday
    ? (summary.competitors.find(
        (item) => item.id === summary.dangerousToday?.competitorId && listed(item),
      ) ?? null)
    : null;
  const meetingListed = meeting != null && listed(meeting);
  const currentId = today?.id ?? (meetingListed ? meeting.id : null);
  return {
    meetingId: meeting?.id ?? null,
    currentId,
    changed: today != null && today.id !== meeting?.id,
    needsNew: meeting != null && !meetingListed && today == null,
  };
}

const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);

// « 22/10 » : le jour et le mois, à Paris. Le document du vendeur n'importe rien de la Prospection.
const DAY_MONTH = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'Europe/Paris',
});
const shortDate = (iso: string | null): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : DAY_MONTH.format(date);
};

function detailOf(item: MarketUpdateCompetitor, meetingChoice: boolean): string | null {
  const parts: string[] = [];
  if (meetingChoice) parts.push('votre choix au rendez-vous');
  if (item.newcomer) {
    const day = shortDate(item.seenSince);
    parts.push(day ? `arrivé le ${day}` : 'arrivé après le rendez-vous');
  } else {
    if (item.state === 'dropped' && item.gapPercent != null) {
      parts.push(`a baissé de ${formatPercent(Math.abs(item.gapPercent))}`);
    }
    if (item.daysOnMarket != null) {
      parts.push(
        `en vente depuis ${item.daysApproximate ? 'environ ' : ''}${item.daysOnMarket} ${plural(item.daysOnMarket, 'jour', 'jours')}`,
      );
    }
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

function verdictSentence(
  drops: number,
  gone: number,
  cheaperNewcomers: number,
  newDangerous: { label: string; price: number; newcomer: boolean } | null,
  agreedPrice: number,
): { sentence: string; emphasis: string | null } {
  let sentence =
    drops === 0
      ? 'Aucun concurrent n’a baissé depuis le rendez-vous'
      : `${drops} ${plural(drops, 'concurrent a', 'concurrents ont')} baissé depuis le rendez-vous`;
  if (gone > 0) {
    sentence += `, ${gone} ${plural(gone, 'a', 'ont')} quitté le marché`;
  }
  let emphasis: string | null = null;
  if (cheaperNewcomers > 0) {
    emphasis = `${cheaperNewcomers} ${plural(cheaperNewcomers, 'bien est arrivé', 'biens sont arrivés')} sur le marché moins ${plural(cheaperNewcomers, 'cher', 'chers')} que le vôtre`;
    sentence += `${drops === 0 && gone === 0 ? ', mais' : ', et'} ${emphasis}`;
  }
  sentence += '.';
  if (newDangerous) {
    const gap = agreedPrice - newDangerous.price;
    const where =
      gap > 0
        ? `${formatEuro(gap)} sous votre prix`
        : gap < 0
          ? `${formatEuro(-gap)} au-dessus de votre prix`
          : 'à votre prix';
    sentence += ` ${newDangerous.newcomer ? 'Un nouveau venu' : 'Un autre bien'} devient le plus dangereux : ${newDangerous.label}, à ${formatEuro(newDangerous.price)}, ${where}.`;
  }
  return { sentence, emphasis };
}

export function buildPriceRanking(
  summary: Pick<
    MarketUpdateSummary,
    'competitors' | 'agreedPrice' | 'meetingDate' | 'dangerousToday'
  >,
  subjectLabel: string,
): PriceRanking | null {
  const agreed = summary.agreedPrice;
  if (agreed == null || agreed <= 0) return null;
  const competitors = summary.competitors;
  const atMeeting = competitors.filter(
    (item) => !item.newcomer && item.meetingPrice != null && item.meetingPriceSource !== 'current',
  );
  const today = competitors.filter(
    (item) => !item.newcomer && listed(item) && item.currentPrice != null,
  );
  const newcomers = competitors.filter(
    (item) =>
      item.newcomer &&
      listed(item) &&
      item.currentPrice != null &&
      !seenBeforeMeeting(item, summary.meetingDate),
  );
  const priceOf = (item: MarketUpdateCompetitor) => item.currentPrice as number;
  const steps = {
    meeting:
      atMeeting.length > 0
        ? step(
            atMeeting.map((item) => item.meetingPrice as number),
            agreed,
          )
        : null,
    today: step(today.map(priceOf), agreed),
    newcomers: newcomers.length > 0 ? step([...today, ...newcomers].map(priceOf), agreed) : null,
  };
  const ranked = [...today, ...newcomers].sort(
    (a, b) => priceOf(a) - priceOf(b) || a.position - b.position,
  );
  const total = ranked.length + 1;
  const subjectPosition = subjectRank(ranked.map(priceOf), agreed);
  const danger = dangerousInForce(summary);
  const rows: RankingRow[] = [];
  let rank = 1;
  for (const item of ranked) {
    if (rank === subjectPosition) {
      rows.push(subjectRow(rank, total, subjectLabel, agreed));
      rank += 1;
    }
    const meetingChoice = item.id === danger.meetingId;
    rows.push({
      key: item.id,
      subject: false,
      rank,
      tier: tierOf(rank, total),
      label: item.label,
      newcomer: item.newcomer,
      dangerous: item.id === danger.currentId ? (danger.changed ? 'today' : 'meeting') : null,
      meetingChoice,
      detail: detailOf(item, meetingChoice),
      meetingPrice:
        item.newcomer || item.meetingPriceSource === 'current' ? null : item.meetingPrice,
      currentPrice: priceOf(item),
    });
    rank += 1;
  }
  if (rank === subjectPosition) rows.push(subjectRow(rank, total, subjectLabel, agreed));

  const place = steps.newcomers ?? steps.today;
  const newDangerousItem =
    danger.changed && danger.currentId
      ? (competitors.find((item) => item.id === danger.currentId) ?? null)
      : null;
  const { sentence, emphasis } = verdictSentence(
    today.filter((item) => item.state === 'dropped').length,
    competitors.filter((item) => !item.newcomer && !listed(item)).length,
    newcomers.filter((item) => priceOf(item) < agreed).length,
    newDangerousItem && newDangerousItem.currentPrice != null
      ? {
          label: newDangerousItem.label,
          price: newDangerousItem.currentPrice,
          newcomer:
            newDangerousItem.newcomer && !seenBeforeMeeting(newDangerousItem, summary.meetingDate),
        }
      : null,
    agreed,
  );
  return {
    verdict: {
      tier: place.tier,
      rank: place.rank,
      total: place.total,
      word: TIER_WORDS[place.tier],
      sentence,
      emphasis,
    },
    steps,
    rows,
  };
}

function subjectRow(rank: number, total: number, label: string, price: number): RankingRow {
  return {
    key: 'subject',
    subject: true,
    rank,
    tier: tierOf(rank, total),
    label,
    newcomer: false,
    dangerous: null,
    meetingChoice: false,
    detail: 'prix retenu ensemble',
    meetingPrice: price,
    currentPrice: price,
  };
}
