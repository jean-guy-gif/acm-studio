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
  professionalCard: 'CPI 0605 2018 000 123 456',
  professionalCardIssuer: 'la CCI Nice Côte d’Azur',
  financialGuarantee: null,
  privacyUrl: 'acm.test/confidentialite',
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
  // Mission 115 — une photo d'annonce choisie s'imprime, à l'unité comme en lot (le lot passe par
  // ici, M98) : la copie gardée par l'agence d'abord (M87), sinon l'adresse de l'annonce.
  it('une photo d’annonce enregistrée s’imprime : la copie gardée, sinon l’adresse de l’annonce', () => {
    const copied = savedDocument({
      ...base,
      theirPhoto: {
        ...base.theirPhoto,
        saved: { mode: 'listing', sourceUrl: 'https://portail.test/x.jpg', path: `${PREFIX}x.jpg` },
        signed: { [`${PREFIX}x.jpg`]: 'https://stockage.test/x' },
      },
    });
    expect(copied.theirPhotoUrl).toBe('https://stockage.test/x');
    const notYetCopied = savedDocument({
      ...base,
      theirPhoto: {
        ...base.theirPhoto,
        saved: { mode: 'listing', sourceUrl: 'https://portail.test/x.jpg', path: null },
      },
    });
    expect(notYetCopied.theirPhotoUrl).toBe('https://portail.test/x.jpg');
    // Une photo qui n'est plus celle de l'annonce ne s'imprime pas.
    const gone = savedDocument({
      ...base,
      theirPhoto: {
        ...base.theirPhoto,
        saved: { mode: 'listing', sourceUrl: 'https://portail.test/retiree.jpg', path: null },
      },
    });
    expect(gone.theirPhotoUrl).toBeNull();
  });

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
