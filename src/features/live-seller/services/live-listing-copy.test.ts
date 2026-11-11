import { describe, expect, it } from 'vitest';

import {
  buildLiveListingCopy,
  openableListingUrl,
} from '@/features/live-seller/services/live-listing-copy';

const entry = {
  price: 740_000,
  photoUrls: ['https://photos.example.com/now.jpg'],
  surfaceArea: 130,
  roomsCount: 5,
  bedroomsCount: 3,
  energyRating: 'D',
  landArea: null,
  outdoorSpaces: ['terrace', 'inconnu'],
  parkingTypes: [],
};

const observations = [
  { observed_on: '2026-09-20', price: 760_000 },
  { observed_on: '2026-10-02', price: 740_000 },
  { observed_on: '2026-11-10', price: 740_000 },
];

describe('« Voir l’annonce » : la copie montrée quand l’annonce n’est plus en ligne', () => {
  it('le relevé de l’import, la dernière relecture, la baisse connue une fois la durée révélée', () => {
    const copy = buildLiveListingCopy({
      copy: {
        captured_at: '2026-10-21T08:00:00Z',
        price: 740_000,
        photo_urls: ['https://photos.example.com/1.jpg'],
        facts: { surfaceArea: 135, roomsCount: 5, bedroomsCount: 4, outdoorSpaces: ['garden'] },
      },
      observations,
      entry,
      portal: 'SeLoger',
      goneAt: '2026-11-08T09:00:00Z',
      durationRevealed: true,
    });
    expect(copy).toMatchObject({
      goneSince: '2026-11-08',
      portal: 'SeLoger',
      recordedOn: '2026-10-21',
      atImport: true,
      price: 740_000,
      lastCheck: { on: '2026-11-10', price: 740_000 },
      drop: { from: 760_000, to: 740_000, on: '2026-10-02' },
      photoUrls: ['https://photos.example.com/1.jpg'],
      surfaceArea: 135,
      bedroomsCount: 4,
      outdoorSpaces: ['garden'],
    });
  });

  it('la baisse ne part pas tant que la durée n’est pas révélée (M95)', () => {
    const copy = buildLiveListingCopy({
      copy: null,
      observations,
      entry,
      portal: null,
      goneAt: null,
      durationRevealed: false,
    });
    expect(copy.drop).toBeNull();
  });

  it('sans copie d’import (concurrent d’avant) : le premier relevé, la fiche actuelle, sans « à l’import »', () => {
    const copy = buildLiveListingCopy({
      copy: null,
      observations,
      entry,
      portal: 'SeLoger',
      goneAt: null,
      durationRevealed: false,
    });
    expect(copy).toMatchObject({
      recordedOn: '2026-09-20',
      atImport: false,
      photoUrls: entry.photoUrls,
      surfaceArea: 130,
      outdoorSpaces: ['terrace'],
    });
  });

  it('jamais le texte, le titre, l’adresse ni le lien de l’annonce', () => {
    const copy = buildLiveListingCopy({
      copy: {
        captured_at: '2026-10-21T08:00:00Z',
        price: 740_000,
        photo_urls: [],
        facts: {
          listingText: 'EXCLUSIVITÉ Agence Dupont 12 rue des Lilas',
          address: '12 rue des Lilas',
        },
      },
      observations: [],
      entry,
      portal: 'SeLoger',
      goneAt: null,
      durationRevealed: true,
    });
    const shown = JSON.stringify(copy);
    expect(shown).not.toContain('Dupont');
    expect(shown).not.toContain('Lilas');
    expect(shown).not.toContain('http://');
    expect(Object.keys(copy)).not.toContain('listingUrl');
  });

  it('n’ouvre qu’une adresse http(s)', () => {
    expect(openableListingUrl(' https://www.seloger.com/annonces/1.htm ')).toBe(
      'https://www.seloger.com/annonces/1.htm',
    );
    expect(openableListingUrl('javascript:alert(1)')).toBeNull();
    expect(openableListingUrl(null)).toBeNull();
  });
});
