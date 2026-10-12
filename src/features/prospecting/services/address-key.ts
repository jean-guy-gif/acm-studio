// Mission 98 — UNE normalisation des adresses postales pour la prospection : elle dit que deux
// adresses confirmées désignent le même bien, et c'est sur elle que porte la liste « Ne plus
// solliciter ». « 8, av. du Dr Hochet — 06160 ANTIBES » et « 8 avenue du docteur Hochet 06160
// Antibes » donnent la même clé. Pur, et sans aucun import : la procédure d'effacement
// (`npm run cle-adresse`) charge ce fichier tel quel.
//
// Mission 102 — une opposition ne s'esquive plus par l'écriture de l'adresse. La clé ignore :
//   • le code postal (« Antibes » et « 06160 Antibes » sont la même commune) ;
//   • le nom d'usage de la commune (M86 : Juan-les-Pins = Antibes…) ;
//   • la façon d'écrire un arrondissement (M99 : « 75015 Paris », « Paris 15e », « Paris 15ème ») ;
//   • l'étage, le bâtiment, l'appartement, « bis » et « ter » : `addressKey` désigne l'IMMEUBLE.
// `unitAddressKey` garde ces précisions : c'est elle qui regroupe deux copies d'un même bien
// (M98) — fusionner le 8 et le 8 bis, ou deux étages, serait une fausse fusion.

const ABBREVIATIONS: Record<string, string> = {
  av: 'avenue',
  ave: 'avenue',
  bd: 'boulevard',
  bld: 'boulevard',
  blvd: 'boulevard',
  boul: 'boulevard',
  ch: 'chemin',
  che: 'chemin',
  rte: 'route',
  pl: 'place',
  imp: 'impasse',
  all: 'allee',
  sq: 'square',
  res: 'residence',
  dr: 'docteur',
  st: 'saint',
  ste: 'sainte',
  bat: 'batiment',
  appt: 'appartement',
  apt: 'appartement',
  etg: 'etage',
};

// Les noms d'usage d'une commune (M86), écrits comme la clé les rend. La liste fait foi dans
// `commune-alias.ts` ; un test vérifie que chacune de ses égalités est reprise ici.
const COMMUNE_ALIASES: [string[], string[]][] = [
  [['juan', 'les', 'pins'], ['antibes']],
  [['cap', 'd', 'antibes'], ['antibes']],
  [['golfe', 'juan'], ['vallauris']],
  [
    ['cros', 'de', 'cagnes'],
    ['cagnes', 'sur', 'mer'],
  ],
  [['la', 'bocca'], ['cannes']],
];

// Paris, Lyon, Marseille (M99) : nombre d'arrondissements et base du code postal.
const ARRONDISSEMENT_CITIES: Record<string, { count: number; postalBase: number }> = {
  paris: { count: 20, postalBase: 75000 },
  lyon: { count: 9, postalBase: 69000 },
  marseille: { count: 16, postalBase: 13000 },
};

export const ADDRESS_KEY_MAX_LENGTH = 300;

const ORDINAL = /^(\d{1,2})(?:er|ere|e|eme|nd)?$/;
// Ce qui désigne un bâtiment ou un appartement : « B », « 12 », « A2 ».
const UNIT_NAME = /^(?:[a-z]\d{0,3}|\d{1,4}[a-z]?)$/;

const endsWith = (words: string[], tail: string[]): boolean =>
  tail.length <= words.length &&
  tail.every((word, index) => words[words.length - tail.length + index] === word);

// Étage, bâtiment, appartement, bis et ter : ils précisent un lot, pas l'immeuble.
function withoutUnit(words: string[]): string[] {
  const kept: string[] = [];
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    const next = words[index + 1];
    if (word === 'bis' || word === 'ter') {
      continue;
    }
    // « 8bis » : le numéro reste.
    const glued = /^(\d+)(?:bis|ter)$/.exec(word);
    if (glued) {
      kept.push(glued[1]);
      continue;
    }
    if (word === 'etage') {
      // « 2e étage » : l'ordinal est déjà gardé, on le retire ; « étage 2 » : le suivant saute.
      if (kept.length > 1 && ORDINAL.test(kept[kept.length - 1])) {
        kept.pop();
      } else if (next != null && ORDINAL.test(next)) {
        index += 1;
      }
      continue;
    }
    if (word === 'batiment' || word === 'appartement') {
      if (next != null && UNIT_NAME.test(next)) {
        index += 1;
      }
      continue;
    }
    kept.push(word);
  }
  return kept;
}

// L'arrondissement nommé en fin d'adresse (« paris 15e arrondissement ») ou porté par le code
// postal : une seule écriture, « paris 15 ». Nom et code postal en désaccord : la ville seule.
function withArrondissement(words: string[], postalCodes: string[]): string[] {
  const tail = [...words];
  if (tail[tail.length - 1] === 'arrondissement') {
    tail.pop();
  }
  const ordinal = ORDINAL.exec(tail[tail.length - 1] ?? '');
  const named =
    ordinal && tail[tail.length - 2] in ARRONDISSEMENT_CITIES ? Number(ordinal[1]) : null;
  if (named != null) {
    tail.pop();
  }
  const city = tail[tail.length - 1];
  const facts = ARRONDISSEMENT_CITIES[city];
  if (facts == null) {
    return words;
  }
  const fromPostal = postalCodes
    .map((code) => (code === '75116' ? 16 : Number(code) - facts.postalBase))
    .find((number) => number >= 1 && number <= facts.count);
  if (named != null && (named < 1 || named > facts.count)) {
    return words;
  }
  if (named != null && fromPostal != null && named !== fromPostal) {
    return tail;
  }
  const number = named ?? fromPostal;
  return number == null ? tail : [...tail, String(number)];
}

function buildKey(address: string | null | undefined, keepUnit: boolean): string | null {
  if (address == null) {
    return null;
  }
  let words = address
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => ABBREVIATIONS[word] ?? word)
    // Le pays n'identifie rien : « …, France » et l'adresse sans pays sont la même.
    .filter((word, index, all) => !(word === 'france' && index === all.length - 1));

  // Le code postal ne fait pas une autre adresse ; en tête, cinq chiffres sont un numéro.
  const postalCodes = words.filter((word, index) => index > 0 && /^\d{5}$/.test(word));
  words = words.filter((word, index) => !(index > 0 && /^\d{5}$/.test(word)));
  if (!keepUnit) {
    words = withoutUnit(words);
  }
  for (const [alias, commune] of COMMUNE_ALIASES) {
    if (endsWith(words, alias)) {
      const before = words.slice(0, words.length - alias.length);
      // « Cannes La Bocca » : la commune est déjà dite.
      words = endsWith(before, commune) ? before : [...before, ...commune];
      break;
    }
  }
  words = withArrondissement(words, postalCodes);

  const key = words.join(' ').slice(0, ADDRESS_KEY_MAX_LENGTH).trim();
  return key === '' ? null : key;
}

// La clé de l'IMMEUBLE, sur laquelle porte la liste « Ne plus solliciter » ; null pour une
// adresse absente ou vide. Appliquée à une clé, elle la rend inchangée.
export function addressKey(address: string | null | undefined): string | null {
  return buildKey(address, false);
}

// La même, étage, bâtiment, appartement, « bis » et « ter » compris : deux copies d'un même bien.
export function unitAddressKey(address: string | null | undefined): string | null {
  return buildKey(address, true);
}
