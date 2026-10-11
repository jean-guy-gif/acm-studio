import { describe, expect, it } from 'vitest';

import {
  NO_SAVED_THEIR_PHOTO,
  initialTheirPhotoChoice,
  listingPhotoUrls,
  theirPhotoDisplayUrl,
  theirPhotoPrefix,
  validTheirPhotoChoice,
  type SavedTheirPhoto,
} from '@/features/prospecting-file/services/their-photo';

const PREFIX = theirPhotoPrefix('agence', 'dossier', 'concurrent');
const LISTING = ['https://portail.example/a.jpg', 'https://portail.example/b.jpg'];
const COPY = `${PREFIX}copie.jpg`;
const MINE = `${PREFIX}facade.jpg`;

describe('listingPhotoUrls', () => {
  it('ne garde que de vraies adresses web, sans doublon', () => {
    expect(
      listingPhotoUrls([
        LISTING[0],
        'javascript:alert(1)',
        'data:image/png;base64,AAAA',
        42,
        null,
        LISTING[0],
        LISTING[1],
      ]),
    ).toEqual(LISTING);
    expect(listingPhotoUrls(null)).toEqual([]);
    expect(listingPhotoUrls('https://portail.example/a.jpg')).toEqual([]);
  });
});

describe('le choix à l’ouverture', () => {
  it('propose la première photo de l’annonce, sinon « Sans photo »', () => {
    expect(initialTheirPhotoChoice(NO_SAVED_THEIR_PHOTO, LISTING, PREFIX)).toEqual({
      mode: 'listing',
      url: LISTING[0],
    });
    expect(initialTheirPhotoChoice(NO_SAVED_THEIR_PHOTO, [], PREFIX)).toEqual({ mode: 'none' });
  });

  it('reprend le choix enregistré', () => {
    expect(
      initialTheirPhotoChoice(
        { mode: 'listing', sourceUrl: LISTING[1], path: COPY },
        LISTING,
        PREFIX,
      ),
    ).toEqual({ mode: 'listing', url: LISTING[1] });
    expect(
      initialTheirPhotoChoice({ mode: 'upload', sourceUrl: null, path: MINE }, LISTING, PREFIX),
    ).toEqual({ mode: 'upload', path: MINE });
    expect(
      initialTheirPhotoChoice({ mode: 'none', sourceUrl: null, path: null }, LISTING, PREFIX),
    ).toEqual({ mode: 'none' });
  });

  it('une photo retirée de l’annonce, ou un fichier d’un autre concurrent, ne se reprend pas', () => {
    expect(
      initialTheirPhotoChoice(
        { mode: 'listing', sourceUrl: 'https://portail.example/retiree.jpg', path: COPY },
        LISTING,
        PREFIX,
      ),
    ).toEqual({ mode: 'listing', url: LISTING[0] });
    expect(
      initialTheirPhotoChoice(
        { mode: 'upload', sourceUrl: null, path: 'agence/dossier/prospecting/autre/x.jpg' },
        [],
        PREFIX,
      ),
    ).toEqual({ mode: 'none' });
  });
});

describe('ce que le serveur accepte d’enregistrer', () => {
  it('une photo de CETTE annonce, un fichier de CE concurrent, ou « Sans photo »', () => {
    expect(validTheirPhotoChoice({ mode: 'listing', url: LISTING[1] }, LISTING, PREFIX)).toBe(true);
    expect(validTheirPhotoChoice({ mode: 'upload', path: MINE }, LISTING, PREFIX)).toBe(true);
    expect(validTheirPhotoChoice({ mode: 'none' }, LISTING, PREFIX)).toBe(true);
  });

  it('refuse une adresse étrangère à l’annonce et un chemin hors du dossier', () => {
    expect(
      validTheirPhotoChoice(
        { mode: 'listing', url: 'https://ailleurs.example/x.jpg' },
        LISTING,
        PREFIX,
      ),
    ).toBe(false);
    expect(
      validTheirPhotoChoice(
        { mode: 'upload', path: 'autre-agence/dossier/prospecting/concurrent/x.jpg' },
        LISTING,
        PREFIX,
      ),
    ).toBe(false);
    expect(
      validTheirPhotoChoice(
        { mode: 'upload', path: `${PREFIX}../../../secret.jpg` },
        LISTING,
        PREFIX,
      ),
    ).toBe(false);
  });
});

describe('la photo affichée sur le dossier', () => {
  const saved: SavedTheirPhoto = { mode: 'listing', sourceUrl: LISTING[1], path: COPY };
  const signed = {
    [COPY]: 'https://stockage.example/copie',
    [MINE]: 'https://stockage.example/mine',
  };

  it('« Sans photo » n’affiche jamais rien, quoi qui soit enregistré', () => {
    expect(theirPhotoDisplayUrl({ mode: 'none' }, saved, signed)).toBeNull();
  });

  it('préfère la copie gardée par l’agence au lien du portail', () => {
    expect(theirPhotoDisplayUrl({ mode: 'listing', url: LISTING[1] }, saved, signed)).toBe(
      'https://stockage.example/copie',
    );
  });

  it('retombe sur l’adresse de l’annonce tant que la photo choisie n’est pas copiée', () => {
    expect(theirPhotoDisplayUrl({ mode: 'listing', url: LISTING[0] }, saved, signed)).toBe(
      LISTING[0],
    );
    expect(
      theirPhotoDisplayUrl({ mode: 'listing', url: LISTING[1] }, { ...saved, path: null }, signed),
    ).toBe(LISTING[1]);
  });

  it('« Ma photo » n’affiche que le fichier signé, jamais une adresse devinée', () => {
    expect(theirPhotoDisplayUrl({ mode: 'upload', path: MINE }, saved, signed)).toBe(
      'https://stockage.example/mine',
    );
    expect(
      theirPhotoDisplayUrl({ mode: 'upload', path: `${PREFIX}inconnu.jpg` }, saved, signed),
    ).toBeNull();
  });
});
