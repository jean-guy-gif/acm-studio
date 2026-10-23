import { normalizeListingUrl } from '@/features/comparable-import/utils/normalize-listing-url';
import { DEMO_LISTING_HOST, DEMO_PORTAL, DEMO_SOURCE_LABEL } from '@/features/demo/constants';

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
  // L'identifiant est dans le chemin (/ads/4534734) ; la chaîne de requête n'est
  // que du contexte de recherche → la règle keep=[] de normalize-listing-url est
  // juste. Sans cette entrée, aucune observation n'est écrite et le portail n'a
  // jamais d'historique de prix.
  { suffixes: ['maisonsetappartements.fr'], portal: 'maisonsetappartements' },
  // Mission 114 — le portail de DÉMONSTRATION (hôte réservé) : l'identifiant du bien fictif est le
  // dernier segment du chemin, pour que ses observations et son regroupement marchent comme ceux
  // d'un portail mesuré. Aucune page réelle n'y est jamais lue.
  { suffixes: [DEMO_LISTING_HOST], portal: DEMO_PORTAL },
  // leboncoin.fr : NON supporté, ne pas rajouter. Son robots.txt interdit /ad/,
  // le chemin des annonces — on ne le lira jamais, donc pas d'identité à en tirer.
];

// Le nom du portail tel qu'on le montre (« d'après SeLoger ») : la source est toujours nommée.
export const LISTING_PORTAL_LABELS: Record<string, string> = {
  seloger: 'SeLoger',
  bienici: 'Bien’ici',
  greenacres: 'Green Acres',
  maisonsetappartements: 'Maisons et Appartements',
  [DEMO_PORTAL]: DEMO_SOURCE_LABEL,
};

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

// « seloger:26ZEJMLWB13Y » : l'identité publiée en une clé (regroupement M98, opposition M102).
export function listingIdentityKey(rawUrl: string | null | undefined): string | null {
  const identity = rawUrl ? extractListingKey(rawUrl) : null;
  return identity ? `${identity.portal}:${identity.listingKey}` : null;
}
