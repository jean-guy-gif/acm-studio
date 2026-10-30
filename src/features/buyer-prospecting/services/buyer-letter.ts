import {
  LISTING_PORTAL_LABELS,
  extractListingKey,
} from '@/features/comparable-import/utils/extract-listing-key';
import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import { COLLABORATION_DECLINED_SENTENCE } from '@/features/prospecting-file/services/build-prospecting-file';
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

// Mission 120 B — la question du dossier au confrère ; vide pour le courrier au propriétaire.
export type BuyerLetterTexts = {
  title: string;
  letter: string;
  question: string;
  contactHook: string;
};

// Le courrier au propriétaire, ou le dossier de collaboration au confrère (bien en exclusivité).
export type BuyerLetterVersion = 'owner' | 'colleague';

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
  // Mission 120 B — le confrère a refusé la collaboration : la phrase de M115, proposée.
  { collaborationDeclined = false }: { collaborationDeclined?: boolean } = {},
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
      ...(collaborationDeclined ? [COLLABORATION_DECLINED_SENTENCE] : []),
      'Si vous le souhaitez, je vous présente cette recherche de vive voix, sans engagement de votre part.',
    ].join('\n\n'),
    question: '',
    contactHook: 'Parlons-en simplement',
  };
}

// Mission 120 B — la version du courrier, lue sur la carte : en exclusivité, le dossier au
// confrère ; un refus de collaboration le remet en courrier au propriétaire (M115). Pur.
export function buyerLetterVersion(
  exclusivity: string | null,
  collaborationDeclined: boolean,
): BuyerLetterVersion {
  return exclusivity === 'yes' && !collaborationDeclined ? 'colleague' : 'owner';
}

export const COLLEAGUE_QUESTION =
  'Votre mandat est-il ouvert à la collaboration pour une visite de mon acquéreur ?';

// Mission 120 B — le dossier de collaboration au confrère : qui écrit, le projet sans l'acquéreur
// (le secteur et ce que la fiche demande ET que l'annonce dit), et une seule question. Aucune
// condition présumée : ni honoraires, ni droit de visite. Pur.
export function defaultBuyerColleagueLetter(
  facts: BuyerProspectFacts,
  criteria: Criteria,
  sender: { advisorName: string; agencyName: string },
): BuyerLetterTexts {
  const features = matchingFeatures(facts, criteria);
  const where = facts.city ? ` à ${facts.city}` : '';
  const who = sender.advisorName.trim()
    ? `Je suis ${sender.advisorName.trim()}, conseiller chez ${sender.agencyName}. `
    : '';
  return {
    title: 'Une recherche qui correspond\nà *votre exclusivité.*',
    letter: [
      'Cher confrère,',
      `${who}J’accompagne une recherche${where} qui correspond aux caractéristiques de votre exclusivité${features ? ` : ${features}` : ''}.`,
    ].join('\n\n'),
    question: COLLEAGUE_QUESTION,
    contactHook: 'Votre réponse, en un appel',
  };
}

// La carte « Votre exclusivité » : le libellé neutre, l'annonce par son portail et son numéro
// (jamais le titre ni le lien, M87, M107), puis les seuls critères que la fiche demande ET que
// l'annonce dit. Pur.
export function colleagueExclusivityCard(
  facts: BuyerProspectFacts,
  criteria: Criteria,
  listingUrl: string | null,
): { label: string; reference: string | null; rows: { label: string; value: string }[] } {
  const type = normalizePropertyType(facts.propertyType);
  const rows: { label: string; value: string }[] = [];
  if (
    (type === 'house' && criteria.propertyTypes.includes('house')) ||
    (type === 'apartment' && criteria.propertyTypes.includes('apartment'))
  ) {
    rows.push({ label: 'Type', value: type === 'house' ? 'Maison' : 'Appartement' });
  }
  if (
    criteria.roomsMin != null &&
    facts.roomsCount != null &&
    facts.roomsCount >= criteria.roomsMin
  ) {
    rows.push({ label: 'Pièces', value: String(facts.roomsCount) });
  }
  if (
    criteria.surfaceMin != null &&
    facts.surfaceArea != null &&
    facts.surfaceArea >= criteria.surfaceMin
  ) {
    rows.push({ label: 'Surface', value: formatSquareMeters(Math.round(facts.surfaceArea)) });
  }
  const capital = (text: string) =>
    text.replace(/^(un|une) /, '').replace(/^./, (c) => c.toUpperCase());
  const outdoor = facts.outdoorSpaces.flatMap((space) => OUTDOOR_WORDS[space] ?? []);
  if (criteria.outdoor === true && outdoor.length > 0) {
    rows.push({
      label: 'Extérieurs',
      value: outdoor
        .map((word, index) => (index === 0 ? capital(word) : word.replace(/^(un|une) /, '')))
        .join(', '),
    });
  }
  const parking = facts.parkingTypes.flatMap((kind) => PARKING_WORDS[kind] ?? []);
  if (criteria.parking === true && parking.length > 0) {
    rows.push({ label: 'Stationnement', value: capital(parking[0]) });
  }
  if (criteria.pool === true && facts.hasPool === true) {
    rows.push({ label: 'Piscine', value: 'Oui' });
  }
  return {
    label: neutralComparableLabel({
      propertyType: normalizePropertyType(facts.propertyType),
      roomsCount: facts.roomsCount,
      surfaceArea: facts.surfaceArea,
      city: facts.city,
      district: facts.district,
    }),
    reference: listingReference(listingUrl),
    rows,
  };
}

// « Annonce SeLoger n° 26ZEJMLWB13Y » : le portail et l'identifiant publié (M47), sans le lien.
export function listingReference(listingUrl: string | null): string | null {
  const identity = listingUrl ? extractListingKey(listingUrl) : null;
  if (!identity) return null;
  const portal = LISTING_PORTAL_LABELS[identity.portal] ?? null;
  const number = identity.listingKey.replace(/\.html?$/i, '');
  return portal ? `Annonce ${portal} n° ${number}` : `Annonce n° ${number}`;
}

// Le destinataire du dossier au confrère : l'agence titulaire, jamais nommée (son nom n'est pas
// gardé, M83), et le bien par son libellé neutre.
export function colleagueAddressee(label: string): { lead: string; nameLines: string[] } {
  return { lead: 'À l’attention de', nameLines: ['Agence titulaire de l’exclusivité', label] };
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
