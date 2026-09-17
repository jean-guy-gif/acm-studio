import { decodeHtmlEntities } from '@/features/comparable-import/utils/html-text';

// Mission 49 (revue) — règle commune aux 4 portails : un portail qui publie des
// caractéristiques STRUCTURÉES coche d'après elles ; un portail qui ne les a QUE dans
// la prose (Green Acres, Maisons et Appartements) les PROPOSE — ligne « — à confirmer »
// — et ne coche rien. Une case fausse devant un vendeur coûte plus qu'une case vide.
//
// Ce lecteur lit les extérieurs mentionnés dans un TEXTE DÉJÀ CADRÉ à l'annonce
// (mainAdvertRegion chez Green Acres, description Product chez M&A ; jamais la page
// entière). Conservateur : une terrasse / un jardin seulement avec leur surface, un
// parking seulement avec un nombre, un balcon nommé. « Structure/extérieur à
// restaurer » (état du bâti) ne matche rien de tout ça.

const FR_NUMBER_WORDS: Record<string, number> = {
  un: 1,
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
  sept: 7,
  huit: 8,
  neuf: 9,
};

// « terrasse de 56 m² », « jardin d'environ 60 m2 » → « terrasse (56 m²) ».
function areaMention(text: string, word: string): string | null {
  const match = text.match(
    new RegExp(`${word}\\s+(?:de\\s+|d['’]\\s*environ\\s+)?(\\d+(?:[.,]\\d+)?)\\s*m(?:²|2)`, 'i'),
  );
  return match ? `${word} (${match[1].replace('.', ',')} m²)` : null;
}

export function readOutdoorSuggestions(scopedText: string): string[] {
  const text = decodeHtmlEntities(scopedText).replace(/ /g, ' ');
  const suggestions: string[] = [];

  const terrace = areaMention(text, 'terrasse');
  if (terrace) {
    suggestions.push(terrace);
  }
  const garden = areaMention(text, 'jardin');
  if (garden) {
    suggestions.push(garden);
  }
  if (/\bbalcon\b/i.test(text) && !suggestions.some((item) => item.startsWith('balcon'))) {
    suggestions.push('balcon');
  }

  const parking = text.match(
    /\b(\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf)\s+places?\s+de\s+parking/i,
  );
  if (parking) {
    const raw = parking[1].toLowerCase();
    const count = /^\d+$/.test(raw) ? Number.parseInt(raw, 10) : FR_NUMBER_WORDS[raw];
    if (count && count > 0) {
      suggestions.push(`${count} place${count > 1 ? 's' : ''} de parking`);
    }
  }

  return suggestions;
}
