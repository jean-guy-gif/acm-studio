// Mission 83 — qui vend un concurrent, et sous quel mandat. Deux faits lus sur l'annonce ou
// posés par le conseiller, réservés au conseiller : jamais dans le Live ni dans une page montrée
// au vendeur. Une valeur absente (null) veut dire « inconnu » : rien n'est déduit.

export const SOLD_BY_VALUES = ['agency', 'private'] as const;
export type SoldBy = (typeof SOLD_BY_VALUES)[number];

export const EXCLUSIVITY_VALUES = ['yes', 'no'] as const;
export type Exclusivity = (typeof EXCLUSIVITY_VALUES)[number];

// D'où vient la valeur. `advisor` prime toujours : une lecture ne l'écrase jamais.
//   listing_data — donnée structurée de l'annonce (état de l'application, JSON-LD)
//   badge        — marque HTML du portail sur l'annonce (« Exclusivité »)
//   advertiser   — nom de l'agence dans le bloc annonceur de l'annonce
//   title        — titre de l'annonce
//   description  — texte de l'annonce
//   no_mention   — vendu par une agence, et rien dans l'annonce ne parle d'exclusivité :
//                  mandat simple (exclusivité « non » seulement)
//   advisor      — choisi par le conseiller
export const MANDATE_SOURCES = [
  'listing_data',
  'badge',
  'advertiser',
  'title',
  'description',
  'no_mention',
  'advisor',
] as const;
export type MandateSource = (typeof MANDATE_SOURCES)[number];

// Ce que la lecture d'une annonce sait dire. « particulier » n'est jamais lu (aucune annonce de
// particulier mesurée sur les portails qu'ACM lit) : seul le conseiller le pose.
export type ListingMandate = {
  soldBy: 'agency' | null;
  soldBySource: MandateSource | null;
  exclusivity: Exclusivity | null;
  exclusivitySource: MandateSource | null;
};

export const UNKNOWN_MANDATE: ListingMandate = {
  soldBy: null,
  soldBySource: null,
  exclusivity: null,
  exclusivitySource: null,
};

export const SOLD_BY_LABELS: Record<SoldBy, string> = {
  agency: 'Agence',
  private: 'Particulier',
};

export const EXCLUSIVITY_LABELS: Record<Exclusivity, string> = {
  yes: 'Oui',
  no: 'Non',
};

export const MANDATE_SOURCE_LABELS: Record<MandateSource, string> = {
  listing_data: 'donnée de l’annonce',
  badge: 'badge de l’annonce',
  advertiser: 'annonceur de l’annonce',
  title: 'titre de l’annonce',
  description: 'description de l’annonce',
  no_mention: 'aucune mention dans l’annonce',
  advisor: 'indiqué par vous',
};

export function isSoldBy(value: unknown): value is SoldBy {
  return (SOLD_BY_VALUES as readonly unknown[]).includes(value);
}

export function isExclusivity(value: unknown): value is Exclusivity {
  return (EXCLUSIVITY_VALUES as readonly unknown[]).includes(value);
}

export function isMandateSource(value: unknown): value is MandateSource {
  return (MANDATE_SOURCES as readonly unknown[]).includes(value);
}
