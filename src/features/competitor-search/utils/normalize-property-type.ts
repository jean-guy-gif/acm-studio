import { decodeHtmlEntities } from '@/features/comparable-import/utils/html-text';

// MISSION 50 — le type de bien, ramené à UN vocabulaire commun (subject_properties :
// apartment/house/land/building/commercial/parking). Indispensable pour la garde de
// type au classement : le bien vendeur porte un type saisi en TEXTE LIBRE FRANÇAIS
// (« appartement », « Maison 3 pièces »), les cartes portent un type déjà canonique
// (anglais). Sans normalisation commune, la garde compare des chaînes hétérogènes et
// ne protège rien.
//
// On reconnaît les deux : les mots français des portails ET le vocabulaire canonique
// anglais (import de brochure, données de démo). Inconnu → null : on n'exclut jamais
// pour une absence, seulement pour une DIFFÉRENCE avérée.
export function normalizePropertyType(text: string | null): string | null {
  if (text == null) {
    return null;
  }
  const t = decodeHtmlEntities(text).toLowerCase();
  if (/\b(appartements?|studios?|lofts?|duplex|apartments?|flats?)\b/.test(t)) {
    return 'apartment';
  }
  if (
    /\b(maisons?|villas?|mas|bastides?|chalets?|propri[ée]t[ée]s?|ch[aâ]teaux?|houses?)\b/.test(t)
  ) {
    return 'house';
  }
  if (/\b(terrains?|lands?)\b/.test(t)) {
    return 'land';
  }
  if (/\b(immeubles?|buildings?)\b/.test(t)) {
    return 'building';
  }
  if (/\b(locaux|local|bureaux?|commerces?|fonds\s+de\s+commerce|commercial|offices?)\b/.test(t)) {
    return 'commercial';
  }
  if (/\b(parkings?|garages?|box|boxes)\b/.test(t)) {
    return 'parking';
  }
  return null;
}
