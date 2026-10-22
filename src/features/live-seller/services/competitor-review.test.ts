import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { competitorReviewFacts } from '@/features/live-seller/services/competitor-review';
import type {
  AuthorizedSellerComparable,
  NeutralSellerComparable,
} from '@/features/live-seller/services/project-live-for-seller';
import type { LiveComparableResponse } from '@/features/live-seller/types';

// Mission 113 — « Revoir » un concurrent sur l'écran du plus dangereux.

const neutral: NeutralSellerComparable = {
  authorized: false,
  id: 'c1',
  position: 1,
  neutralLabel: 'Appartement · 3 pièces · 65 m² · Exempleville',
  city: 'Exempleville',
  district: null,
  propertyType: 'Appartement',
  surfaceArea: 65,
  roomsCount: 3,
  bedroomsCount: 2,
  energyRating: 'D',
  gesRating: null,
  photoUrl: null,
  photoUrls: [],
  featureComparison: [],
  response: null,
  durationKnown: true,
};

const answered = (serious: string): LiveComparableResponse =>
  ({
    seller_serious_competitor: serious,
    seller_estimated_listing_price: 280000,
  }) as LiveComparableResponse;

const revealed = (serious: string, days: number | null): AuthorizedSellerComparable =>
  ({
    ...neutral,
    authorized: true,
    response: answered(serious),
    price: 298000,
    pricePerSquareMeter: 4585,
    isOutlier: false,
    priceHistory: null,
    marketDuration: days == null ? null : { available: true, days, firstSeenAt: null, label: null },
  }) as AuthorizedSellerComparable;

describe('ce que montre la fiche « Revoir »', () => {
  it('un concurrent révélé : prix affiché, prix au m² et durée révélée', () => {
    expect(competitorReviewFacts(revealed('yes', 45))).toEqual({
      price: 298000,
      pricePerSquareMeter: 4585,
      marketDays: 45,
    });
  });

  it('durée pas encore révélée : le prix seul', () => {
    expect(competitorReviewFacts(revealed('unsure', null))).toEqual({
      price: 298000,
      pricePerSquareMeter: 4585,
      marketDays: null,
    });
  });

  it('un « Non » ne montre ni prix ni durée, même dit après la révélation', () => {
    const nothing = { price: null, pricePerSquareMeter: null, marketDays: null };
    expect(competitorReviewFacts({ ...neutral, response: answered('no') })).toEqual(nothing);
    expect(competitorReviewFacts(revealed('no', 45))).toEqual(nothing);
  });

  it('un concurrent jamais révélé n’a aucun montant', () => {
    expect(competitorReviewFacts(neutral).price).toBeNull();
  });
});

const read = (...parts: string[]) =>
  readFileSync(join(process.cwd(), 'src', 'features', 'live-seller', ...parts), 'utf8');

describe('« Revoir » n’écrit rien et ne dit rien de trop', () => {
  const review = read('components', 'live-competitor-review.tsx');
  const dangerous = read('components', 'live-page-dangerous.tsx');

  it('la fiche ne contient aucun champ, aucune action, aucun écran gardé', () => {
    for (const forbidden of [
      /<input|<textarea|<select|<form/,
      /\/actions\//,
      /use server/,
      /\bfetch\(/,
      /localStorage|sessionStorage/,
      /history\.|router\.|useRouter|searchParams/,
    ]) {
      expect(review, String(forbidden)).not.toMatch(forbidden);
    }
  });

  it('elle nomme le concurrent par son libellé neutre, sans titre, adresse, vendeur ni exclusivité', () => {
    expect(review).toContain('entry.neutralLabel');
    expect(review).not.toMatch(/\.title\b|listingUrl|listing_url|sold_?[bB]y|exclusiv/);
  });

  it('« Revoir » est un simple bouton, hors de la carte à choisir : il ne coche rien', () => {
    expect(dangerous).toMatch(/type="button"\s+onClick=\{\(\) => setReviewedId\(entry\.id\)\}/);
    const button = dangerous.indexOf('{reviewButton(entry)}');
    expect(button).toBeGreaterThan(dangerous.indexOf('</label>'));
    // Les prix passent par competitorReviewFacts, jamais lus directement dans la fiche.
    expect(review).not.toMatch(/entry\.(price|marketDuration|priceHistory)\b/);
  });
});
