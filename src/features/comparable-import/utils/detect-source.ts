// Light domain -> source-label mapping. Unknown domains fall back to the
// normalised hostname (never blocked just because the portal is unknown).
import { DEMO_LISTING_HOST, DEMO_SOURCE_LABEL } from '@/features/demo/constants';

const KNOWN_SOURCES: ReadonlyArray<readonly [string, string]> = [
  // Mission 114 — les annonces de démonstration disent leur source : « Démonstration ».
  [DEMO_LISTING_HOST, DEMO_SOURCE_LABEL],
  ['seloger.com', 'SeLoger'],
  ['bienici.com', "Bien'ici"],
  ['leboncoin.fr', 'Leboncoin'],
  ['green-acres.fr', 'Green Acres'],
  ['bellesdemeures.com', 'Belles Demeures'],
  ['proprietes.lefigaro.fr', 'Propriétés Le Figaro'],
  ['immobilier.lefigaro.fr', 'Figaro Immobilier'],
  ['maisonsetappartements.fr', 'Maisons et Appartements'],
];

export function detectSource(hostname: string): string {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  for (const [domain, label] of KNOWN_SOURCES) {
    if (host === domain || host.endsWith(`.${domain}`)) {
      return label;
    }
  }
  return host;
}
