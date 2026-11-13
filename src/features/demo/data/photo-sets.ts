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
export const DEMO_PHOTO_SET_IDS = ['mandat-mougins-villa', 'mandat-antibes-appartement'] as const;

export const DEMO_PHOTO_SET_RULES = {
  minPhotos: 3,
  maxPhotos: 6,
  width: 1600,
  height: 1200,
  maxBytes: 400 * 1024,
} as const;

// Les photos du jeu d'un bien, en chemins sous `/demo/photos` (« mandat-mougins-villa/01-facade.jpg »),
// ou null si son dossier n'a pas encore de photos.
export function demoPhotoSet(id: string): string[] | null {
  const files = SETS[id];
  return files && files.length > 0 ? files.map((file) => `${id}/${file}`) : null;
}

export function demoPhotoSetFolders(): string[] {
  return Object.keys(SETS);
}
