import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  LISTING_PHOTOS_OFFERED,
  withoutListingPhoto,
} from '@/features/prospecting-file/services/their-photo';

// Mission 105 — la photo d'une annonce appartient à son auteur : pendant la bêta, l'option est
// retirée de l'éditeur de courrier, et une photo d'annonce déjà choisie ne s'imprime plus.
describe('photos des concurrents dans le courrier, pendant la bêta', () => {
  it('aucune photo d’annonce n’est proposée', () => {
    expect(LISTING_PHOTOS_OFFERED).toBe(false);
    const editor = readFileSync(
      join(process.cwd(), 'src/features/prospecting-file/components/prospecting-file-editor.tsx'),
      'utf8',
    );
    expect(editor).toMatch(/\{LISTING_PHOTOS_OFFERED \? \(\s*<fieldset[^>]*their-photo-choice/);
  });

  it('un courrier déjà préparé avec une photo d’annonce s’imprime sans elle', () => {
    expect(
      withoutListingPhoto({ mode: 'listing', sourceUrl: 'https://v.seloger.com/a.jpg', path: 'x' }),
    ).toEqual({ mode: 'none', sourceUrl: null, path: null });
    const own = { mode: 'upload' as const, sourceUrl: null, path: 'agence/dossier/ma-photo.jpg' };
    expect(withoutListingPhoto(own)).toEqual(own);
  });
});
