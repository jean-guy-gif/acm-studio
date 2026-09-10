import { normalizeListingUrl } from '@/features/comparable-import/utils/normalize-listing-url';

// The identity of a listing (Mission 47 §3): the couple (portal, identifier in the
// PATH of the canonical address). Two observations compare only if we know they are
// the same listing — `26ZEJMLWB13Y` at SeLoger, `apimo-85508663` at Bien'ici,
// `Al6sdpuxlkaknl9r` at Green Acres. The internal agency reference (« Réf. 3472 »)
// is NEVER the key: it is unique neither in time nor between agencies.
//
// Only the portals ACTUALLY MEASURED get an identity rule — coding an id-extractor
// for an unmeasured portal is exactly the mistake §6 forbids. An unknown portal, or
// a path without a usable last segment, yields no identity → no observation.

const MEASURED_PORTALS: { suffixes: string[]; portal: string }[] = [
  { suffixes: ['seloger.com'], portal: 'seloger' },
  { suffixes: ['bienici.com'], portal: 'bienici' },
  { suffixes: ['green-acres.fr'], portal: 'greenacres' },
];

export type ListingIdentity = { portal: string; listingKey: string; canonicalUrl: string };

export function extractListingKey(rawUrl: string): ListingIdentity | null {
  let url: URL;
  try {
    url = new URL(normalizeListingUrl(rawUrl));
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  const portal = MEASURED_PORTALS.find((p) =>
    p.suffixes.some((suffix) => host === suffix || host.endsWith(`.${suffix}`)),
  )?.portal;
  if (!portal) {
    return null;
  }

  // The id is the last non-empty path segment for all three measured portals.
  const segments = url.pathname.split('/').filter(Boolean);
  const listingKey = segments[segments.length - 1] ?? '';
  if (listingKey.length < 3) {
    return null;
  }

  return { portal, listingKey, canonicalUrl: url.toString() };
}
