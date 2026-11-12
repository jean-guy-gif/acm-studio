import { z } from 'zod';

import { listingIdentityKey } from '@/features/comparable-import/utils/extract-listing-key';
import { BUYER_SOFT_CRITERIA } from '@/features/buyers/types';
import type { CompetitorCandidate } from '@/features/competitor-search/types';
import { QUOTE_MAX } from '@/features/soft-ranking/services/judgments';
import type { SoftReasons } from '@/features/soft-ranking/types';

// Mission 136 — ce que la veille ramène pour un acquéreur, et ce qu'elle en garde. Pur.
//   • seuls les biens VUS sur le marché depuis le passage précédent : la plus ancienne date connue
//     du bien chez Stream Estate (M129, `firstKnownAt`, sinon sa création) ; un bien sans date est
//     écarté (M61 : une donnée absente qui EST le critère écarte) ;
//   • absents de ses sélections, de ses propositions (M134) et de ses refus, et des biens que
//     l'agence connaît déjà (un concurrent, un bien démarché : la boucle de la 134 les appelle) ;
//   • gardés par liste d'autorisation, à l'écriture comme à la lecture (M101) : jamais le titre de
//     l'annonce, que la veille n'a pas à montrer.

// La clé d'un bien : son identité publiée (portail + numéro, M47), sinon son adresse d'annonce.
export const watchKey = (url: string): string => listingIdentityKey(url) ?? url.trim();

const httpsUrl = z
  .string()
  .max(2000)
  .refine((value) => /^https:\/\//i.test(value));
const shortText = z.string().max(200).nullable();
const count = z.number().int().min(0).max(100_000).nullable();
const area = z.number().min(0).max(1_000_000).nullable();
const isoDate = z.string().max(40).nullable();

// Mission 151 (partie B) — ce que la veille a jugé de ce qui compte pour lui, gardé avec le passage
// (fiche, B.5) : les jugements et leurs citations courtes, ou les seuls mots trouvés (classement
// simplifié) ; jamais le texte de l'annonce.
const judgmentSchema = z.object({
  key: z.enum(BUYER_SOFT_CRITERIA),
  verdict: z.enum(['clearly', 'reserve', 'nothing', 'contrary', 'unread']),
  quote: z.string().max(QUOTE_MAX).nullable(),
  counterQuote: z.string().max(QUOTE_MAX).nullable(),
  toVerify: z.boolean(),
});
const softSchema = z.union([
  z.object({ judgments: z.array(judgmentSchema).max(BUYER_SOFT_CRITERIA.length) }),
  z.object({ mentions: z.array(z.string().max(60)).max(BUYER_SOFT_CRITERIA.length) }),
]);

const findSchema = z.object({
  key: z.string().max(200).nullable(),
  url: httpsUrl,
  price: z.number().int().min(0).max(1_000_000_000).nullable(),
  surfaceArea: area,
  roomsCount: count,
  propertyType: shortText,
  pricePerSqm: z.number().min(0).max(1_000_000).nullable(),
  landArea: area,
  city: shortText,
  photoUrls: z.array(httpsUrl).max(20),
  energyClass: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G']).nullable().optional(),
  streamEstate: z
    .object({
      propertyId: z.string().max(100),
      originSite: z.string().max(100),
      onlineSince: isoDate,
      firstKnownAt: isoDate.optional(),
      lastSeenAt: isoDate,
      priceDrops: z.array(z.number().min(-100).max(100)).max(50),
      bedrooms: count.optional(),
      inseeCode: z.string().max(10).nullable().optional(),
    })
    .optional(),
  features: z
    .object({
      district: shortText,
      floor: z.number().int().min(-5).max(200).nullable(),
      hasElevator: z.boolean().nullable(),
      hasPool: z.boolean().nullable(),
      parking: z.array(z.string().max(40)).max(10).nullable(),
      outdoor: z
        .object({
          present: z.array(z.string().max(40)).max(10),
          absent: z.array(z.string().max(40)).max(10),
        })
        .nullable(),
      condition: shortText,
      exposure: shortText,
      constructionYear: z.number().int().min(1000).max(3000).nullable(),
    })
    .optional(),
  soft: softSchema.optional(),
});

export type WatchFind = z.infer<typeof findSchema>;

export const MAX_WATCH_FINDS = 20;

// La carte gardée : les seuls champs autorisés, recopiés un à un.
export function toWatchFind(candidate: CompetitorCandidate): WatchFind | null {
  const se = candidate.streamEstate;
  const features = candidate.features;
  const parsed = findSchema.safeParse({
    key: candidate.key,
    url: candidate.url,
    price: candidate.price != null ? Math.round(candidate.price) : null,
    surfaceArea: candidate.surfaceArea,
    roomsCount: candidate.roomsCount,
    propertyType: candidate.propertyType,
    pricePerSqm: candidate.pricePerSqm,
    landArea: candidate.landArea,
    city: candidate.city,
    photoUrls: candidate.photoUrls.filter((url) => /^https:\/\//i.test(url)).slice(0, 20),
    energyClass: candidate.energyClass ?? null,
    ...(se
      ? {
          streamEstate: {
            propertyId: se.propertyId,
            originSite: se.originSite,
            onlineSince: se.onlineSince,
            firstKnownAt: se.firstKnownAt ?? null,
            lastSeenAt: se.lastSeenAt,
            priceDrops: se.priceDrops,
            bedrooms: se.bedrooms ?? null,
            inseeCode: se.inseeCode ?? null,
          },
        }
      : {}),
    ...(features
      ? {
          features: {
            district: features.district,
            floor: features.floor,
            hasElevator: features.hasElevator,
            hasPool: features.hasPool,
            parking: features.parking,
            outdoor: features.outdoor,
            condition: features.condition,
            exposure: features.exposure,
            constructionYear: features.constructionYear,
          },
        }
      : {}),
  });
  return parsed.success ? parsed.data : null;
}

// Relu à chaque lecture : une entrée hors liste est ignorée, jamais devinée.
export function readWatchFinds(raw: unknown): WatchFind[] {
  if (!Array.isArray(raw)) return [];
  const finds: WatchFind[] = [];
  for (const entry of raw.slice(0, MAX_WATCH_FINDS)) {
    const parsed = findSchema.safeParse(entry);
    if (parsed.success) finds.push(parsed.data);
  }
  return finds;
}

// La carte d'un bien trouvé, sous la forme que lisent le classement (M118) et l'écran.
export function findAsCandidate(find: WatchFind): CompetitorCandidate {
  return {
    key: find.key,
    url: find.url,
    title: null,
    price: find.price,
    surfaceArea: find.surfaceArea,
    roomsCount: find.roomsCount,
    propertyType: find.propertyType,
    pricePerSqm: find.pricePerSqm,
    landArea: find.landArea,
    city: find.city,
    photoUrls: find.photoUrls,
    isNewBuild: false,
    energyClass: find.energyClass ?? null,
    ...(find.streamEstate
      ? {
          streamEstate: {
            ...find.streamEstate,
            firstKnownAt: find.streamEstate.firstKnownAt ?? null,
            bedrooms: find.streamEstate.bedrooms ?? null,
            inseeCode: find.streamEstate.inseeCode ?? null,
          },
        }
      : {}),
    ...(find.features
      ? { features: { ...find.features, location: null, locationDiscarded: false } }
      : {}),
  } as CompetitorCandidate;
}

export type WatchFilterOutcome = {
  finds: WatchFind[];
  excludedBefore: number;
  excludedNoDate: number;
  excludedKnown: number;
};

// Les biens vus depuis `seenSince`, absents de ce que l'acquéreur et l'agence connaissent déjà.
export function filterWatchFinds(
  candidates: CompetitorCandidate[],
  options: { seenSince: string; knownKeys: Iterable<string> },
): WatchFilterOutcome {
  const known = new Set(options.knownKeys);
  const since = new Date(options.seenSince).getTime();
  const outcome: WatchFilterOutcome = {
    finds: [],
    excludedBefore: 0,
    excludedNoDate: 0,
    excludedKnown: 0,
  };
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const key = watchKey(candidate.url);
    if (seen.has(key)) continue;
    seen.add(key);
    if (known.has(key)) {
      outcome.excludedKnown += 1;
      continue;
    }
    const first = candidate.streamEstate?.firstKnownAt ?? candidate.streamEstate?.onlineSince;
    const at = first ? new Date(first).getTime() : Number.NaN;
    if (!Number.isFinite(at)) {
      outcome.excludedNoDate += 1;
      continue;
    }
    if (!Number.isFinite(since) || at <= since) {
      outcome.excludedBefore += 1;
      continue;
    }
    const find = toWatchFind(candidate);
    if (find && outcome.finds.length < MAX_WATCH_FINDS) outcome.finds.push(find);
  }
  return outcome;
}

// Mission 151 (partie B) — les raisons gardées par la veille, par lien d'annonce, pour l'écran.
export function watchReasonsOf(finds: readonly WatchFind[]): Record<string, SoftReasons> {
  return Object.fromEntries(
    finds.flatMap((find) => (find.soft ? [[find.url, find.soft as SoftReasons]] : [])),
  );
}

// Les raisons posées sur les biens gardés (par lien d'annonce), relues par la même liste.
export function withSoftReasons(
  finds: readonly WatchFind[],
  reasons: Readonly<Record<string, SoftReasons>>,
): WatchFind[] {
  return finds.map((find) => {
    const soft = softSchema.safeParse(reasons[find.url]);
    return soft.success ? { ...find, soft: soft.data } : find;
  });
}
