// Description de l'annonce telle qu'elle s'affiche dans la page.
//
// Terrain (19/08) : mesuré sur cinq pages réelles, la description récupérée
// faisait 38 caractères sur Green Acres, 109 sur Belles Demeures, 200 sur
// Le Figaro — c'était la balise `meta`, un simple titre. Le vrai texte, celui
// qui mentionne « parking fermé », « balcons », « exposition sud-ouest », vit
// dans le corps de la page, encodé.
//
// Conséquence directe pour Laurent : les cases « extérieurs » et
// « stationnement » ne se cochaient jamais, faute de texte à lire.

import { htmlFragmentToText } from '@/features/comparable-import/utils/decode-html-text';
import { collectBlocksByAttribute } from '@/features/comparable-import/utils/extract-visible-blocks';

// Classes et identifiants employés par les portails pour le texte de l'annonce.
const DESCRIPTION_HINT =
  /(^|[^a-z])(descriptif|description|texte[-_]?annonce|annonce[-_]?texte|property[-_]?text|listing[-_]?text|bien[-_]?description)/i;

// En deçà, c'est un titre ou une étiquette, pas une description.
const MIN_LENGTH = 120;
// Au-delà, on a happé une section entière de la page.
const MAX_LENGTH = 8_000;

export function extractVisibleDescription(html: string): string | null {
  let best: string | null = null;

  for (const block of collectBlocksByAttribute(html, DESCRIPTION_HINT)) {
    const text = htmlFragmentToText(block);
    if (text.length < MIN_LENGTH || text.length > MAX_LENGTH) {
      continue;
    }
    if (best == null || text.length > best.length) {
      best = text;
    }
  }

  return best;
}
