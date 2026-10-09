import { readFigaroMandateFacts } from '@/features/comparable-import/extractors/figaro-extractor';
import { decodeHtmlEntities } from '@/features/comparable-import/utils/html-text';
import { mainAdvertRegion } from '@/features/comparable-import/utils/main-advert-region';
import {
  isSearchResultsTitle,
  mentionsExclusivity,
} from '@/features/comparable-import/utils/mentions-exclusivity';
import {
  UNKNOWN_MANDATE,
  type ListingMandate,
  type MandateSource,
} from '@/features/competitor-mandate/types';

// Mission 83 — « Vendu par » et « Exclusivité » d'une annonce, lus là où chaque portail les
// publie. Mesuré le 09/10/2026 sur des annonces réelles (3 à 6 par portail) :
//
//   SeLoger      état de la page : `isExclusive` true/false, `isPrivateOwner`, `publisherType`
//   Bien'ici     « Mandat en exclusivité » (`labelInfo isExclusiveSaleMandate`) ; bloc annonceur
//   Figaro       état de l'application : `isExclusive` (présent si vrai), `origin`
//   Green Acres  badge « Exclusivité » du bloc titre ; nom de l'agence du bloc annonceur
//   Maisons et Appartements  rien de marqué (la description le dit) ; JSON-LD `seller`
//
// Ordre : donnée structurée, puis badge, puis titre, puis description. Rien d'autre ne décide :
// sans marque, la valeur reste inconnue (null) — jamais « non », que seul SeLoger sait dire.
// « particulier » n'est jamais lu : le conseiller le choisit. Aucune photo n'est lue.

type Marked = ListingMandate;

const NOTHING: Marked = { ...UNKNOWN_MANDATE };

const agency = (source: MandateSource): Pick<Marked, 'soldBy' | 'soldBySource'> => ({
  soldBy: 'agency',
  soldBySource: source,
});

// Toutes les valeurs d'une clé booléenne de l'état SeLoger. L'état est publié une fois, en JSON
// échappé, APRÈS les annonces similaires : il se lit donc sur la page entière (exception à M48).
// La garde est l'unanimité : deux valeurs différentes ne décident rien.
function unanimousFlag(html: string, key: string): boolean | null {
  const values = new Set(
    [...html.matchAll(new RegExp(`\\\\?"${key}\\\\?"\\s*:\\s*(true|false)`, 'g'))].map(
      (match) => match[1],
    ),
  );
  if (values.size !== 1) {
    return null;
  }
  return values.has('true');
}

function readSeLoger(html: string): Marked {
  const exclusive = unanimousFlag(html, 'isExclusive');
  const privateOwner = unanimousFlag(html, 'isPrivateOwner');
  const publisherTypes = new Set(
    [...html.matchAll(/\\?"publisherType\\?"\s*:\s*\\?"([A-Z_]+)\\?"/g)].map((match) => match[1]),
  );
  const isAgency =
    privateOwner === false || (publisherTypes.size === 1 && publisherTypes.has('AGENCY'));
  return {
    // `isPrivateOwner: true` ne pose PAS « particulier » : valeur jamais mesurée.
    ...(isAgency && privateOwner !== true ? agency('listing_data') : NOTHING),
    exclusivity: exclusive == null ? null : exclusive ? 'yes' : 'no',
    exclusivitySource: exclusive == null ? null : 'listing_data',
  };
}

function hasText(html: string, pattern: RegExp): boolean {
  const match = pattern.exec(html);
  return match != null && decodeHtmlEntities(match[1].replace(/<[^>]+>/g, ' ')).trim() !== '';
}

function readBienIci(html: string): Marked {
  // Le bloc de l'annonce s'arrête au carrousel des annonces similaires (M49), dont les cartes
  // portent leur propre badge « Exclusivité ».
  const region = mainAdvertRegion(html, "Bien'ici");
  const exclusive = /class="labelInfo isExclusiveSaleMandate"/.test(region);
  const about = region.indexOf('vue-about-agency');
  const named =
    about >= 0 &&
    hasText(region.slice(about), /class="agency-overview__info-name[^"]*"[^>]*>([\s\S]*?)<\/h1>/);
  return {
    ...(named ? agency('advertiser') : NOTHING),
    exclusivity: exclusive ? 'yes' : null,
    exclusivitySource: exclusive ? 'badge' : null,
  };
}

function readFigaro(html: string): Marked {
  const facts = readFigaroMandateFacts(html);
  return {
    ...(facts.origin === 'professionnel' ? agency('listing_data') : NOTHING),
    exclusivity: facts.isExclusive ? 'yes' : null,
    exclusivitySource: facts.isExclusive ? 'listing_data' : null,
  };
}

function readGreenAcres(html: string): Marked {
  // Les cartes « Nos annonces similaires » portent le MÊME badge (`tag__label`), dans leur
  // photo, avant l'ancre de M49 : le bloc de l'annonce s'arrête donc ici à la première carte.
  const firstCard = html.search(/class="announce-card\b/);
  const region = firstCard >= 0 ? html.slice(0, firstCard) : html;
  const exclusive =
    /<span class="tag__label">\s*Exclusivit(?:é|&eacute;|&#xE9;|&#233;)\s*<\/span>/i.test(region);
  const named = hasText(
    region,
    /<span class="(?:advert-detail-agency-name|seller-name)"[^>]*>([\s\S]*?)<\/span>/,
  );
  return {
    ...(named ? agency('advertiser') : NOTHING),
    exclusivity: exclusive ? 'yes' : null,
    exclusivitySource: exclusive ? 'badge' : null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Maisons et Appartements : le vendeur de l'OFFRE, dans les données structurées. La page n'en
// publie qu'un (mesuré) ; deux vendeurs ne décident rien.
function readMaisonsEtAppartements(html: string): Marked {
  const sellers: unknown[] = [];
  for (const block of html.matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(block[1]);
    } catch {
      continue;
    }
    for (const node of Array.isArray(parsed) ? parsed : [parsed]) {
      const offers = isRecord(node) ? node.offers : undefined;
      if (isRecord(offers) && offers.seller !== undefined) {
        sellers.push(offers.seller);
      }
    }
  }
  const seller = sellers.length === 1 ? sellers[0] : null;
  const isOrganization =
    isRecord(seller) &&
    seller['@type'] === 'Organization' &&
    typeof seller.name === 'string' &&
    seller.name.trim() !== '';
  return { ...NOTHING, ...(isOrganization ? agency('listing_data') : {}) };
}

const READERS: Record<string, (html: string) => Marked> = {
  SeLoger: readSeLoger,
  "Bien'ici": readBienIci,
  'Figaro Immobilier': readFigaro,
  'Green Acres': readGreenAcres,
  'Maisons et Appartements': readMaisonsEtAppartements,
};

// Ce que la PAGE marque (donnée structurée, badge, bloc annonceur). Un portail non mesuré ne
// marque rien.
export function readMarkedMandate(html: string, source: string): ListingMandate {
  return READERS[source]?.(html) ?? { ...UNKNOWN_MANDATE };
}

// La lecture complète : ce que la page marque, puis — pour l'exclusivité seulement — le titre
// et la description de l'annonce, tels que l'import les a retenus (déjà cadrés au bloc de
// l'annonce, M48/M49). Le texte ne dit jamais « non », et ne dit rien du vendeur.
export function readListingMandate(input: {
  marked: ListingMandate;
  title: string | null;
  description: string | null;
}): ListingMandate {
  const { marked, title, description } = input;
  if (marked.exclusivity != null) {
    return marked;
  }
  if (title && !isSearchResultsTitle(title) && mentionsExclusivity(title)) {
    return { ...marked, exclusivity: 'yes', exclusivitySource: 'title' };
  }
  if (mentionsExclusivity(description)) {
    return { ...marked, exclusivity: 'yes', exclusivitySource: 'description' };
  }
  return marked;
}
