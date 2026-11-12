// Mission 151 — principe 3 de la fiche : jamais de donnée sensible ni de jugement sur la personne
// dans ce qui s'enregistre (les Notes, leurs mots). La consigne le demande au modèle ; ici, le
// serveur le vérifie quand même, comme les mots interdits des courriers (M120). Pur.
//
// Un mot se cherche en DÉBUT de mot, accents et casse ignorés (« malad » attrape « malade »,
// « maladie »). La liste ne prétend pas tout voir : c'est la dernière garde, après la consigne et
// la relecture du conseiller. Les sources, seulement montrées à la validation et jamais gardées,
// ne passent pas par elle (règle des deux comptes, Jean-Guy, 12/11).

const REFUSED_STEMS = [
  // santé, la sienne ou celle d'un proche
  'malad',
  'sante',
  'enceinte',
  'grossesse',
  'handicap',
  'hopital',
  'hospital',
  'cancer',
  'traitement',
  'chimio',
  'medica',
  'therapi',
  'depress',
  // situation familiale ou conjugale
  'divorc',
  'separe',
  'separation',
  'veuf',
  'veuve',
  'mariage',
  'enfant',
  'bebe',
  'naissance',
  // religion, origine, nationalité
  'religi',
  'musulman',
  'juif',
  'chretien',
  'catholique',
  'nationalit',
  'origine',
  'etranger',
  'immigr',
  'suedois',
  'britannique',
  'americain',
  'maghreb',
  'africain',
  'asiatique',
  // patrimoine, revenus, origine des fonds
  'fortun',
  'rentier',
  'heritage',
  'herite',
  'salaire',
  'revenu',
  'apport',
  'patrimoine',
  'riche',
  'chomage',
  // métier, horaires de travail
  'travaille',
  'metier',
  'profession',
  'retraite',
  // jugement sur la personne, même aimable
  'radin',
  'presse',
  'difficile',
  'bavard',
  'agressi',
  'menac',
  'gentil',
  'sympa',
  'aimable',
  'mefi',
  'indecis',
  'perdu',
  'exigeant',
  'penible',
] as const;

const fold = (value: string): string => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Le premier mot refusé trouvé, ou null.
export function refusedWordIn(value: string): string | null {
  const words = fold(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  for (const stem of REFUSED_STEMS) {
    if (words.some((word) => word.startsWith(stem))) return stem;
  }
  return null;
}
