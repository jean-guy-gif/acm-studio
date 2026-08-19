// Liste des caractéristiques telle que le portail l'affiche.
//
// Terrain (19/08) : sur les CINQ portails testés, `listingFeatures` sortait
// vide. Seul le lecteur de données structurées la remplissait, et aucune des
// pages n'en contenait. Autrement dit, les « Terrasse », « Garage »,
// « Ascenseur », « Piscine » affichés en clair à côté de l'annonce n'entraient
// jamais dans l'outil.
//
// Deux formes couvrent ce qu'on a rencontré :
//   1. une liste d'éléments dans un bloc « caractéristiques » ;
//   2. une énumération en une phrase — Belles Demeures écrit
//      « dispose des atouts suivants: Piscine,Terrasse,3 Parkings ».

import {
  decodeHtmlEntities,
  htmlFragmentToText,
} from '@/features/comparable-import/utils/decode-html-text';
import { collectBlocksByAttribute } from '@/features/comparable-import/utils/extract-visible-blocks';

const FEATURES_HINT =
  /(^|[^a-z])(caracteristique|caractéristique|critere|critère|atout|equipement|équipement|prestation|amenit|feature|specs?|infos?[-_]?bien|detail[-_]?bien)/i;

// Une caractéristique tient en quelques mots : « Terrasse », « Garage fermé »,
// « Ascenseur ». Plus long, c'est une phrase de description ; plus court, c'est
// une puce vide.
const MIN_ITEM = 3;
const MAX_ITEM = 60;

// Étiquettes d'interface qui traînent dans ces blocs et n'ont rien à faire dans
// les caractéristiques d'un bien.
const NOISE =
  /^(voir|afficher|masquer|plus|moins|tout|fermer|suivant|precedent|précédent|partager|imprimer|contact|favoris|caracteristiques|caractéristiques|criteres|critères|atouts|equipements|équipements|prestations|description|en savoir plus)\b/i;

function cleanItem(raw: string): string | null {
  const item = raw
    .replace(/\s+/g, ' ')
    .replace(/^[•\-–—*·:]+\s*/, '')
    .trim();
  if (item.length < MIN_ITEM || item.length > MAX_ITEM || NOISE.test(item)) {
    return null;
  }
  // Une « caractéristique » entièrement numérique est une valeur sans son
  // étiquette : elle n'apprend rien et polluerait la fiche.
  if (!/[a-zA-Zà-ÿ]/.test(item)) {
    return null;
  }
  return item;
}

// Forme 1 : les éléments d'une liste à l'intérieur d'un bloc caractéristiques.
function fromLists(html: string): string[] {
  const items: string[] = [];
  for (const block of collectBlocksByAttribute(html, FEATURES_HINT)) {
    for (const match of block.matchAll(/<(li|dd|td)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi)) {
      const item = cleanItem(htmlFragmentToText(match[2]));
      if (item != null) {
        items.push(item);
      }
    }
  }
  return items;
}

// Forme 2 : l'énumération en une phrase, séparée par des virgules.
const INLINE_ENUMERATION =
  /(?:atouts suivants|caracteristiques suivantes|caractéristiques suivantes|equipements suivants|équipements suivants)\s*:\s*([^.<"]{3,200})/gi;

function fromSentence(html: string): string[] {
  const items: string[] = [];
  const text = decodeHtmlEntities(html);
  for (const match of text.matchAll(INLINE_ENUMERATION)) {
    for (const part of match[1].split(/[,;]/)) {
      const item = cleanItem(part);
      if (item != null) {
        items.push(item);
      }
    }
  }
  return items;
}

// Caractéristiques trouvées, dans l'ordre d'apparition et sans doublon (la
// comparaison ignore la casse : « Terrasse » et « terrasse » sont la même).
export function extractVisibleFeatures(html: string): string[] {
  const seen = new Set<string>();
  const features: string[] = [];
  for (const item of [...fromLists(html), ...fromSentence(html)]) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      features.push(item);
    }
  }
  return features;
}

// Certaines lignes de ces blocs répètent une donnée qui a déjà sa propre colonne
// (année de construction, énergie, DPE…). La règle du projet est de ne pas la
// dupliquer dans la liste libre — mais elle reste utile pour déduire l'état ou
// les équipements, donc on la retire de l'AFFICHAGE, pas de la lecture.
const DEDICATED_COLUMN =
  /^(annee de construction|année de construction|source|sources|chauffage|dpe|ges|classe|consommation|emission|émission|prix|surface|budget|charges|taxe|honoraires|copropriete|copropriété)\b/i;

export function isDedicatedColumnLine(feature: string): boolean {
  return DEDICATED_COLUMN.test(feature.trim());
}
