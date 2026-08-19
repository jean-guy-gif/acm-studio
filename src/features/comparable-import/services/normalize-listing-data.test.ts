import { describe, expect, it } from 'vitest';

import { normalizeListingData } from '@/features/comparable-import/services/normalize-listing-data';
import type { PartialListingData } from '@/features/comparable-import/types';

describe('normalizeListingData priority (JSON-LD > Open Graph > HTML)', () => {
  it('keeps the JSON-LD value over Open Graph and HTML', () => {
    const jsonLd: PartialListingData = { price: 450000, title: 'JSON-LD title' };
    const openGraph: PartialListingData = { price: 999999, title: 'OG title', city: 'Paris' };
    const html: PartialListingData = { price: 111111, surfaceArea: 80 };
    const { data } = normalizeListingData(
      { portal: {}, jsonLd, openGraph, html },
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
      { portal: {}, jsonLd, openGraph, html },
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
      { portal: {}, jsonLd: {}, openGraph, html: {} },
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
      { portal: {}, jsonLd: {}, openGraph, html: {} },
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
      },
      'https://www.bienici.com/annonce/1',
      "Bien'ici",
    );
    expect(data.photoUrls).toEqual(['https://cdn.example.com/photo-1.jpg']);
    expect(foundFields).toContain('photoUrls');
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
      { portal, jsonLd, openGraph: {}, html: {} },
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
      { portal: {}, jsonLd: {}, openGraph, html },
      'https://www.seloger.com/1',
      'SeLoger',
    );
    expect(data.title).toBe('Appartement 3 pièces Antibes');
    expect(foundFields).toContain('title');
  });
});
