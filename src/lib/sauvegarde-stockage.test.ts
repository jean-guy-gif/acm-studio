import { describe, expect, it } from 'vitest';

import {
  copyBucket,
  copyPlan,
  missingObjects,
  STORAGE_OBJECTS_SQL,
  STORAGE_RETRIES,
} from '../../scripts/sauvegarde-stockage.mjs';

// La sauvegarde, étape 3 (Jean-Guy, 28/11) : la copie d'un bucket s'arrêtait à la première erreur
// passagère (« HttpClientError: Decode error (200 GET …/project-photos/….jpg) »), sur des fichiers
// sains, et la sauvegarde échouait. Elle se reprend désormais, jusqu'à trois fois, sur les seuls
// fichiers manquants ; l'échec n'est dit qu'après la troisième reprise, avec la liste.

type StorageObject = { name: string; size: number | null };
type Step = { kind: 'bucket' | 'dir' | 'file'; path: string };

const objects: StorageObject[] = [
  { name: 'agence/p1/a.jpg', size: 10 },
  { name: 'agence/p1/b.jpg', size: 20 },
  { name: 'agence/p2/c.jpg', size: 30 },
  { name: 'agence/p2/d.jpg', size: 40 },
  { name: 'autre/p3/e.jpg', size: 50 },
  { name: 'racine.jpg', size: 60 },
];
const names = (list: StorageObject[]) => list.map((object) => object.name);

// Un stockage factice qui se comporte comme la CLI : une copie prend ses objets dans l'ordre des
// noms et s'arrête net à la première erreur ; `failures` dit combien de fois un objet échoue avant
// de passer, `truncated` combien de fois il arrive coupé.
function fakeStorage(
  failures: Record<string, number> = {},
  truncated: Record<string, number> = {},
) {
  const files: Record<string, number> = {};
  const downloads: Record<string, number> = {};
  const discarded: string[] = [];
  const steps: Step[] = [];
  const covered = (step: Step) =>
    objects.filter((object) =>
      step.kind === 'bucket'
        ? true
        : step.kind === 'dir'
          ? object.name.startsWith(`${step.path}/`)
          : object.name === step.path,
    );
  return {
    files,
    downloads,
    discarded,
    steps,
    sizeOf: (name: string) => (name in files ? files[name] : null),
    discard: (name: string) => {
      discarded.push(name);
      delete files[name];
    },
    copy: (step: Step) => {
      steps.push(step);
      for (const object of covered(step)) {
        // Comme la CLI : elle refuse d'écrire par-dessus un fichier déjà là (vu le 28/11).
        if (object.name in files) throw new Error('EEXIST: file already exists');
        downloads[object.name] = (downloads[object.name] ?? 0) + 1;
        if ((failures[object.name] ?? 0) > 0) {
          failures[object.name] -= 1;
          throw new Error('HttpClientError: Decode error');
        }
        if ((truncated[object.name] ?? 0) > 0) {
          truncated[object.name] -= 1;
          files[object.name] = 1;
          continue;
        }
        files[object.name] = object.size ?? 1;
      }
    },
  };
}

describe('la liste des objets du stockage', () => {
  it('se lit en lecture seule : le bucket, le nom et la taille enregistrée, rien d’autre', () => {
    expect(STORAGE_OBJECTS_SQL).toMatch(/^\s*select bucket_id as b, name as n/);
    expect(STORAGE_OBJECTS_SQL).toContain("metadata->>'size'");
    expect(STORAGE_OBJECTS_SQL).not.toMatch(/\b(insert|update|delete|truncate|drop|alter)\b/i);
  });
});

describe('missingObjects', () => {
  it('rend les objets sans fichier, et ceux dont le fichier n’a pas la taille enregistrée', () => {
    const files: Record<string, number> = {
      'agence/p1/a.jpg': 10,
      'agence/p1/b.jpg': 19,
      'racine.jpg': 60,
    };
    const sizeOf = (name: string) => (name in files ? files[name] : null);
    expect(names(missingObjects(objects, sizeOf))).toEqual([
      'agence/p1/b.jpg',
      'agence/p2/c.jpg',
      'agence/p2/d.jpg',
      'autre/p3/e.jpg',
    ]);
  });

  it('sans taille enregistrée, un fichier présent suffit', () => {
    const sizeOf = (name: string) => (name === 'x.jpg' ? 3 : null);
    expect(missingObjects([{ name: 'x.jpg', size: null }], sizeOf)).toEqual([]);
  });
});

describe('copyPlan', () => {
  it('tout manque : le bucket entier, la copie d’aujourd’hui', () => {
    expect(copyPlan(objects, objects)).toEqual([{ kind: 'bucket', path: '' }]);
  });

  it('rien ne manque : aucune copie', () => {
    expect(copyPlan(objects, [])).toEqual([]);
  });

  it('un dossier dont tout manque se copie d’un coup, au plus haut ; ailleurs, fichier par fichier', () => {
    const missing = objects.filter(
      (object) =>
        object.name === 'agence/p1/b.jpg' ||
        object.name.startsWith('agence/p2/') ||
        object.name.startsWith('autre/'),
    );
    expect(copyPlan(objects, missing)).toEqual([
      { kind: 'file', path: 'agence/p1/b.jpg' },
      { kind: 'dir', path: 'agence/p2' },
      { kind: 'dir', path: 'autre' },
    ]);
  });

  it('un fichier à la racine du bucket se copie seul', () => {
    expect(copyPlan(objects, [objects[5]])).toEqual([{ kind: 'file', path: 'racine.jpg' }]);
  });
});

describe('copyBucket', () => {
  it('sans erreur : une seule copie, celle du bucket entier', () => {
    const storage = fakeStorage();
    const result = copyBucket({
      objects,
      copy: storage.copy,
      sizeOf: storage.sizeOf,
      discard: storage.discard,
    });
    expect(result).toEqual({ missing: [], passes: 1 });
    expect(storage.steps).toEqual([{ kind: 'bucket', path: '' }]);
  });

  it('une erreur passagère : la reprise ne retélécharge que les fichiers manquants', () => {
    const storage = fakeStorage({ 'agence/p2/c.jpg': 1 });
    const retries: Array<[number, number]> = [];
    const result = copyBucket({
      objects,
      copy: storage.copy,
      sizeOf: storage.sizeOf,
      discard: storage.discard,
      onRetry: (pass: number, missing: StorageObject[]) => retries.push([pass, missing.length]),
    });
    expect(result).toEqual({ missing: [], passes: 2 });
    expect(retries).toEqual([[1, 4]]);
    expect(storage.steps).toEqual([
      { kind: 'bucket', path: '' },
      { kind: 'dir', path: 'agence/p2' },
      { kind: 'dir', path: 'autre' },
      { kind: 'file', path: 'racine.jpg' },
    ]);
    // Les fichiers déjà copiés ne sont pas retéléchargés.
    expect(storage.downloads['agence/p1/a.jpg']).toBe(1);
    expect(storage.downloads['agence/p1/b.jpg']).toBe(1);
  });

  it('un fichier coupé est d’abord retiré, puis retéléchargé : la CLI refuse d’écrire par-dessus', () => {
    const storage = fakeStorage({}, { 'autre/p3/e.jpg': 1 });
    const result = copyBucket({
      objects,
      copy: storage.copy,
      sizeOf: storage.sizeOf,
      discard: storage.discard,
    });
    expect(result).toEqual({ missing: [], passes: 2 });
    expect(storage.steps.at(-1)).toEqual({ kind: 'dir', path: 'autre' });
    expect(storage.files['autre/p3/e.jpg']).toBe(50);
    expect(storage.discarded).toEqual(['autre/p3/e.jpg']);
  });

  it('ne retire jamais un fichier copié à sa taille', () => {
    const storage = fakeStorage({ 'agence/p2/c.jpg': 1 }, { 'racine.jpg': 1 });
    const result = copyBucket({
      objects,
      copy: storage.copy,
      sizeOf: storage.sizeOf,
      discard: storage.discard,
    });
    // La racine, copiée pour la première fois à la première reprise, arrive coupée : la deuxième
    // la retire, et elle seule ; a et b, copiés à leur taille dès le début, restent.
    expect(result).toEqual({ missing: [], passes: 3 });
    expect(storage.discarded).toEqual(['racine.jpg']);
    expect(storage.downloads['agence/p1/a.jpg']).toBe(1);
  });

  it('une erreur ne retient pas les autres copies de la même reprise', () => {
    const storage = fakeStorage({ 'agence/p2/c.jpg': 2 });
    const result = copyBucket({
      objects,
      copy: storage.copy,
      sizeOf: storage.sizeOf,
      discard: storage.discard,
    });
    expect(result).toEqual({ missing: [], passes: 3 });
    // À la première reprise, le dossier p2 échoue encore, mais « autre » et la racine passent.
    expect(storage.downloads['autre/p3/e.jpg']).toBe(1);
    expect(storage.downloads['racine.jpg']).toBe(1);
  });

  it('jusqu’à trois reprises : l’échec n’est dit qu’après la troisième, avec la liste', () => {
    expect(STORAGE_RETRIES).toBe(3);
    const storage = fakeStorage({ 'agence/p1/b.jpg': 99 });
    const retries: number[] = [];
    const result = copyBucket({
      objects,
      copy: storage.copy,
      sizeOf: storage.sizeOf,
      discard: storage.discard,
      onRetry: (pass: number) => retries.push(pass),
    });
    expect(retries).toEqual([1, 2, 3]);
    expect(result.passes).toBe(1 + STORAGE_RETRIES);
    expect(names(result.missing)).toEqual(['agence/p1/b.jpg']);
    // La copie du bucket, puis trois reprises de ce seul fichier.
    expect(storage.downloads['agence/p1/b.jpg']).toBe(1 + STORAGE_RETRIES);
    expect(storage.downloads['agence/p1/a.jpg']).toBe(1);
  });
});
