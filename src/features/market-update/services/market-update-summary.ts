import { z } from 'zod';

import {
  goneConclusionLabel,
  goneListingConclusion,
} from '@/features/market-update/services/gone-listing-rule';
import { daysOnMarketAt } from '@/features/market-update/services/meeting-days';
import { buildPriceLines, type PriceLines } from '@/features/market-update/services/price-lines';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';

// Mission 127 — le point daté : ce qu'une mise à jour conclut, par concurrent, puis les trois
// lignes de prix. Écrit en base (`project_market_updates.summary`) par le serveur, relu tel quel
// par le Suivi et le document (« chacun rouvre son document tel qu'il était »). LISTE
// D'AUTORISATION : ni titre, ni adresse, ni lien d'annonce, ni « Vendu par » n'y entrent. Pur.

export const MARKET_UPDATE_STATES = [
  'unchanged',
  'dropped',
  'raised',
  'unread',
  'probable_sale',
  'withdrawn',
  // Disparue (sur preuve, M103) sans durée de commercialisation connue : la règle ne conclut rien.
  'gone',
] as const;
export type MarketUpdateState = (typeof MARKET_UPDATE_STATES)[number];

export const MARKET_UPDATE_STATE_LABELS: Record<MarketUpdateState, string> = {
  unchanged: 'Inchangé',
  dropped: 'Baisse',
  raised: 'Hausse',
  unread: 'Non relu',
  probable_sale: 'Vente probable',
  withdrawn: 'Retiré sans vente',
  gone: 'Retirée',
};

const sourceSchema = z.enum(['conclusion', 'revealed', 'observation', 'current']);

const lineSchema = z.object({
  prices: z.array(z.number()),
  lowest: z.number(),
  highest: z.number(),
  median: z.number(),
  dangerousPrice: z.number().nullable(),
  subjectPrice: z.number().nullable(),
  sentence: z.string().nullable(),
});

export const marketUpdateCompetitorSchema = z.object({
  id: z.uuid(),
  position: z.number().int().min(1),
  label: z.string(),
  surfaceArea: z.number().nullable(),
  dangerous: z.boolean(),
  // Montré au rendez-vous (M110 : un concurrent retenu peut être hors Live).
  shownAtMeeting: z.boolean(),
  // Ce que la relecture du jour a lu : true relue, false non relue (illisible ou disparue), null
  // sans annonce (saisi à la main).
  readToday: z.boolean().nullable(),
  meetingPrice: z.number().nullable(),
  meetingPriceSource: sourceSchema.nullable(),
  currentPrice: z.number().nullable(),
  gapAmount: z.number().nullable(),
  gapPercent: z.number().nullable(),
  state: z.enum(MARKET_UPDATE_STATES),
  // En vente depuis N jours (au jour du point, ou au jour du retrait pour une annonce disparue).
  daysOnMarket: z.number().int().nullable(),
  daysApproximate: z.boolean(),
  goneAt: z.string().nullable(),
  conclusion: z
    .object({
      kind: z.enum(['withdrawn', 'probable_sale']),
      label: z.string(),
      negotiationMinPercent: z.number().nullable(),
      negotiationMaxPercent: z.number().nullable(),
      estimatedMin: z.number().nullable(),
      estimatedMax: z.number().nullable(),
    })
    .nullable(),
});
export type MarketUpdateCompetitor = z.infer<typeof marketUpdateCompetitorSchema>;

export const marketUpdateSummarySchema = z.object({
  version: z.literal(1),
  meetingDate: z.string().nullable(),
  agreedPrice: z.number().nullable(),
  advisorAnalysis: z.number().nullable(),
  competitors: z.array(marketUpdateCompetitorSchema),
  counts: z.object({
    read: z.number().int(),
    dropped: z.number().int(),
    raised: z.number().int(),
    probableSale: z.number().int(),
    withdrawn: z.number().int(),
    unread: z.number().int(),
    unreadable: z.number().int(),
    goneUnknown: z.number().int(),
    newcomers: z.number().int(),
  }),
  lines: z.object({
    meeting: lineSchema.nullable(),
    today: lineSchema.nullable(),
    todayGone: z.object({
      probableSale: z.number().int(),
      withdrawn: z.number().int(),
      unknown: z.number().int(),
    }),
    newcomers: lineSchema.nullable(),
    newcomersCount: z.number().int(),
    scale: z.object({ min: z.number(), max: z.number() }).nullable(),
  }),
});
export type MarketUpdateSummary = z.infer<typeof marketUpdateSummarySchema>;

export function parseMarketUpdateSummary(value: unknown): MarketUpdateSummary | null {
  const parsed = marketUpdateSummarySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

// Un concurrent retenu, tel que la base le rend (colonnes autorisées seulement).
export type MarketUpdateCompetitorRow = {
  id: string;
  price: number;
  property_type: string | null;
  rooms_count: number | null;
  surface_area: number | null;
  city: string | null;
  district: string | null;
  display_order: number | null;
  created_at: string;
  excluded_from_live: boolean | null;
  // Relue aujourd'hui (une observation datée du jour), non relue, ou sans annonce.
  read_today: boolean | null;
  listing_published_at: string | null;
  days_on_market: number | null;
  listing_gone_at: string | null;
  meeting_price: number | null;
  meeting_price_source: string | null;
};

export type MarketUpdateInput = {
  competitors: MarketUpdateCompetitorRow[];
  dangerousCompetitorId: string | null;
  meetingDate: string | null;
  agreedPrice: number | null;
  advisorAnalysis: number | null;
  madeAt: Date;
};

const round1 = (value: number): number => Math.round(value * 10) / 10;

export function buildMarketUpdateSummary(input: MarketUpdateInput): MarketUpdateSummary {
  const ordered = [...input.competitors].sort(
    (a, b) =>
      (a.display_order ?? 0) - (b.display_order ?? 0) || a.created_at.localeCompare(b.created_at),
  );
  const competitors: MarketUpdateCompetitor[] = ordered.map((row, index) => {
    const source = sourceSchema.safeParse(row.meeting_price_source);
    const meetingPriceSource = source.success ? source.data : null;
    const meetingPrice = row.meeting_price;
    const unread = meetingPrice == null || meetingPriceSource === 'current';
    const gone = row.listing_gone_at;
    const at = gone ?? input.madeAt;
    const days = daysOnMarketAt(row, at);
    const conclusion =
      gone != null && days != null ? goneListingConclusion(days.days, row.price) : null;
    const state: MarketUpdateState =
      conclusion != null
        ? conclusion.kind
        : gone != null
          ? 'gone'
          : unread
            ? 'unread'
            : row.price < (meetingPrice as number)
              ? 'dropped'
              : row.price > (meetingPrice as number)
                ? 'raised'
                : 'unchanged';
    const gapAmount = !unread && meetingPrice != null ? row.price - meetingPrice : null;
    return {
      id: row.id,
      position: index + 1,
      label: neutralComparableLabel({
        propertyType: row.property_type,
        roomsCount: row.rooms_count,
        surfaceArea: row.surface_area,
        city: row.city,
        district: row.district,
      }),
      surfaceArea: row.surface_area,
      dangerous: row.id === input.dangerousCompetitorId,
      shownAtMeeting: row.excluded_from_live !== true,
      readToday: row.read_today,
      meetingPrice,
      meetingPriceSource,
      currentPrice: row.price,
      gapAmount,
      gapPercent:
        gapAmount != null && meetingPrice ? round1((gapAmount / meetingPrice) * 100) : null,
      state,
      daysOnMarket: days?.days ?? null,
      daysApproximate: days?.approximate ?? false,
      goneAt: gone,
      conclusion: conclusion
        ? {
            kind: conclusion.kind,
            label: goneConclusionLabel(conclusion),
            negotiationMinPercent:
              conclusion.kind === 'probable_sale' ? conclusion.negotiationMinPercent : null,
            negotiationMaxPercent:
              conclusion.kind === 'probable_sale' ? conclusion.negotiationMaxPercent : null,
            estimatedMin: conclusion.kind === 'probable_sale' ? conclusion.estimatedMin : null,
            estimatedMax: conclusion.kind === 'probable_sale' ? conclusion.estimatedMax : null,
          }
        : null,
    };
  });
  const count = (state: MarketUpdateState) =>
    competitors.filter((item) => item.state === state).length;
  const lines: PriceLines = buildPriceLines(
    competitors.map((item) => ({
      meetingPrice: item.meetingPrice,
      currentPrice: item.currentPrice,
      gone: item.conclusion?.kind ?? (item.state === 'gone' ? 'unknown' : null),
      dangerous: item.dangerous,
    })),
    input.agreedPrice,
    [],
  );
  return {
    version: 1,
    meetingDate: input.meetingDate,
    agreedPrice: input.agreedPrice,
    advisorAnalysis: input.advisorAnalysis,
    competitors,
    counts: {
      // Relues : ce que la relecture du jour a réellement lu, relu en base ; illisibles : les
      // annonces en ligne qu'elle n'a pas pu lire.
      read: competitors.filter((item) => item.readToday === true).length,
      dropped: count('dropped'),
      raised: count('raised'),
      probableSale: count('probable_sale'),
      withdrawn: count('withdrawn'),
      unread: count('unread'),
      unreadable: competitors.filter((item) => item.readToday === false && item.goneAt == null)
        .length,
      goneUnknown: count('gone'),
      newcomers: 0,
    },
    lines,
  };
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

// « 5 annonces relues · 2 baisses · 1 vente probable · 1 retiré sans vente · 2 nouveaux venus ».
export function marketUpdateLine(summary: MarketUpdateSummary): string {
  const c = summary.counts;
  return [
    plural(c.read, 'annonce relue', 'annonces relues'),
    c.dropped > 0 ? plural(c.dropped, 'baisse', 'baisses') : null,
    c.raised > 0 ? plural(c.raised, 'hausse', 'hausses') : null,
    c.probableSale > 0 ? plural(c.probableSale, 'vente probable', 'ventes probables') : null,
    c.withdrawn > 0 ? plural(c.withdrawn, 'retiré sans vente', 'retirés sans vente') : null,
    c.goneUnknown > 0
      ? plural(c.goneUnknown, 'retirée, durée inconnue', 'retirées, durée inconnue')
      : null,
    c.unread > 0
      ? plural(c.unread, 'prix au rendez-vous non relu', 'prix au rendez-vous non relus')
      : null,
    c.unreadable > 0 ? plural(c.unreadable, 'illisible', 'illisibles') : null,
    c.newcomers > 0 ? plural(c.newcomers, 'nouveau venu', 'nouveaux venus') : null,
  ]
    .filter((part): part is string => part != null)
    .join(' · ');
}

// « Ont baissé depuis le rendez-vous : 2 sur 5 » — sur le prix du rendez-vous.
export function droppedSinceMeetingLabel(summary: MarketUpdateSummary): string | null {
  const compared = summary.competitors.filter(
    (item) => item.meetingPrice != null && item.meetingPriceSource !== 'current',
  ).length;
  if (compared === 0) return null;
  return `Ont baissé depuis le rendez-vous : ${summary.counts.dropped} sur ${compared}`;
}
