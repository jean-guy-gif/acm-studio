import { decodeHtmlEntities } from '@/features/comparable-import/utils/html-text';
import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';

// MISSION 77 — le type de bien d'une annonce, en vocabulaire canonique (apartment, house…).
// Mesuré sur les six fixtures : Bien'ici, SeLoger et Green Acres le publient dans un segment de
// l'adresse (« …/vente/cagnes-sur-mer/maison/… ») ; les six le publient dans le titre.
//
// Le type est un filtre dur (M54) : une valeur fausse est pire qu'une case vide. On ne lit donc
// que ce qui est sans équivoque — un segment d'adresse qui EST un type, sinon un titre qui ne
// nomme qu'UN type. Un titre qui en nomme deux (« Maison avec garage ») ne décide rien.

function typeFromUrlPath(listingUrl: string): string | null {
  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(listingUrl).pathname);
  } catch {
    return null;
  }
  // Segment entier, en lettres seulement : « maison » compte, « le-mas » (une commune) non.
  // Jamais le nom de domaine (« maisonsetappartements.fr »).
  for (const segment of pathname.toLowerCase().split('/')) {
    if (/^\p{L}+$/u.test(segment)) {
      const type = normalizePropertyType(segment);
      if (type != null) {
        return type;
      }
    }
  }
  return null;
}

function typeFromTitle(title: string | null): string | null {
  if (title == null) {
    return null;
  }
  const types = new Set<string>();
  for (const word of decodeHtmlEntities(title).split(/[^\p{L}]+/u)) {
    const type = normalizePropertyType(word);
    if (type != null) {
      types.add(type);
    }
  }
  return types.size === 1 ? [...types][0] : null;
}

export function detectListingPropertyType(title: string | null, listingUrl: string): string | null {
  return typeFromUrlPath(listingUrl) ?? typeFromTitle(title);
}
