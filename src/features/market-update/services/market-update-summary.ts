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
// D'AUTORISATION : ni titre, ni adresse, ni « Vendu par » n'y entrent ; le seul lien d'annonce
// qu'il porte est celui d'une proposition payée encore à trancher (127 B), côté conseiller, que
// le document et le lien du vendeur ne reçoivent jamais. Pur.

export const MARKET_UPDATE_STATES = [
  'unchanged',
  'dropped',
  'raised',
  'unread',
  'probable_sale',
  'withdrawn',
  // Disparue (sur preuve, M103) sans durée de commercialisation connue : la règle ne conclut rien.
  'gone',
  // Mission 127 B — retenu après le rendez-vous : pas de prix du rendez-vous, la ligne 3 seulement.
  'newcomer',
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
  newcomer: 'Nouveau venu',
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
  // Les champs ajoutés après le premier point écrit ont une valeur par défaut : un point relu
  // ne disparaît jamais en silence.
  shownAtMeeting: z.boolean().default(true),
  // Ce que la relecture du jour a lu : true relue, false non relue (illisible ou disparue), null
  // sans annonce (saisi à la main).
  readToday: z.boolean().nullable().default(null),
  // Mission 127 B — un nouveau venu, vu sur le marché depuis `seenSince` (date de publication de
  // l'annonce si elle la dit, sinon le jour où le dossier l'a reçu).
  newcomer: z.boolean().default(false),
  seenSince: z.string().nullable().default(null),
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

// Mission 127 B — la recherche des nouveaux venus faite pour ce point (sinon null : « pas de
// recherche », distinct de « recherche faite, 0 retenu »).
// Mission 127 B (décision de Jean-Guy, 30/10) — une proposition payée, non encore retenue ni écartée,
// reste sur le point jusqu'à « Écarter » ou au point suivant : ce que la recherche a dit du bien,
// SANS titre ni adresse (le `url` ne sert qu'au conseiller pour retenir ou écarter ; la page du
// vendeur ne reçoit jamais ces propositions, `load-market-update.ts` les retire).
export const newcomerProposalSchema = z.object({
  url: z.string().max(2000),
  label: z.string().max(200),
  price: z.number().positive(),
  pricePerSqm: z.number().nullable().default(null),
  surfaceArea: z.number().nullable().default(null),
  roomsCount: z.number().nullable().default(null),
  propertyType: z.string().nullable().default(null),
  city: z.string().nullable().default(null),
  photoUrls: z.array(z.string().url().startsWith('https://').max(2000)).max(4).default([]),
  seenSince: z.string(),
  energyClass: z.string().nullable().default(null),
  snapshot: z.record(z.string(), z.unknown()).nullable().default(null),
});
export type NewcomerProposal = z.infer<typeof newcomerProposalSchema>;

export const newcomersSearchSchema = z.object({
  madeAt: z.string(),
  found: z.number().int(),
  billed: z.number().int(),
  // Le plafond de prix est parti dans la requête : « Recherche limitée aux biens à votre prix ou moins ».
  limitedToPrice: z.boolean(),
  excludedNoDate: z.number().int().default(0),
  proposed: z.array(newcomerProposalSchema).default([]),
});
export type NewcomersSearch = z.infer<typeof newcomersSearchSchema>;

export const marketUpdateSummarySchema = z.object({
  version: z.literal(1),
  newcomersSearch: newcomersSearchSchema.nullable().default(null),
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
    goneUnknown: z.number().int().default(0),
    newcomers: z.number().int(),
  }),
  lines: z.object({
    meeting: lineSchema.nullable(),
    today: lineSchema.nullable(),
    todayGone: z.object({
      probableSale: z.number().int(),
      withdrawn: z.number().int(),
      unknown: z.number().int().default(0),
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
  // Mission 127 B — null : retenu après la conclusion, un nouveau venu.
  meeting_frozen_at: string | null;
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
  // Mission 127 B — la recherche des nouveaux venus faite pour ce point, s'il y en a eu une.
  newcomersSearch?: NewcomersSearch | null;
};

const round1 = (value: number): number => Math.round(value * 10) / 10;

export function buildMarketUpdateSummary(input: MarketUpdateInput): MarketUpdateSummary {
  // Les concurrents du rendez-vous d'abord, dans l'ordre du Live ; les nouveaux venus (retenus
  // après la conclusion : jamais figés) ensuite, du plus ancien au plus récent.
  const isNewcomer = (row: MarketUpdateCompetitorRow) => row.meeting_frozen_at == null;
  const ordered = [...input.competitors].sort(
    (a, b) =>
      Number(isNewcomer(a)) - Number(isNewcomer(b)) ||
      (a.display_order ?? 0) - (b.display_order ?? 0) ||
      a.created_at.localeCompare(b.created_at),
  );
  const competitors: MarketUpdateCompetitor[] = ordered.map((row, index) => {
    const source = sourceSchema.safeParse(row.meeting_price_source);
    const meetingPriceSource = source.success ? source.data : null;
    const meetingPrice = row.meeting_price;
    const newcomer = isNewcomer(row);
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
          : newcomer
            ? 'newcomer'
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
      newcomer,
      seenSince: newcomer ? (row.listing_published_at ?? row.created_at) : null,
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
  const newcomerPrices = competitors
    .filter((item) => item.newcomer && item.conclusion == null && item.currentPrice != null)
    .map((item) => item.currentPrice as number);
  const lines: PriceLines = buildPriceLines(
    competitors.map((item) => ({
      newcomer: item.newcomer,
      meetingPrice: item.meetingPrice,
      currentPrice: item.currentPrice,
      gone: item.conclusion?.kind ?? (item.state === 'gone' ? 'unknown' : null),
      dangerous: item.dangerous,
    })),
    input.agreedPrice,
    newcomerPrices,
  );
  return {
    version: 1,
    newcomersSearch: input.newcomersSearch ?? null,
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
      newcomers: count('newcomer'),
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
    c.newcomers > 0
      ? plural(c.newcomers, 'nouveau venu', 'nouveaux venus')
      : summary.newcomersSearch
        ? 'aucun nouveau venu'
        : null,
  ]
    .filter((part): part is string => part != null)
    .join(' · ');
}

// « Ont baissé depuis le rendez-vous : 2 sur 5 » — sur le prix du rendez-vous.
export function droppedSinceMeetingLabel(summary: MarketUpdateSummary): string | null {
  const compared = summary.competitors.filter(
    (item) => !item.newcomer && item.meetingPrice != null && item.meetingPriceSource !== 'current',
  ).length;
  if (compared === 0) return null;
  return `Ont baissé depuis le rendez-vous : ${summary.counts.dropped} sur ${compared}`;
}
