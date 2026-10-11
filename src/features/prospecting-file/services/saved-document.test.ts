import { describe, expect, it } from 'vitest';

import { savedDocument } from '@/features/prospecting-file/services/saved-document';
import { makeFacts } from '@/features/prospecting-file/services/test-facts';
import { NO_SAVED_THEIR_PHOTO } from '@/features/prospecting-file/services/their-photo';
import { NO_OVERRIDES, type ProspectingSender } from '@/features/prospecting-file/types';

const SENDER: ProspectingSender = {
  advisorName: 'Claire Martin',
  email: 'claire@agence.test',
  phone: '06 12 34 56 78',
  photoUrl: null,
  agencyName: 'Agence du Port',
  logoUrl: null,
  postalAddress: '1 place de la Mairie, 06160 Antibes',
  professionalCard: null,
};
const PHOTOS = [
  { path: 'a/p/1.jpg', url: 'https://stockage.test/1' },
  { path: 'a/p/2.jpg', url: 'https://stockage.test/2' },
];
const PREFIX = 'a/p/prospecting/c1/';
const base = {
  version: 'owner' as const,
  facts: makeFacts(),
  sender: SENDER,
  overrides: NO_OVERRIDES,
  photos: PHOTOS,
  theirPhoto: {
    listing: ['https://portail.test/x.jpg'],
    saved: NO_SAVED_THEIR_PHOTO,
    signed: {},
    prefix: PREFIX,
  },
  qr: { size: 1, path: '' },
};

// Mission 98 — « Préparer tous les courriers » imprime chaque dossier sans passer par l'éditeur.
describe('savedDocument — le dossier tel qu’enregistré', () => {
  it('rien d’enregistré : les textes proposés, la première photo de notre bien, sans photo du sien', () => {
    const document = savedDocument(base);
    expect(document.texts).toEqual(document.file.defaults);
    expect(document.photoUrl).toBe('https://stockage.test/1');
    // « Sans photo » par défaut (M90) : une photo d'annonce ne s'imprime jamais d'office.
    expect(document.theirPhotoUrl).toBeNull();
    expect(document.file.version).toBe('owner');
  });

  it('reprend les textes réécrits et les photos choisies', () => {
    const document = savedDocument({
      ...base,
      overrides: { ...NO_OVERRIDES, title: 'Mon titre', photoPath: 'a/p/2.jpg', showPrices: false },
      theirPhoto: {
        listing: [],
        saved: { mode: 'upload', sourceUrl: null, path: `${PREFIX}facade.jpg` },
        signed: { [`${PREFIX}facade.jpg`]: 'https://stockage.test/facade' },
        prefix: PREFIX,
      },
    });
    expect(document.texts.title).toBe('Mon titre');
    expect(document.texts.letter).toBe(document.file.defaults.letter);
    expect(document.photoUrl).toBe('https://stockage.test/2');
    expect(document.theirPhotoUrl).toBe('https://stockage.test/facade');
    expect(document.file.pricesShown).toBe(false);
  });

  it('la version confrère s’imprime en version confrère', () => {
    expect(savedDocument({ ...base, version: 'colleague' }).file.version).toBe('colleague');
  });
});
