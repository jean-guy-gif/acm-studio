import generated from '@/features/demo/data/photo-sets.generated.json';

// Mission 155 — un jeu de photos par bien (décision de Jean-Guy, 13/11) : toutes les photos d'un
// bien montrent le même bien, et aucune photo n'est partagée entre deux biens. Chaque jeu vit dans
// son dossier, `public/demo/photos/<bien>/`, en fichiers `01-facade.jpg`, `02-sejour.jpg`… : le
// numéro donne l'ordre, le premier est la photo principale. `scripts/demo-photo-sets.mjs` relit
// les dossiers avant la compilation, la vérification des types et les tests ; déposer un jeu
// complet dans son dossier suffit. Tant qu'un bien n'a pas son jeu, il garde ses photos d'avant.
// Le format et les fiches de chaque bien sont dans docs/DEMO.md.

const SETS: Readonly<Record<string, readonly string[]>> = generated;

// Les dossiers attendus : un par bien qui a sa fiche photo dans docs/DEMO.md. Un dossier qui n'est
// pas ici est refusé par les tests (une faute de frappe ne passerait pas en silence).
export const DEMO_PHOTO_SET_IDS = [
  // Les huit mandats signés.
  'mandat-mougins-villa',
  'mandat-antibes-appartement',
  'mandat-vence-maison',
  'mandat-juan-les-pins-appartement',
  'mandat-villeneuve-loubet-appartement',
  'mandat-la-colle-sur-loup-maison',
  'mandat-saint-paul-de-vence-maison',
  'mandat-valbonne-villa',
  // Les quatre autres dossiers.
  'a-preparer-antibes-appartement',
  'live-vence-maison',
  'directe-vence-maison',
  'relance-antibes-appartement',
] as const;

export const DEMO_PHOTO_SET_RULES = {
  minPhotos: 3,
  maxPhotos: 6,
  width: 1600,
  height: 1200,
  maxBytes: 400 * 1024,
} as const;

// Les vues de chaque mandat, dans l'ordre de sa fiche photo (docs/DEMO.md ; un test compare les
// deux). Un jeu ne s'affiche que complet : tant qu'il lui manque une vue, il ne montre rien et le
// bien garde ses photos d'avant (décision de Jean-Guy, 14/11). Les numéros d'un dossier se suivent
// toujours depuis 01 (`demo-photo-sets.test.ts`) : seule la ou les dernières vues peuvent attendre.
export const DEMO_PHOTO_SET_VIEWS: Partial<
  Record<(typeof DEMO_PHOTO_SET_IDS)[number], readonly string[]>
> = {
  'mandat-mougins-villa': [
    '01-facade.jpg',
    '02-sejour.jpg',
    '03-cuisine.jpg',
    '04-chambre.jpg',
    '05-salle-de-bain.jpg',
    '06-jardin.jpg',
  ],
  'mandat-antibes-appartement': [
    '01-facade.jpg',
    '02-sejour.jpg',
    '03-terrasse.jpg',
    '04-cuisine.jpg',
    '05-chambre.jpg',
    '06-salle-de-bain.jpg',
  ],
  'mandat-vence-maison': [
    '01-facade.jpg',
    '02-sejour.jpg',
    '03-cuisine.jpg',
    '04-chambre.jpg',
    '05-salle-de-bain.jpg',
    '06-jardin.jpg',
  ],
  'mandat-juan-les-pins-appartement': [
    '01-facade.jpg',
    '02-sejour.jpg',
    '03-cuisine.jpg',
    '04-chambre.jpg',
    '05-balcon.jpg',
  ],
  'mandat-villeneuve-loubet-appartement': [
    '01-facade.jpg',
    '02-sejour.jpg',
    '03-chambre.jpg',
    '04-salle-d-eau.jpg',
    '05-balcon.jpg',
  ],
  'mandat-la-colle-sur-loup-maison': [
    '01-facade.jpg',
    '02-sejour.jpg',
    '03-cuisine.jpg',
    '04-chambre.jpg',
    '05-salle-de-bain.jpg',
    '06-terrasse.jpg',
  ],
  'mandat-saint-paul-de-vence-maison': [
    '01-facade.jpg',
    '02-sejour.jpg',
    '03-cuisine.jpg',
    '04-chambre.jpg',
    '05-salle-de-bain.jpg',
    '06-jardin.jpg',
  ],
  'mandat-valbonne-villa': [
    '01-facade.jpg',
    '02-sejour.jpg',
    '03-cuisine.jpg',
    '04-chambre.jpg',
    '05-salle-de-bain.jpg',
    '06-piscine.jpg',
  ],
};

// Les fichiers d'un jeu s'il est complet, sinon null ; sans vues attendues, ceux qui sont là. Pur.
export function completePhotoSet(
  files: readonly string[],
  expected: readonly string[] | undefined,
): string[] | null {
  if (!expected) return [...files];
  return expected.every((view) => files.includes(view)) ? [...expected] : null;
}

// Les photos du jeu d'un bien, en chemins sous `/demo/photos` (« mandat-mougins-villa/01-facade.jpg »),
// ou null si son dossier n'a pas encore de photos, ou pas encore toutes celles de sa fiche.
export function demoPhotoSet(id: string): string[] | null {
  const files = SETS[id];
  if (!files || files.length === 0) return null;
  const complete = completePhotoSet(
    files,
    DEMO_PHOTO_SET_VIEWS[id as (typeof DEMO_PHOTO_SET_IDS)[number]],
  );
  return complete ? complete.map((file) => `${id}/${file}`) : null;
}

export function demoPhotoSetFolders(): string[] {
  return Object.keys(SETS);
}
