// Light domain -> source-label mapping. Unknown domains fall back to the
// normalised hostname (never blocked just because the portal is unknown).
const KNOWN_SOURCES: ReadonlyArray<readonly [string, string]> = [
  ['seloger.com', 'SeLoger'],
  ['bienici.com', "Bien'ici"],
  ['leboncoin.fr', 'Leboncoin'],
  ['green-acres.fr', 'Green Acres'],
  ['bellesdemeures.com', 'Belles Demeures'],
  ['proprietes.lefigaro.fr', 'Propriétés Le Figaro'],
  ['immobilier.lefigaro.fr', 'Figaro Immobilier'],
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
