import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  IMPORTED_FROM_SEARCH_LABEL,
  LISTING_WITHDRAWN_LABEL,
  pendingCauseLabel,
  pendingImportLabel,
  pendingImportsTitle,
} from '@/features/competitor-search/services/pending-import-labels';
import {
  candidateSnapshot,
  parseSearchSnapshot,
  snapshotPropertyType,
  snapshotToComparableInput,
} from '@/features/competitor-search/services/search-snapshot';
import { parseStreamEstateResponse } from '@/features/competitor-search/services/stream-estate';
import type { CompetitorCandidate } from '@/features/competitor-search/types';
import { importFailureStats } from '@/features/operations/services/import-failures';

import nice from '../__fixtures__/stream-estate-nice-4p.json';

const plain = (text: string) => text.replace(/[  ]/g, ' ');
const LISTING = new URL('https://www.bienici.com/annonce/vente/nice/appartement/4pieces/abc');

const portalCard: CompetitorCandidate = {
  key: '123',
  url: 'https://www.seloger.com/annonces/achat/appartement/cagnes-sur-mer-06/123.htm',
  title: 'Appartement 3 pièces 65 m²',
  price: 336_000,
  surfaceArea: 65,
  roomsCount: 3,
  propertyType: 'apartment',
  pricePerSqm: 5169,
  landArea: null,
  city: 'Cagnes-sur-Mer',
  photoUrls: ['https://v.seloger.com/a.jpg', 'http://pas-https.test/b.jpg'],
  isNewBuild: false,
};

// Mission 101 — créer le concurrent depuis ce que la recherche a déjà donné : champs structurés
// seulement, aucun champ inventé, aucun appel de plus.
describe('une carte Stream Estate', () => {
  const [candidate] = parseStreamEstateResponse(nice, new Date('2026-09-29T08:00:00Z'))!.candidates;
  const snapshot = candidateSnapshot(candidate);

  it('garde les chambres et la dernière baisse datée, lues dans la MÊME réponse', () => {
    expect(candidate.streamEstate?.bedrooms).toBe(3);
    expect(candidate.streamEstate?.priceChanges).toEqual([
      { at: '2026-09-22', from: 449000, to: 429000, percent: -4.45 },
    ]);
    expect(snapshot).toMatchObject({
      source: 'stream_estate',
      price: 429000,
      roomsCount: 4,
      bedroomsCount: 3,
      propertyType: 'apartment',
      lastPriceDrop: { at: '2026-09-22', amount: 20000, percent: 4.45 },
    });
  });

  it('devient un concurrent : prix, surface, pièces, chambres, commune, photos, baisse', () => {
    const input = snapshotToComparableInput(snapshot, LISTING)!;
    expect(input).toMatchObject({
      price: 429000,
      rooms_count: 4,
      bedrooms_count: 3,
      city: snapshot.city,
      surface_area: snapshot.surfaceArea,
      photo_urls: snapshot.photoUrls,
      price_drop_amount: 20000,
      price_drop_percentage: 4.45,
      listing_url: LISTING.href,
      source: "Bien'ici",
    });
    expect(snapshotPropertyType(snapshot)).toBe('apartment');
  });

  it('n’invente rien : ni description, ni adresse, ni date de mise en ligne, ni vendeur', () => {
    const input = snapshotToComparableInput(snapshot, LISTING)!;
    expect(input.listing_description).toBeNull();
    expect(input.address).toBeNull();
    expect(input.postal_code).toBeNull();
    expect(input.listing_published_at).toBeNull();
    expect(input.days_on_market).toBeNull();
    expect(Object.keys(input)).not.toContain('sold_by');
    expect(JSON.stringify(snapshot)).not.toMatch(/description/i);
  });

  it('une recherche d’avant la mission n’a pas les chambres : elles restent vides', () => {
    const before = {
      ...candidate,
      streamEstate: { ...candidate.streamEstate!, bedrooms: undefined, priceChanges: undefined },
    };
    const old = candidateSnapshot(before);
    expect(old.bedroomsCount).toBeNull();
    // La baisse reste connue en pourcentage, sans date ni montant.
    expect(old.lastPriceDrop).toEqual({ at: null, amount: null, percent: 4.45 });
    expect(snapshotToComparableInput(old, LISTING)).toMatchObject({
      bedrooms_count: null,
      price_drop_amount: null,
      price_drop_percentage: 4.45,
    });
  });
});

describe('une carte de portail', () => {
  it('devient un concurrent avec ce que la carte porte ; les photos non sûres sont écartées', () => {
    const snapshot = candidateSnapshot(portalCard);
    expect(snapshot).toMatchObject({ source: 'portal', bedroomsCount: null, lastPriceDrop: null });
    // Une adresse d'image en http est écartée ; les autres restent.
    expect(snapshot.photoUrls).toEqual(['https://v.seloger.com/a.jpg']);
    expect(snapshotToComparableInput(snapshot, new URL(portalCard.url))).toMatchObject({
      price: 336000,
      surface_area: 65,
      rooms_count: 3,
      city: 'Cagnes-sur-Mer',
      source: 'SeLoger',
    });
  });

  it('sans prix, pas de concurrent : le bien reste en attente', () => {
    const snapshot = candidateSnapshot({ ...portalCard, price: null });
    expect(snapshotToComparableInput(snapshot, new URL(portalCard.url))).toBeNull();
  });
});

describe('parseSearchSnapshot — ce qui revient de la base ou du navigateur est relu', () => {
  it('refuse ce qui n’a pas la forme attendue', () => {
    expect(parseSearchSnapshot(null)).toBeNull();
    expect(parseSearchSnapshot({})).toBeNull();
    expect(parseSearchSnapshot({ source: 'ailleurs' })).toBeNull();
  });

  it('une valeur hors bornes devient absente, sans faire tomber le reste', () => {
    const parsed = parseSearchSnapshot({
      ...candidateSnapshot(portalCard),
      price: -5,
      energyClass: 'Z',
      roomsCount: 3.5,
      title: 'x'.repeat(5000),
    });
    expect(parsed).toMatchObject({ price: null, energyClass: null, roomsCount: null, title: null });
    expect(parsed?.surfaceArea).toBe(65);
  });
});

describe('les mots de l’import en attente', () => {
  it('dit le bien par ses champs, jamais par le titre du portail', () => {
    expect(plain(pendingImportLabel(candidateSnapshot(portalCard)))).toBe(
      'Appartement · 3 pièces · 65 m² · Cagnes-sur-Mer · 336 000 €',
    );
    expect(pendingImportLabel(null)).toBe('Concurrent retenu');
  });

  it('s’accorde, et nomme la cause du dernier essai', () => {
    expect(pendingImportsTitle(1)).toBe('1 concurrent retenu n’est pas encore importé');
    expect(pendingImportsTitle(3)).toBe('3 concurrents retenus ne sont pas encore importés');
    expect(pendingCauseLabel('robots')).toBe(
      'Dernier essai : le site refuse la lecture automatique de cette annonce.',
    );
    expect(pendingCauseLabel('no_price')).toBe(
      'Dernier essai : la recherche ne donne pas le prix de ce bien.',
    );
    expect(pendingCauseLabel(null)).toBeNull();
    expect(pendingCauseLabel('inconnue')).toBeNull();
    expect(IMPORTED_FROM_SEARCH_LABEL).toBe('Importé depuis la recherche');
    expect(LISTING_WITHDRAWN_LABEL).toBe('Annonce retirée');
  });
});

describe('le taux d’échec de lecture par portail', () => {
  it('compte les échecs par cause, face aux annonces importées depuis leur page', () => {
    const stats = importFailureStats(
      [
        'seloger.com · robots',
        'seloger.com · robots',
        'seloger.com · timeout',
        'bienici.com · withdrawn',
        'une ligne · qui · ne ressemble à rien',
        'seloger.com · cause-inventée',
      ],
      [
        'https://www.seloger.com/annonces/1.htm',
        'https://www.seloger.com/annonces/2.htm',
        'https://www.bienici.com/annonce/3',
        'https://www.green-acres.fr/fr/properties/4.htm',
        null,
        'pas une adresse',
      ],
    );
    expect(stats).toEqual([
      {
        host: 'seloger.com',
        failed: 3,
        read: 2,
        failureRate: 60,
        causes: [
          expect.objectContaining({ cause: 'robots', count: 2 }),
          expect.objectContaining({ cause: 'timeout', count: 1 }),
        ],
      },
      {
        host: 'bienici.com',
        failed: 1,
        read: 1,
        failureRate: 50,
        causes: [expect.objectContaining({ cause: 'withdrawn', count: 1 })],
      },
      { host: 'green-acres.fr', failed: 0, read: 1, failureRate: 0, causes: [] },
    ]);
  });

  // Mission 103 — une page sans prix ni preuve de retrait se compte à part : un pic sur un
  // portail signale un captcha ou un changement de gabarit.
  it('compte les pages sans données sous leur propre cause', () => {
    expect(importFailureStats(['seloger.com · empty', 'seloger.com · empty'], [])).toEqual([
      {
        host: 'seloger.com',
        failed: 2,
        read: 0,
        failureRate: 100,
        causes: [{ cause: 'empty', label: 'page sans données (captcha ?)', count: 2 }],
      },
    ]);
  });
});

// L'import en attente, « Importé depuis la recherche » et « Annonce retirée » sont des faits de
// préparation : rien n'en passe côté vendeur.
describe('rien de l’import en attente ne passe côté vendeur', () => {
  const files = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return files(path);
      return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
    });

  it('ni le Live, ni la présentation vendeur, ni la scène ne le lisent', () => {
    const src = join(process.cwd(), 'src');
    const seller = [
      ...files(join(src, 'features/live-seller')),
      ...files(join(src, 'features/seller-presentation')),
      ...files(join(src, 'app/(stage)')),
    ];
    expect(seller.length).toBeGreaterThan(20);
    // Mission 112 — deux fichiers du dossier `live-seller` sont des écrans du CONSEILLER, avant le
    // Live : le bouton « Lancer le Live » et ce qu'il lit. Ils rappellent les imports en attente
    // (« 2 concurrents retenus attendent leur import ») ; rien n'en passe dans la charge du Live.
    const advisorSide = [
      join('features', 'live-seller', 'components', 'live-launch-actions.tsx'),
      join('features', 'live-seller', 'queries', 'get-live-launch-info.ts'),
    ];
    // Mission 152 (Jean-Guy, 11/11) — « Voir l'annonce » : quand l'annonce n'est plus en ligne, la
    // copie enregistrée le dit au vendeur (« L'annonce n'est plus en ligne depuis le … »), une fois
    // le prix dévoilé. Ces deux fichiers lisent donc le retrait (M103), et eux seuls ; l'import en
    // attente et « Importé depuis la recherche » ne passent toujours pas.
    const listingGone = [
      join('features', 'live-seller', 'actions', 'open-live-listing.ts'),
      join('features', 'seller-presentation', 'services', 'build-seller-presentation.ts'),
    ];
    for (const path of seller.filter((file) => !advisorSide.some((side) => file.endsWith(side)))) {
      const forbidden = listingGone.some((side) => path.endsWith(side))
        ? /pending_competitor_imports|pending-imports|imported_from_search|PendingImportsBanner/
        : /pending_competitor_imports|pending-imports|imported_from_search|listing_withdrawn|PendingImportsBanner/;
      expect(readFileSync(path, 'utf8'), path).not.toMatch(forbidden);
    }
  });
});
