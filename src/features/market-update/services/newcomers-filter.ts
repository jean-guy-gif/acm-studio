import { parseListingUrl } from '@/features/comparable-import/utils/normalize-listing-url';
import {
  candidateSnapshot,
  type SearchSnapshot,
} from '@/features/competitor-search/services/search-snapshot';
import type { CompetitorCandidate } from '@/features/competitor-search/types';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';

// Mission 127 B — les nouveaux venus : parmi ce que la recherche renvoie, les biens VUS sur le
// marché après le rendez-vous (`createdAt` de Stream Estate : son premier passage, jamais une
// date de publication, M101), absents des concurrents, des écartés et des imports en attente du
// dossier, au prix de commercialisation ou moins (règle de Jean-Guy, 29/10 : le plafond part dans
// la requête, ce filtre le redit à la réponse). Un bien sans date de première vue est écarté et
// compté (M61 : une donnée absente qui EST le critère écarte). Pur.

export type NewcomerCandidate = {
  url: string;
  label: string;
  price: number;
  pricePerSqm: number | null;
  surfaceArea: number | null;
  roomsCount: number | null;
  propertyType: string | null;
  city: string | null;
  photoUrls: string[];
  // Vu sur le marché depuis le … (ISO).
  seenSince: string;
  energyClass: string | null;
  // Ce que la recherche a dit du bien, pour l'import en attente (M101) et la création depuis la
  // recherche si la page reste illisible.
  snapshot: SearchSnapshot;
};

export type NewcomersFilterOutcome = {
  newcomers: NewcomerCandidate[];
  excludedKnown: number;
  excludedBefore: number;
  excludedNoDate: number;
  excludedOverPrice: number;
  excludedNoPrice: number;
};

export const normalizedListingHref = (url: string | null | undefined): string | null =>
  url ? (parseListingUrl(url)?.href ?? null) : null;

export function filterNewcomers(
  candidates: CompetitorCandidate[],
  options: { concludedAt: string; knownUrls: Iterable<string>; priceCeiling: number },
): NewcomersFilterOutcome {
  const known = new Set(
    [...options.knownUrls]
      .map((url) => normalizedListingHref(url))
      .filter((href): href is string => href != null),
  );
  const since = new Date(options.concludedAt).getTime();
  const outcome: NewcomersFilterOutcome = {
    newcomers: [],
    excludedKnown: 0,
    excludedBefore: 0,
    excludedNoDate: 0,
    excludedOverPrice: 0,
    excludedNoPrice: 0,
  };
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const href = normalizedListingHref(candidate.url) ?? candidate.url;
    if (seen.has(href)) continue;
    seen.add(href);
    if (known.has(href)) {
      outcome.excludedKnown += 1;
      continue;
    }
    if (candidate.price == null || candidate.price <= 0) {
      outcome.excludedNoPrice += 1;
      continue;
    }
    if (candidate.price > options.priceCeiling) {
      outcome.excludedOverPrice += 1;
      continue;
    }
    const onlineSince = candidate.streamEstate?.onlineSince ?? null;
    const seenAt = onlineSince ? new Date(onlineSince).getTime() : Number.NaN;
    if (!Number.isFinite(seenAt)) {
      outcome.excludedNoDate += 1;
      continue;
    }
    if (!Number.isFinite(since) || seenAt <= since) {
      outcome.excludedBefore += 1;
      continue;
    }
    outcome.newcomers.push({
      url: href,
      label: neutralComparableLabel({
        propertyType: candidate.propertyType,
        roomsCount: candidate.roomsCount,
        surfaceArea: candidate.surfaceArea,
        city: candidate.city,
        district: null,
      }),
      price: candidate.price,
      pricePerSqm:
        candidate.pricePerSqm ??
        (candidate.surfaceArea && candidate.surfaceArea > 0
          ? Math.round(candidate.price / candidate.surfaceArea)
          : null),
      surfaceArea: candidate.surfaceArea,
      roomsCount: candidate.roomsCount,
      propertyType: candidate.propertyType,
      city: candidate.city,
      photoUrls: candidate.photoUrls.filter((url) => /^https:\/\//.test(url)).slice(0, 4),
      seenSince: onlineSince as string,
      energyClass: candidate.energyClass ?? null,
      snapshot: candidateSnapshot(candidate),
    });
  }
  outcome.newcomers.sort((a, b) => a.price - b.price);
  return outcome;
}
