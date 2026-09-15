import type { ListingAge } from '@/features/comparable-import/types';

// Derives how old a listing is, in the order of reliability the brief fixes (§4/§5),
// most reliable first:
//   1. an EXACT date the portal publishes (machine schema.org, or a French date) →
//      "En vente depuis le … · N jours", source named;
//   2. a LOWER BOUND text ("plus de 2 mois") → shown verbatim, NEVER converted to a
//      number of days;
//   3. our FIRST ACM observation → "Vue par ACM depuis N jours", never "en vente
//      depuis" (we don't know what happened before we first saw it);
//   4. nothing → null (the screen says the field is empty).
//
// Pure: the display formats it, the source is always named.

function daysSince(iso: string, now: Date): number | null {
  const from = new Date(iso).getTime();
  if (Number.isNaN(from)) {
    return null;
  }
  return Math.max(0, Math.floor((now.getTime() - from) / 86_400_000));
}

export function deriveListingAge(
  input: {
    publishedAtExact: string | null;
    lowerBoundLabel: string | null;
    source: string | null;
    firstObservedAt: string | null;
  },
  now: Date = new Date(),
): ListingAge {
  const source = input.source ?? 'le portail';

  if (input.publishedAtExact) {
    const days = daysSince(input.publishedAtExact, now);
    if (days != null) {
      return { kind: 'exact', publishedAt: input.publishedAtExact, days, source };
    }
  }

  if (input.lowerBoundLabel) {
    return { kind: 'lowerBound', label: input.lowerBoundLabel, source };
  }

  if (input.firstObservedAt) {
    const days = daysSince(input.firstObservedAt, now);
    if (days != null) {
      return { kind: 'firstSeen', firstSeenAt: input.firstObservedAt, days };
    }
  }

  return null;
}
