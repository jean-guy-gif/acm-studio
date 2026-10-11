import interLatin from './inter/inter-latin.woff2';
import montserratLatin from './montserrat/montserrat-latin.woff2';
import nunitoSansLatin from './nunito-sans/nunito-sans-latin.woff2';
import poppinsLatin400 from './poppins/poppins-latin-400.woff2';
import poppinsLatin500 from './poppins/poppins-latin-500.woff2';
import poppinsLatin600 from './poppins/poppins-latin-600.woff2';
import poppinsLatin700 from './poppins/poppins-latin-700.woff2';
import rajdhaniLatin500 from './rajdhani/rajdhani-latin-500.woff2';
import rajdhaniLatin600 from './rajdhani/rajdhani-latin-600.woff2';
import rajdhaniLatin700 from './rajdhani/rajdhani-latin-700.woff2';
import sourceSansLatin from './source-sans/source-sans-latin.woff2';
import workSansLatin from './work-sans/work-sans-latin.woff2';

import { isEmbeddedFontKey, type EmbeddedFontKey } from './font-registry';

// Mission 95 — les polices du Live se PRÉCHARGENT : sans cela, le premier écran montré au
// vendeur s'afficherait un instant dans la police de repli. On ne précharge que l'alphabet
// latin (celui du français) de la police réellement utilisée — celle de l'agence, sinon le
// défaut produit (Montserrat pour le texte, Rajdhani pour les titres), comme le faisait
// next/font. Les adresses sont celles que le build donne aux fichiers du dépôt : les mêmes que
// lit la feuille de style, donc un seul téléchargement.
const LATIN_FILES: Record<EmbeddedFontKey, readonly string[]> = {
  montserrat: [montserratLatin],
  inter: [interLatin],
  poppins: [poppinsLatin400, poppinsLatin500, poppinsLatin600, poppinsLatin700],
  'source-sans': [sourceSansLatin],
  'work-sans': [workSansLatin],
  'nunito-sans': [nunitoSansLatin],
};
const DEFAULT_FILES: readonly string[] = [
  montserratLatin,
  rajdhaniLatin500,
  rajdhaniLatin600,
  rajdhaniLatin700,
];

// `fontFamily` : la police d'une charte VALIDÉE, ou null. Une clé inconnue retombe sur le
// défaut produit, exactement comme la feuille de style (branding-typography).
export function liveFontPreloads(fontFamily: string | null): readonly string[] {
  return isEmbeddedFontKey(fontFamily) ? LATIN_FILES[fontFamily] : DEFAULT_FILES;
}
