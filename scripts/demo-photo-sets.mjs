// Mission 155 — les jeux de photos de la démonstration, un dossier par bien
// (`public/demo/photos/<bien>/01-facade.jpg`, `02-sejour.jpg`…). Ce script relit les dossiers et
// écrit leur liste dans `src/features/demo/data/photo-sets.generated.json`, que le jeu de données
// lit : déposer un jeu complet dans son dossier suffit, rien d'autre à toucher. Lancé avant la
// compilation, la vérification des types et les tests (`prebuild`, `pretypecheck`, `pretest`).
// Seuls les fichiers `NN-vue.jpg` comptent, dans l'ordre de leur numéro ; le premier est la photo
// principale. Les règles (nombre, taille, poids) sont vérifiées par `demo-photo-sets.test.ts`.
import { readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = join(process.cwd(), 'public', 'demo', 'photos');
const target = join(process.cwd(), 'src', 'features', 'demo', 'data', 'photo-sets.generated.json');
const FOLDER = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FILE = /^\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.jpg$/;

const sets = {};
for (const entry of (await readdir(root, { withFileTypes: true })).sort((a, b) =>
  a.name.localeCompare(b.name),
)) {
  if (!entry.isDirectory() || !FOLDER.test(entry.name)) continue;
  const files = (await readdir(join(root, entry.name))).filter((name) => FILE.test(name)).sort();
  if (files.length > 0) sets[entry.name] = files;
}

await writeFile(target, `${JSON.stringify(sets, null, 2)}\n`);
console.log(`jeux de photos de la démo : ${Object.keys(sets).length}`);
