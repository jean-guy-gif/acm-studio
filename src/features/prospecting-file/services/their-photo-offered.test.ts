import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  initialTheirPhotoChoice,
  NO_SAVED_THEIR_PHOTO,
} from '@/features/prospecting-file/services/their-photo';

// Mission 115 — l'option « Photo de son bien » est de retour dans l'éditeur de courrier,
// propriétaire comme confrère (décision de Jean-Guy du 23/10, en connaissance du risque ; remplace
// M105, « retirée pendant la bêta ») : les photos de l'annonce, celles que montre le Live (M58),
// au choix du conseiller, « Sans photo » par défaut comme avant.
// Lot A (27/11) — le texte des pages, entités et lignes réunies (le JSX coupe ses phrases).
const read = (...parts: string[]) =>
  readFileSync(join(process.cwd(), 'src', ...parts), 'utf8')
    .replace(/&nbsp;|&#x202f;/g, ' ')
    .replace(/\s+/g, ' ');

describe('« Photo de son bien », de retour dans l’éditeur de courrier', () => {
  it('l’éditeur propose les photos de l’annonce, sans porte', () => {
    const editor = read(
      'features',
      'prospecting-file',
      'components',
      'prospecting-file-editor.tsx',
    );
    expect(editor).toContain('data-testid="their-photo-choice"');
    expect(editor).toContain('Photo de son bien');
    expect(editor).not.toContain('LISTING_PHOTOS_OFFERED');
    const query = read('features', 'prospecting-file', 'queries', 'get-prospecting-file.ts');
    expect(query).toContain('listing: listingPhotoUrls(competitor.photo_urls)');
    expect(query).not.toContain('withoutListingPhoto');
  });

  it('décochée par défaut : rien de choisi, c’est « Sans photo »', () => {
    expect(
      initialTheirPhotoChoice(NO_SAVED_THEIR_PHOTO, ['https://portail.test/a.jpg'], 'a/p/c1/'),
    ).toEqual({ mode: 'none' });
  });

  it('/confidentialite le dit : une photo de l’annonce, au seul choix du conseiller', () => {
    const page = read('app', 'confidentialite', 'page.tsx');
    expect(page).toContain('une photo tirée de l’annonce du bien concurrent');
    expect(page).toContain('au seul choix du conseiller (jamais par défaut)');
    expect(page).not.toContain('aucune photo de l’annonce d’un concurrent');
  });
});
