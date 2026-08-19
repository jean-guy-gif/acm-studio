import { describe, expect, it } from 'vitest';

import { normalizeListingData } from '@/features/comparable-import/services/normalize-listing-data';
import type { PartialListingData } from '@/features/comparable-import/types';

describe('normalizeListingData priority (JSON-LD > Open Graph > HTML)', () => {
  it('keeps the JSON-LD value over Open Graph and HTML', () => {
    const jsonLd: PartialListingData = { price: 450000, title: 'JSON-LD title' };
    const openGraph: PartialListingData = { price: 999999, title: 'OG title', city: 'Paris' };
    const html: PartialListingData = { price: 111111, surfaceArea: 80 };
    const { data } = normalizeListingData(
      {
        portal: {},
        jsonLd,
        openGraph,
        html,
        embeddedPhotoUrls: [],
        embeddedDescription: null,
        listingPublishedAt: null,
      },
      'https://x.com/1',
      'x.com',
    );
    expect(data.price).toBe(450000); // JSON-LD wins
    expect(data.title).toBe('JSON-LD title');
    expect(data.city).toBe('Paris'); // OG fills what JSON-LD missed
    expect(data.surfaceArea).toBe(80); // HTML fills what both missed
  });

  it('reports found and missing fields and dedups photos across sources', () => {
    const jsonLd: PartialListingData = { price: 300000, photoUrls: ['https://x.com/a.jpg'] };
    const openGraph: PartialListingData = {
      photoUrls: ['https://x.com/a.jpg', 'https://x.com/b.jpg'],
    };
    const html: PartialListingData = {};
    const { data, foundFields, missingFields } = normalizeListingData(
      {
        portal: {},
        jsonLd,
        openGraph,
        html,
        embeddedPhotoUrls: [],
        embeddedDescription: null,
        listingPublishedAt: null,
      },
      'https://x.com/1',
      'x.com',
    );
    expect(data.photoUrls).toEqual(['https://x.com/a.jpg', 'https://x.com/b.jpg']);
    expect(foundFields).toContain('price');
    expect(foundFields).toContain('photoUrls');
    expect(missingFields).toContain('city');
  });

  it('rejects a generic title and generic share image (Bien’ici regression)', () => {
    const openGraph: PartialListingData = {
      title: "Toutes les annonces immobilières dans le neuf et l'ancien - Bien'ici",
      listingDescription: 'Découvrez toutes les annonces immobilières pour acheter ou louer',
      photoUrls: ['https://res.bienici.com/x/images/share.png'],
    };
    const { data, foundFields, missingFields } = normalizeListingData(
      {
        portal: {},
        jsonLd: {},
        openGraph,
        html: {},
        embeddedPhotoUrls: [],
        embeddedDescription: null,
        listingPublishedAt: null,
      },
      'https://www.bienici.com/annonce/1',
      "Bien'ici",
    );
    expect(data.title).toBeNull();
    expect(data.listingDescription).toBeNull();
    expect(data.photoUrls).toEqual([]);
    expect(missingFields).toContain('title');
    expect(missingFields).toContain('photoUrls');
    expect(foundFields).not.toContain('title');
    expect(foundFields).not.toContain('photoUrls');
  });

  // Terrain (staging, 18/08) : depuis une IP de datacenter, Bien’ici sert une page
  // de blocage. Aucun champ métier n’en sort, mais elle porte des pixels de suivi
  // et des icônes que rien n’identifiait comme génériques : ils étaient proposés
  // comme « photos détectées ». Une photo fausse est pire qu’aucune photo.
  it('drops every photo when no hard business field could be extracted', () => {
    const openGraph: PartialListingData = {
      listingDescription: 'Une page qui n’est pas une annonce',
      photoUrls: ['https://tracker.example.com/t.gif?id=42', 'https://cdn.example.com/ui-42.png'],
    };
    const { data, foundFields, missingFields } = normalizeListingData(
      {
        portal: {},
        jsonLd: {},
        openGraph,
        html: {},
        embeddedPhotoUrls: [],
        embeddedDescription: null,
        listingPublishedAt: null,
      },
      'https://www.bienici.com/annonce/bloquee',
      "Bien'ici",
    );
    expect(data.price).toBeNull();
    expect(data.surfaceArea).toBeNull();
    expect(data.roomsCount).toBeNull();
    expect(data.title).toBeNull();
    expect(data.photoUrls).toEqual([]);
    expect(missingFields).toContain('photoUrls');
    expect(foundFields).not.toContain('photoUrls');
  });

  it.each([
    ['price', { price: 320000 } as PartialListingData],
    ['surfaceArea', { surfaceArea: 74 } as PartialListingData],
    ['roomsCount', { roomsCount: 3 } as PartialListingData],
    ['title', { title: 'Appartement 3 pièces avec balcon' } as PartialListingData],
  ])('keeps the photos as soon as %s is extracted', (_field, jsonLd) => {
    const { data, foundFields } = normalizeListingData(
      {
        portal: {},
        jsonLd: { ...jsonLd, photoUrls: ['https://cdn.example.com/photo-1.jpg'] },
        openGraph: {},
        html: {},
        embeddedPhotoUrls: [],
        embeddedDescription: null,
        listingPublishedAt: null,
      },
      'https://www.bienici.com/annonce/1',
      "Bien'ici",
    );
    expect(data.photoUrls).toEqual(['https://cdn.example.com/photo-1.jpg']);
    expect(foundFields).toContain('photoUrls');
  });

  // Terrain (19/08, SeLoger) : en collant le code de l'annonce, seule la photo de
  // couverture remontait — le reste de la galerie n'existe que dans un bloc de
  // données JavaScript, hors balises <img>.
  it('récupère la galerie encastrée, chez le même hébergeur que la couverture', () => {
    const { data } = normalizeListingData(
      {
        portal: { title: 'Appartement 3 pièces', price: 303000 },
        jsonLd: {},
        openGraph: {
          photoUrls: ['https://v.seloger.com/s/crop/800x600/visuels/1/a/couverture.jpg'],
        },
        html: {},
        embeddedDescription: null,
        listingPublishedAt: null,
        embeddedPhotoUrls: [
          'https://v.seloger.com/s/crop/800x600/visuels/1/a/salon.jpg',
          'https://v.seloger.com/s/crop/800x600/visuels/1/a/cuisine.jpg',
          // Habillage du site, hébergeur différent : jamais retenu.
          'https://static.partenaire-pub.com/banniere.jpg',
        ],
      },
      'https://www.seloger.com/annonces/achat/appartement/antibes-06/1.htm',
      'SeLoger',
    );
    expect(data.photoUrls).toEqual([
      'https://v.seloger.com/s/crop/800x600/visuels/1/a/couverture.jpg',
      'https://v.seloger.com/s/crop/800x600/visuels/1/a/salon.jpg',
      'https://v.seloger.com/s/crop/800x600/visuels/1/a/cuisine.jpg',
    ]);
  });

  it('n’invente aucune photo si la couverture elle-même est absente', () => {
    const { data } = normalizeListingData(
      {
        portal: { title: 'Appartement 3 pièces', price: 303000 },
        jsonLd: {},
        openGraph: {},
        html: {},
        embeddedPhotoUrls: ['https://static.partenaire-pub.com/banniere.jpg'],
        embeddedDescription: null,
        listingPublishedAt: null,
      },
      'https://www.seloger.com/annonces/achat/appartement/antibes-06/1.htm',
      'SeLoger',
    );
    expect(data.photoUrls).toEqual([]);
  });

  it('maps structured values to dedicated fields, never into listing_features', () => {
    const portal: PartialListingData = {
      portalPricePerSquareMeter: 5827,
      district: "L'Estagnol",
      gesRating: 'C',
      constructionYear: 1985,
      heatingType: 'Individuel',
      energySource: 'Électricité',
    };
    const jsonLd: PartialListingData = { listingFeatures: ['Ascenseur', 'Exposition ouest'] };
    const { data } = normalizeListingData(
      {
        portal,
        jsonLd,
        openGraph: {},
        html: {},
        embeddedPhotoUrls: [],
        embeddedDescription: null,
        listingPublishedAt: null,
      },
      'https://www.seloger.com/1',
      'SeLoger',
    );
    expect(data.portalPricePerSquareMeter).toBe(5827);
    expect(data.district).toBe("L'Estagnol");
    expect(data.gesRating).toBe('C');
    expect(data.constructionYear).toBe(1985);
    expect(data.heatingType).toBe('Individuel');
    expect(data.energySource).toBe('Électricité');
    // Only genuine portal characteristics — no structured scalar duplicated here.
    expect(data.listingFeatures).toEqual(['Ascenseur', 'Exposition ouest']);
  });

  it('keeps a real title from a lower-priority source when the higher one is generic', () => {
    const openGraph: PartialListingData = { title: 'SeLoger' };
    const html: PartialListingData = { title: 'Appartement 3 pièces Antibes' };
    const { data, foundFields } = normalizeListingData(
      {
        portal: {},
        jsonLd: {},
        openGraph,
        html,
        embeddedPhotoUrls: [],
        embeddedDescription: null,
        listingPublishedAt: null,
      },
      'https://www.seloger.com/1',
      'SeLoger',
    );
    expect(data.title).toBe('Appartement 3 pièces Antibes');
    expect(foundFields).toContain('title');
  });
});

// Mission 33 — délai de commercialisation lu dans l'annonce elle-même.
describe('normalizeListingData — délai de commercialisation', () => {
  it('reporte la date de mise en ligne et en déduit les jours', () => {
    const { data, foundFields } = normalizeListingData(
      {
        portal: {},
        jsonLd: { price: 303000 },
        openGraph: {},
        html: {},
        embeddedPhotoUrls: [],
        embeddedDescription: null,
        listingPublishedAt: '2026-04-10T07:32:00.000Z',
      },
      'https://www.seloger.com/annonces/1.htm',
      'seloger',
    );
    expect(data.listingPublishedAt).toBe('2026-04-10T07:32:00.000Z');
    expect(data.daysOnMarket).toBeGreaterThanOrEqual(131);
    expect(foundFields).toContain('daysOnMarket');
  });

  // Rien n'est inventé : sans date publiée, le champ reste à saisir à la main.
  it('ne devine aucun délai quand le portail ne publie pas de date', () => {
    const { data, missingFields } = normalizeListingData(
      {
        portal: {},
        jsonLd: { price: 279000 },
        openGraph: {},
        html: {},
        embeddedPhotoUrls: [],
        embeddedDescription: null,
        listingPublishedAt: null,
      },
      'https://www.green-acres.fr/annonce/1',
      'green_acres',
    );
    expect(data.listingPublishedAt).toBeNull();
    expect(data.daysOnMarket).toBeNull();
    expect(missingFields).toContain('daysOnMarket');
  });
});
