// Mission 98 — UNE normalisation des adresses postales pour la prospection : elle dit que deux
// adresses confirmées désignent le même bien, et c'est sur elle que porte la liste « Ne plus
// solliciter ». « 8, av. du Dr Hochet — 06160 ANTIBES » et « 8 avenue du docteur Hochet 06160
// Antibes » donnent la même clé. Pur, et sans aucun import : la procédure d'effacement
// (`npm run cle-adresse`) charge ce fichier tel quel.

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
};

export const ADDRESS_KEY_MAX_LENGTH = 300;

// La clé de comparaison ; null pour une adresse absente ou vide.
export function addressKey(address: string | null | undefined): string | null {
  if (address == null) {
    return null;
  }
  const key = address
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => ABBREVIATIONS[word] ?? word)
    // Le pays n'identifie rien : « …, France » et l'adresse sans pays sont la même.
    .filter((word, index, words) => !(word === 'france' && index === words.length - 1))
    .join(' ')
    .slice(0, ADDRESS_KEY_MAX_LENGTH)
    .trim();
  return key === '' ? null : key;
}
