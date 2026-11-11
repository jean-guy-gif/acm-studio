import { describe, expect, it } from 'vitest';

import { buildListingCopy } from '@/features/competitor-listing-copy/services/build-listing-copy';
import {
  readListingCopyFacts,
  readListingCopyPhotos,
} from '@/features/competitor-listing-copy/listing-copy';

const TRAP_TITLE = 'EXCLUSIVITÉ Agence Dupont 12 rue des Lilas';
const TRAP_TEXT = 'Maison familiale au 12 rue des Lilas, contactez Agence Dupont au 06 39 98 00 00';

const row = {
  price: 740_000,
  title: TRAP_TITLE,
  address: '12 rue des Lilas',
  postal_code: '06140',
  listing_url: 'https://www.seloger.com/annonces/achat/maison/vence-06/123456.htm',
  advisor_notes: 'note du conseiller',
  listing_description: TRAP_TEXT,
  photo_urls: [
    'https://photos.example.com/1.jpg',
    'http://photos.example.com/2.jpg',
    'pas une url',
  ],
  listing_features: ['Piscine', 'Garage'],
  property_type: 'house',
  surface_area: 135,
  land_area: 1100,
  rooms_count: 5,
  bedrooms_count: 4,
  energy_rating: 'c',
  ges_rating: null,
  construction_year: 1990,
  heating_type: null,
  city: 'Vence',
  district: null,
  general_condition: null,
  exposure: null,
  outdoor_spaces: ['terrace'],
  parking_types: ['garage'],
  listing_published_at: '2026-10-02',
};

// Mission 152 (Jean-Guy, 11/11) — la copie prouve le prix, rien d'autre : jamais le texte de
// l'annonce (il cite parfois l'adresse du propriétaire), ni le titre, l'adresse, le lien, la note.
describe('la copie de l’annonce', () => {
  it('garde le prix, les photos et les caractéristiques, jamais le texte ni ce qui situe le bien', () => {
    const copy = buildListingCopy(row);
    expect(copy).not.toBeNull();
    const stored = JSON.stringify(copy);
    for (const trap of [
      TRAP_TEXT,
      TRAP_TITLE,
      '12 rue des Lilas',
      '06140',
      'seloger.com',
      'note du conseiller',
    ]) {
      expect(stored).not.toContain(trap);
    }
    expect(copy).toEqual({
      price: 740_000,
      photo_urls: ['https://photos.example.com/1.jpg'],
      facts: expect.objectContaining({
        propertyType: 'house',
        surfaceArea: 135,
        landArea: 1100,
        roomsCount: 5,
        bedroomsCount: 4,
        energyRating: 'C',
        city: 'Vence',
        outdoorSpaces: ['terrace'],
        parkingTypes: ['garage'],
        features: ['Piscine', 'Garage'],
        publishedAt: '2026-10-02',
      }),
    });
    expect(Object.keys(copy as object).sort()).toEqual(['facts', 'photo_urls', 'price']);
  });

  it('sans prix, pas de copie', () => {
    expect(buildListingCopy({ ...row, price: 0 })).toBeNull();
  });

  it('relue en base : un champ hors liste ou hors forme est ignoré, les autres restent', () => {
    expect(
      readListingCopyFacts({
        surfaceArea: 80,
        energyRating: 'Z',
        address: '12 rue des Lilas',
        listingText: TRAP_TEXT,
        roomsCount: -3,
      }),
    ).toEqual({ surfaceArea: 80 });
    expect(readListingCopyFacts(['x'])).toEqual({});
    expect(
      readListingCopyPhotos(['https://a.example/1.jpg', 'https://a.example/1.jpg', 'ftp://b', 3]),
    ).toEqual(['https://a.example/1.jpg']);
  });
});
