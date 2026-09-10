// Canonicalises a listing URL BEFORE anything else — before the robots check and
// before the fetch — so we control and retrieve exactly the same address.
//
// Why this exists: a SeLoger link copied from a results page carries tracking
// parameters (?cmp=, ?bd=, ?projects=, ?referrer=, ?page=, ?q=…). SeLoger's
// robots.txt forbids those ADDRESS SHAPES, not the listings — the same listing
// without its query string is allowed (measured). So we strip the query down to the
// parameters that actually IDENTIFY the listing.
//
// Per-portal, based on an EXPLICIT allowlist:
//   - SeLoger and Bien'ici (and the other retained portals) carry the id in the
//     PATH → the allowlist is empty → the whole query string is dropped.
//   - A portal whose id lives in the query would list that one parameter here; every
//     other parameter is dropped.
//   - An UNKNOWN portal is left untouched.
//
// Forbidden by design: stripping parameters until the address passes robots. The
// normalisation is DETERMINISTIC and never depends on the robots result — it is
// always the same. If the canonical address is still refused, it is refused.

type PortalRule = { suffixes: string[]; keepQueryParams: string[] };

const PORTAL_RULES: PortalRule[] = [
  { suffixes: ['seloger.com'], keepQueryParams: [] },
  { suffixes: ['bienici.com'], keepQueryParams: [] },
  { suffixes: ['green-acres.fr'], keepQueryParams: [] },
  { suffixes: ['lefigaro.fr'], keepQueryParams: [] },
  { suffixes: ['maisonsetappartements.fr'], keepQueryParams: [] },
  { suffixes: ['leboncoin.fr'], keepQueryParams: [] },
];

function ruleFor(hostname: string): PortalRule | null {
  const host = hostname.toLowerCase();
  return (
    PORTAL_RULES.find((rule) =>
      rule.suffixes.some((suffix) => host === suffix || host.endsWith(`.${suffix}`)),
    ) ?? null
  );
}

export function normalizeListingUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  const rule = ruleFor(url.hostname);
  if (!rule) {
    return rawUrl; // unknown portal → untouched
  }

  const keep = new Set(rule.keepQueryParams);
  const kept = [...url.searchParams.entries()].filter(([name]) => keep.has(name));
  url.search = '';
  for (const [name, value] of kept) {
    url.searchParams.append(name, value);
  }
  url.hash = ''; // a fragment is a UI anchor, never part of the canonical address
  return url.toString();
}
