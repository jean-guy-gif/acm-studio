import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';
import type { BuyerProspectFacts } from '@/features/buyer-prospecting/types';
import type { Buyer } from '@/features/buyers/types';
import { addressLines } from '@/features/prospecting-file/services/addressee-lines';
import { formatSquareMeters } from '@/lib/format';

// Mission 120 — le courrier au propriétaire né d'une recherche acquéreur. Pur. Il dit ce que la
// recherche demande ET que le bien a — le type, les pièces, la surface, les extérieurs — et pose
// une seule question : une visite est-elle envisageable ? Jamais le nom de l'acquéreur, jamais
// son budget, jamais une promesse (« acquéreur certain », « offre », « visite prête » : dossier
// du 22/10, §10.2, garde-fou). Le conseiller réécrit tout ; un texte qui contient un mot interdit
// est refusé, à l'écran comme au serveur.

export type BuyerLetterTexts = { title: string; letter: string; contactHook: string };

const OUTDOOR_WORDS: Record<string, string> = {
  balcony: 'un balcon',
  terrace: 'une terrasse',
  garden: 'un jardin',
  loggia: 'une loggia',
  veranda: 'une véranda',
  roof_terrace: 'un toit-terrasse',
};

const PARKING_WORDS: Record<string, string> = {
  garage: 'un garage',
  closed_box: 'un box fermé',
  indoor_parking: 'un parking couvert',
  outdoor_parking: 'un parking extérieur',
  carport: 'un carport',
};

const joinFr = (parts: string[]): string =>
  parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} et ${parts.at(-1)}`;

type Criteria = Pick<
  Buyer,
  'propertyTypes' | 'roomsMin' | 'surfaceMin' | 'outdoor' | 'parking' | 'pool'
>;

// « maison de 7 pièces, 200 m², avec une terrasse, un jardin et une piscine » : ce que la fiche
// demande et que l'annonce dit. Un critère que la fiche ne demande pas, ou que l'annonce ne dit
// pas, n'y est pas.
export function matchingFeatures(facts: BuyerProspectFacts, criteria: Criteria): string | null {
  const type = normalizePropertyType(facts.propertyType);
  const kind =
    type === 'house' && criteria.propertyTypes.includes('house')
      ? 'maison'
      : type === 'apartment' && criteria.propertyTypes.includes('apartment')
        ? 'appartement'
        : null;
  const rooms =
    criteria.roomsMin != null && facts.roomsCount != null && facts.roomsCount >= criteria.roomsMin
      ? `${facts.roomsCount} pièce${facts.roomsCount > 1 ? 's' : ''}`
      : null;
  const surface =
    criteria.surfaceMin != null &&
    facts.surfaceArea != null &&
    facts.surfaceArea >= criteria.surfaceMin
      ? formatSquareMeters(Math.round(facts.surfaceArea))
      : null;
  const extras = [
    ...(criteria.outdoor === true
      ? facts.outdoorSpaces.flatMap((space) => OUTDOOR_WORDS[space] ?? [])
      : []),
    ...(criteria.parking === true
      ? facts.parkingTypes.flatMap((parking) => PARKING_WORDS[parking] ?? []).slice(0, 1)
      : []),
    ...(criteria.pool === true && facts.hasPool === true ? ['une piscine'] : []),
  ];
  const head = [kind ? (rooms ? `${kind} de ${rooms}` : kind) : rooms, surface].filter(
    (part): part is string => part != null,
  );
  const withExtras = extras.length > 0 ? `avec ${joinFr(extras)}` : null;
  const parts = [...head, ...(withExtras ? [withExtras] : [])];
  return parts.length > 0 ? parts.join(', ') : null;
}

export function defaultBuyerLetter(
  facts: BuyerProspectFacts,
  criteria: Criteria,
): BuyerLetterTexts {
  const features = matchingFeatures(facts, criteria);
  const subject = features
    ? `J’accompagne une recherche qui correspond aux caractéristiques de votre bien : ${features}.`
    : 'J’accompagne une recherche qui correspond aux caractéristiques de votre bien.';
  return {
    title: 'Une recherche qui correspond à *votre bien*',
    letter: [
      'Madame, Monsieur,',
      `${subject} Je souhaiterais vérifier avec vous si une visite est envisageable.`,
      'Si vous le souhaitez, je vous présente cette recherche de vive voix, sans engagement de votre part.',
    ].join('\n\n'),
    contactHook: 'Parlons-en simplement',
  };
}

// Les mots qui promettraient ce que le conseiller ne sait pas (dossier du 22/10, §10.2).
const PROMISES = [/\bcertaine?s?\b/i, /\boffres?\b/i, /\bprête?s?\b/i];

export const BUYER_LETTER_FORBIDDEN_MESSAGE =
  'Le courrier ne nomme ni l’acquéreur ni son budget, et ne promet rien (« certain », « offre », « prête ») : retirez ce mot.';

const words = (value: string): string[] =>
  value
    .toLocaleLowerCase('fr-FR')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3);

// Un texte réécrit qui nomme l'acquéreur (un mot de son nom de plus de deux lettres, hors
// « famille », « monsieur », « madame »), dit son budget, ou promet : refusé.
export function buyerLetterForbidden(
  texts: string[],
  buyer: Pick<Buyer, 'name' | 'budgetIdeal' | 'budgetMax'>,
): boolean {
  const all = texts.join('\n');
  if (PROMISES.some((pattern) => pattern.test(all))) {
    return true;
  }
  const generic = new Set(['famille', 'monsieur', 'madame', 'mme', 'les', 'and', 'et']);
  const nameWords = words(buyer.name).filter((word) => !generic.has(word));
  const textWords = new Set(words(all));
  if (nameWords.some((word) => textWords.has(word))) {
    return true;
  }
  const digits = all.replace(/[\s  .]/g, '');
  return [buyer.budgetIdeal, buyer.budgetMax].some(
    (amount) => amount != null && amount > 0 && digits.includes(String(amount)),
  );
}

// Le destinataire, comme le courrier propriétaire (M87) : un appartement s'écrit à ses
// copropriétaires (l'immeuble est connu, pas le lot), l'adresse ne se coupe pas au milieu.
export function buyerLetterAddressee(
  facts: Pick<BuyerProspectFacts, 'propertyType'>,
  address: string,
): { lead: string; nameLines: string[] } {
  const who =
    normalizePropertyType(facts.propertyType) === 'apartment'
      ? 'Aux copropriétaires'
      : 'Au propriétaire';
  const text = address.trim();
  return { lead: /^\d/.test(text) ? `${who} du` : who, nameLines: addressLines(text) };
}
