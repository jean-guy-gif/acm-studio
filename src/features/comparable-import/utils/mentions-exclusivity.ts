// Mission 83 — un TEXTE d'annonce (titre, description) dit-il que le bien est en exclusivité ?
//
// Le nom « exclusivité » le dit (« Exclusivité. », « en exclusivité », « mandat en
// exclusivité »), comme « mandat exclusif » et « exclusif » posé seul en accroche (« EXCLUSIF -
// Nice Nord »). L'adjectif dans une phrase ne dit rien du mandat : « quartier exclusif »,
// « jouissance exclusive », « exclusivement » ne comptent pas. Une exclusivité niée (« sans
// exclusivité ») ne compte pas non plus — et ne prouve pas l'inverse : le texte ne dit jamais
// « non ».

const LETTER = '\\p{L}';
const NOUN = new RegExp(`(?<!${LETTER})exclusivit[ée]s?(?!${LETTER})`, 'giu');
const DENIED_BEFORE = /(?:\bsans|\bpas\s+d[’']|\bpas\s+en|\bpas\s+une|\bnon|\baucune)\s+$/iu;
const EXCLUSIVE_MANDATE = new RegExp(`(?<!${LETTER})mandat\\s+exclusif(?!${LETTER})`, 'iu');
// « Exclusif » seul : en tête de texte ou de segment, et suivi d'une ponctuation ou de la fin.
const STANDALONE = new RegExp(`(?:^|[.!?:;|•·\\n–—-])\\s*exclusif\\s*(?:$|[.!?:;|•·\\n–—-])`, 'iu');

export function mentionsExclusivity(text: string | null | undefined): boolean {
  if (!text) {
    return false;
  }
  for (const match of text.matchAll(NOUN)) {
    if (!DENIED_BEFORE.test(text.slice(0, match.index))) {
      return true;
    }
  }
  if (EXCLUSIVE_MANDATE.test(text)) {
    return !/(?:\bsans|\bpas\s+de|\bnon)\s+mandat\s+exclusif/iu.test(text);
  }
  return STANDALONE.test(text);
}

// Le titre d'une page de RÉSULTATS n'est pas le titre d'une annonce : il compte des biens
// (« 1 573 maisons à vendre en exclusivité », mesuré sur Green Acres) et son « exclusivité » est
// un slogan du portail.
export function isSearchResultsTitle(title: string): boolean {
  return /\d[\d\s  ]*\s*(?:annonces?|maisons?|appartements?|biens?|propri[ée]t[ée]s?|villas?)\b/iu.test(
    title,
  );
}
