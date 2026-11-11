import { describe, expect, it } from 'vitest';

import { formatSquareMeters } from '@/lib/format';

import type { CompetitorCandidate } from '@/features/competitor-search/types';
import {
  buildPropertySheet,
  cleanListingText,
  sheetFromCandidate,
  type SheetFacts,
} from '@/features/property-sheet/services/property-sheet';
import {
  knownDrops,
  sheetFactsFromCompetitor,
  sheetFactsFromMandate,
  sheetFactsFromSelectionListing,
} from '@/features/property-sheet/services/sheet-sources';

const NOW = new Date('2026-11-11T10:00:00Z');

const facts = (patch: Partial<SheetFacts> = {}): SheetFacts => ({
  label: 'Maison · 5 pièces · 150 m² · Vence',
  origin: 'market',
  photos: ['https://photos.example.com/1.jpg', 'https://photos.example.com/2.jpg'],
  price: 735_000,
  priceSeenOn: '2026-11-10',
  listedSince: null,
  seenOnMarketSince: '2026-09-14',
  knownDrops: 1,
  propertyType: 'house',
  surfaceArea: 150,
  landArea: 1300,
  roomsCount: 5,
  bedroomsCount: 4,
  bathroomsCount: null,
  energyRating: 'C',
  gesRating: 'B',
  outdoorSpaces: ['terrace', 'garden'],
  parkingTypes: ['garage'],
  hasPool: true,
  hasElevator: null,
  floor: 0,
  heatingType: null,
  constructionYear: 1978,
  generalCondition: null,
  exposure: null,
  strengths: [],
  description: 'Au calme, maison provençale.\nVoir plus',
  listingUrl: 'https://www.seloger.com/annonces/achat/maison/vence-06/123456.htm',
  ...patch,
});

describe('la fiche complète d’un bien', () => {
  it('toutes les caractéristiques connues, une absente n’a pas de case, jamais « — »', () => {
    const sheet = buildPropertySheet(facts(), NOW);
    expect(sheet.characteristics).toEqual([
      { label: 'Surface', value: formatSquareMeters(150) },
      { label: 'Terrain', value: formatSquareMeters(1300) },
      { label: 'Pièces', value: '5' },
      { label: 'Chambres', value: '4' },
      { label: 'DPE · GES', value: 'C · B' },
      { label: 'Extérieur', value: 'Terrasse, Jardin' },
      { label: 'Stationnement', value: 'Garage' },
      { label: 'Piscine', value: 'Oui' },
      { label: 'Étage', value: 'Plain-pied' },
      { label: 'Construction', value: '1978' },
    ]);
    expect(JSON.stringify(sheet)).not.toContain('—');
  });

  it('le terrain se dit pour une maison, l’étage d’un appartement en étages', () => {
    const flat = buildPropertySheet(
      facts({ propertyType: 'apartment', floor: 3, hasElevator: false, gesRating: null }),
      NOW,
    );
    const labels = flat.characteristics.map((entry) => entry.label);
    expect(labels).not.toContain('Terrain');
    expect(flat.characteristics).toContainEqual({ label: 'Étage', value: '3e étage' });
    expect(flat.characteristics).toContainEqual({ label: 'Ascenseur', value: 'Non' });
    expect(flat.characteristics).toContainEqual({ label: 'DPE', value: 'C' });
  });

  it('le prix et ses dates, le texte complet sans le bouton « Voir plus », le lien en ligne', () => {
    const sheet = buildPropertySheet(facts(), NOW);
    expect(sheet.originLabel).toBe('Marché · SeLoger');
    expect(sheet.priceLine).toBe(
      'affiché hier · vu sur le marché depuis le 14/09 · 1 baisse de prix connue',
    );
    expect(sheet.description).toBe('Au calme, maison provençale.');
    expect(sheet.onlineUrl).toBe(
      'https://www.seloger.com/annonces/achat/maison/vence-06/123456.htm',
    );
    expect(sheet.fromAgency).toBe(false);
  });

  it('la date publiée par l’annonce passe avant la première vue sur le marché', () => {
    const sheet = buildPropertySheet(facts({ listedSince: '2026-08-01', knownDrops: 0 }), NOW);
    expect(sheet.priceLine).toBe('affiché hier · en vente depuis le 01/08');
  });

  it('un mandat de l’agence : « Dans l’agence », jamais de lien en ligne', () => {
    const sheet = buildPropertySheet(facts({ origin: 'agency' }), NOW);
    expect(sheet.originLabel).toBe('Dans l’agence');
    expect(sheet.onlineUrl).toBeNull();
    expect(sheet.fromAgency).toBe(true);
  });

  it('une annonce de démonstration ne mène à aucun portail : pas de lien, portail non nommé', () => {
    const sheet = buildPropertySheet(
      facts({ listingUrl: 'https://annonces.demonstration.invalid/annonce/mou-02' }),
      NOW,
    );
    expect(sheet.onlineUrl).toBeNull();
    expect(sheet.originLabel).toBe('Marché');
  });

  it('un texte vide ou fait du seul bouton n’a pas de bloc', () => {
    expect(cleanListingText('  Voir plus ')).toBeNull();
    expect(cleanListingText(null)).toBeNull();
  });
});

describe('les sources de la fiche', () => {
  const candidate: CompetitorCandidate = {
    key: 'se-1',
    url: 'https://www.bienici.com/annonce/vente/vence/maison/5pieces/ag-1',
    title: 'EXCLUSIVITÉ Agence Dupont 12 rue des Lilas',
    price: 735_000,
    surfaceArea: 150,
    roomsCount: 5,
    propertyType: 'house',
    pricePerSqm: 4900,
    landArea: 1300,
    city: 'Vence',
    photoUrls: ['https://pictures.notif.immo/1.jpg'],
    isNewBuild: false,
    energyClass: 'C',
    streamEstate: {
      propertyId: 'se-1',
      originSite: 'Bien’ici',
      onlineSince: '2026-09-20T08:00:00Z',
      firstKnownAt: '2026-09-14T08:00:00Z',
      lastSeenAt: null,
      priceDrops: [-3.2],
      bedrooms: 4,
      description: 'Le texte complet de l’annonce.',
      originalPhotos: ['https://file.bienici.com/1.jpg', 'https://file.bienici.com/2.jpg'],
    },
    features: {
      location: null,
      locationDiscarded: false,
      district: null,
      floor: null,
      hasElevator: null,
      hasPool: true,
      parking: ['box', 'place'],
      outdoor: { present: ['terrace'], absent: [] },
      condition: null,
      exposure: null,
      constructionYear: null,
    },
  };

  it('une annonce du marché : les photos d’origine, le texte, jamais le titre', () => {
    const sheet = sheetFromCandidate(
      candidate,
      'Maison · 5 pièces · 150 m² · Vence',
      '2026-11-10',
      NOW,
    );
    expect(sheet.photos).toEqual([
      'https://file.bienici.com/1.jpg',
      'https://file.bienici.com/2.jpg',
    ]);
    expect(sheet.description).toBe('Le texte complet de l’annonce.');
    expect(sheet.characteristics).toContainEqual({
      label: 'Stationnement',
      value: 'Box fermé, Place de stationnement',
    });
    expect(JSON.stringify(sheet)).not.toContain('Agence Dupont');
    expect(JSON.stringify(sheet)).not.toContain('rue des Lilas');
  });

  it('sans photos d’origine (recherche d’avant), les copies de Stream Estate', () => {
    const before = {
      ...candidate,
      streamEstate: {
        ...candidate.streamEstate!,
        originalPhotos: undefined,
        description: undefined,
      },
    };
    const sheet = sheetFromCandidate(before, 'Maison', null, NOW);
    expect(sheet.photos).toEqual(['https://pictures.notif.immo/1.jpg']);
    expect(sheet.description).toBeNull();
  });

  it('un concurrent : ses relevés datés comptent les baisses, son texte, jamais son titre', () => {
    const row = {
      property_type: 'house',
      rooms_count: 5,
      surface_area: 150,
      city: 'Vence',
      land_area: 1300,
      bedrooms_count: 4,
      bathrooms_count: 2,
      energy_rating: 'D',
      ges_rating: null,
      outdoor_spaces: ['garden'],
      parking_types: [],
      heating_type: 'individual_heat_pump',
      construction_year: null,
      general_condition: 'good',
      exposure: 'south',
      listing_features: ['Piscine'],
      listing_description: 'Belle villa. Voir plus',
      listing_published_at: '2026-09-14T00:00:00Z',
      listing_url: 'https://www.seloger.com/annonces/achat/maison/vence-06/123456.htm',
      photo_urls: ['https://mms.seloger.com/1.jpg', 'http://insecure.example.com/2.jpg'],
      price: 740_000,
      price_drop_amount: null,
      first_seen_on: null,
      created_at: '2026-10-01T08:00:00Z',
    };
    const observations = [
      { observed_on: '2026-10-01', price: 760_000 },
      { observed_on: '2026-10-20', price: 750_000 },
      { observed_on: '2026-11-05', price: 740_000 },
    ];
    const sheet = buildPropertySheet(sheetFactsFromCompetitor(row, observations), NOW);
    expect(sheet.originLabel).toBe('Concurrent · SeLoger');
    expect(sheet.photos).toEqual(['https://mms.seloger.com/1.jpg']);
    expect(sheet.priceLine).toBe(
      'affiché il y a 6 jours · en vente depuis le 14/09 · 2 baisses de prix connues',
    );
    expect(sheet.description).toBe('Belle villa.');
    expect(sheet.characteristics).toContainEqual({ label: 'Piscine', value: 'Oui' });
    expect(sheet.characteristics).toContainEqual({
      label: 'Chauffage',
      value: 'Individuel pompe à chaleur',
    });
  });

  it('une baisse écrite sur la fiche compte, à défaut de relevés', () => {
    expect(knownDrops([], 10_000)).toBe(1);
    expect(knownDrops([], null)).toBe(0);
  });

  it('un mandat : ses photos, sa description, ses points forts, son prix ; aucun lien', () => {
    const sheet = buildPropertySheet(
      sheetFactsFromMandate(
        {
          property_type: 'Maison',
          rooms_count: 5,
          surface_area: 135,
          city: 'Vence',
          land_area: 900,
          bedrooms_count: 4,
          bathrooms_count: 2,
          energy_rating: 'C',
          ges_rating: 'A',
          outdoor_spaces: ['terrace'],
          parking_types: ['garage'],
          has_pool: false,
          has_elevator: null,
          floor: null,
          heating_type: null,
          construction_year: 1995,
          general_condition: null,
          exposure: null,
          strengths: ['Vue dégagée', ' '],
          description: 'Maison familiale au calme.',
        },
        ['https://storage.example.com/signed/1.jpg'],
        713_000,
      ),
      NOW,
    );
    expect(sheet.originLabel).toBe('Dans l’agence');
    expect(sheet.onlineUrl).toBeNull();
    expect(sheet.priceLine).toBeNull();
    expect(sheet.strengths).toEqual(['Vue dégagée']);
    expect(sheet.characteristics).toContainEqual({ label: 'Piscine', value: 'Non' });
    expect(sheet.characteristics).toContainEqual({
      label: 'Terrain',
      value: formatSquareMeters(900),
    });
  });

  it('un bien d’une sélection : ce que l’import a lu passe avant ce que la recherche a dit', () => {
    const base = {
      label: 'Maison · 5 pièces · 150 m² · Vence',
      reference: candidate.url,
      listedPrice: 735_000,
      priceSeenOn: '2026-11-10',
      snapshot: candidate,
    };
    const fromSearch = buildPropertySheet(
      sheetFactsFromSelectionListing({ ...base, imported: null }),
      NOW,
    );
    expect(fromSearch.description).toBe('Le texte complet de l’annonce.');
    expect(fromSearch.photos).toHaveLength(2);
    const fromImport = buildPropertySheet(
      sheetFactsFromSelectionListing({
        ...base,
        imported: {
          listingDescription: 'Le texte lu sur la page.',
          photoUrls: ['https://file.bienici.com/a.jpg'],
          title: 'EXCLUSIVITÉ Agence Dupont',
          address: '12 rue des Lilas',
          listingPublishedAt: '2026-09-01',
        },
      }),
      NOW,
    );
    expect(fromImport.description).toBe('Le texte lu sur la page.');
    expect(fromImport.photos).toEqual(['https://file.bienici.com/a.jpg']);
    expect(fromImport.priceLine).toContain('en vente depuis le 01/09');
    expect(JSON.stringify(fromImport)).not.toMatch(/Dupont|Lilas/);
  });
});
