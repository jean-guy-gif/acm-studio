import { describe, expect, it } from 'vitest';

import {
  removeCompetitorPhotos,
  removeProjectCompetitorPhotos,
  type PhotoStorage,
} from '@/features/prospecting-file/services/remove-their-photos';
import { theirPhotoPrefix } from '@/features/prospecting-file/services/their-photo';

const AGENCY = 'aaaaaaaa-0000-0000-0000-000000000001';
const PROJECT = 'bbbbbbbb-0000-0000-0000-000000000001';
const C1 = 'cccccccc-0000-0000-0000-000000000001';
const C2 = 'cccccccc-0000-0000-0000-000000000002';
const BASE = `${AGENCY}/${PROJECT}`;

// Un stockage en mémoire : des chemins de fichiers, listés par dossier comme le fait Supabase.
function fakeStorage(files: string[], failing: { list?: boolean; remove?: boolean } = {}) {
  const state = { files: new Set(files), buckets: [] as string[] };
  const storage: PhotoStorage = {
    from(bucket) {
      state.buckets.push(bucket);
      return {
        async list(path) {
          if (failing.list) {
            return { data: null, error: new Error('liste') };
          }
          const names = new Map<string, string | null>();
          for (const file of state.files) {
            if (file.startsWith(`${path}/`)) {
              const [name, ...rest] = file.slice(path.length + 1).split('/');
              names.set(name, rest.length === 0 ? `id-${name}` : null);
            }
          }
          return { data: [...names].map(([name, id]) => ({ name, id })), error: null };
        },
        async remove(paths) {
          if (failing.remove) {
            return { error: new Error('retrait') };
          }
          paths.forEach((path) => state.files.delete(path));
          return { error: null };
        },
      };
    },
  };
  return { storage, state };
}

const FILES = [
  `${BASE}/prospecting/${C1}/copie.jpg`,
  `${BASE}/prospecting/${C1}/facade.png`,
  `${BASE}/prospecting/${C2}/copie.jpg`,
  `${BASE}/property/notre-bien.jpg`,
  `${AGENCY}/advisors/conseiller.png`,
  `${AGENCY}/autre-dossier/prospecting/${C1}/copie.jpg`,
];

describe('les photos d’un concurrent supprimé quittent le stockage', () => {
  it('vide le dossier du concurrent, copie d’annonce et « Ma photo » comprises', async () => {
    const { storage, state } = fakeStorage(FILES);
    expect(await removeCompetitorPhotos(storage, AGENCY, PROJECT, [C1])).toBe(2);
    expect([...state.files].sort()).toEqual(
      [
        `${BASE}/prospecting/${C2}/copie.jpg`,
        `${BASE}/property/notre-bien.jpg`,
        `${AGENCY}/advisors/conseiller.png`,
        `${AGENCY}/autre-dossier/prospecting/${C1}/copie.jpg`,
      ].sort(),
    );
    expect(new Set(state.buckets)).toEqual(new Set(['project-photos']));
  });

  it('le dossier vidé est celui où l’éditeur dépose les photos', () => {
    expect(theirPhotoPrefix(AGENCY, PROJECT, C1)).toBe(`${BASE}/prospecting/${C1}/`);
  });

  it('en lot : chaque concurrent supprimé, une seule fois', async () => {
    const { storage, state } = fakeStorage(FILES);
    expect(await removeCompetitorPhotos(storage, AGENCY, PROJECT, [C1, C2, C1])).toBe(3);
    expect([...state.files].some((file) => file.startsWith(`${BASE}/prospecting/`))).toBe(false);
  });

  it('ne touche ni les photos de notre bien, ni celles du conseiller, ni un autre dossier', async () => {
    const { storage, state } = fakeStorage(FILES);
    await removeCompetitorPhotos(storage, AGENCY, PROJECT, [C1, C2]);
    expect(state.files.has(`${BASE}/property/notre-bien.jpg`)).toBe(true);
    expect(state.files.has(`${AGENCY}/advisors/conseiller.png`)).toBe(true);
    expect(state.files.has(`${AGENCY}/autre-dossier/prospecting/${C1}/copie.jpg`)).toBe(true);
  });

  it('ignore un identifiant qui n’en est pas un (aucun chemin fabriqué)', async () => {
    const { storage, state } = fakeStorage(FILES);
    expect(
      await removeCompetitorPhotos(storage, AGENCY, PROJECT, ['..', '../property', '', 'x/y']),
    ).toBe(0);
    expect(state.files.size).toBe(FILES.length);
  });

  it('un concurrent sans photo, ou un stockage en panne, ne casse rien', async () => {
    const empty = fakeStorage([]);
    expect(await removeCompetitorPhotos(empty.storage, AGENCY, PROJECT, [C1])).toBe(0);
    const noList = fakeStorage(FILES, { list: true });
    expect(await removeCompetitorPhotos(noList.storage, AGENCY, PROJECT, [C1])).toBe(0);
    const noRemove = fakeStorage(FILES, { remove: true });
    expect(await removeCompetitorPhotos(noRemove.storage, AGENCY, PROJECT, [C1])).toBe(0);
    expect(noRemove.state.files.size).toBe(FILES.length);
  });
});

describe('les photos de tous les concurrents d’un dossier vendeur supprimé', () => {
  it('vide chaque dossier de concurrent, et rien d’autre', async () => {
    const { storage, state } = fakeStorage(FILES);
    expect(await removeProjectCompetitorPhotos(storage, AGENCY, PROJECT)).toBe(3);
    expect([...state.files].sort()).toEqual(
      [
        `${BASE}/property/notre-bien.jpg`,
        `${AGENCY}/advisors/conseiller.png`,
        `${AGENCY}/autre-dossier/prospecting/${C1}/copie.jpg`,
      ].sort(),
    );
  });

  it('un dossier sans photo de concurrent ne fait rien', async () => {
    const { storage } = fakeStorage([`${BASE}/property/notre-bien.jpg`]);
    expect(await removeProjectCompetitorPhotos(storage, AGENCY, PROJECT)).toBe(0);
  });
});
