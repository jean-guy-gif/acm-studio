import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BuyerDossierDocument } from '@/features/buyer-dossier/components/buyer-dossier-document';
import { buildBuyerDossier } from '@/features/buyer-dossier/services/build-buyer-dossier';
import {
  PRICE_TO_CONFIRM,
  agencyPriceForBuyer,
} from '@/features/buyer-presentation/services/agency-price';
import type { DossierAgency } from '@/features/buyer-dossier/types';
import type { PresentedItemInput } from '@/features/buyer-presentation/types';
import type { BuyerInput } from '@/features/buyers/types';

const buyer: BuyerInput = {
  name: 'Famille Keller',
  phone: '06 00 00 00 00',
  email: 'keller@example.org',
  purpose: 'secondary',
  timeline: 'now',
  notes: 'NOTE-SECRETE',
  propertyTypes: ['house'],
  cities: ['Mougins', 'Valbonne'],
  budgetIdeal: 1_500_000,
  budgetMax: 1_650_000,
  roomsMin: 6,
  bedroomsMin: 4,
  surfaceMin: 180,
  outdoor: true,
  parking: true,
  pool: true,
  floorMin: null,
  elevator: null,
  energyRatingMax: 'D',
  worksAccepted: false,
  mustHave: ['pool', 'cities'],
  dealBreakers: 'ELIMINATOIRE-SECRET',
};

const agency: DossierAgency = {
  name: 'Agence Test',
  logoUrl: null,
  postalAddress: '1 rue du Port, 06600 Antibes',
  professionalCard: 'CPI 0605 2024 000 000 001',
  professionalCardIssuer: 'CCI Nice Côte d’Azur',
  financialGuarantee: null,
  advisorName: 'Carl Conseiller',
  advisorPhone: '06 11 22 33 44',
  advisorEmail: 'carl@example.org',
  advisorPhotoUrl: null,
  advisorQr: null,
};

const item = (
  over: Partial<PresentedItemInput> & { photoHidden?: boolean; visitRequested?: boolean } = {},
) => ({
  itemId: 'i1',
  position: 1,
  source: 'listing' as const,
  category: 'compromise' as const,
  label: 'Maison · 7 pièces · 210 m² · Mougins',
  city: 'Mougins',
  district: null,
  price: 1_639_500,
  priceSeenOn: '2026-10-24',
  surfaceArea: 210,
  roomsCount: 7,
  bedroomsCount: 4,
  outdoor: ['terrace'],
  parking: ['garage'],
  energyRating: 'C',
  photos: ['https://photos.example/1.jpg', 'https://photos.example/2.jpg'],
  gaps: ['Pas de piscine'],
  photoHidden: false,
  visitRequested: false,
  ...over,
});

const build = (items: ReturnType<typeof item>[]) =>
  buildBuyerDossier({
    buyerId: 'b',
    selectionId: 's',
    buyer,
    selectedAt: '2026-10-24T10:00:00Z',
    items,
    agency,
    brandDeclarations: '',
  });

// Mission 119 (partie B) — le dossier : la même sélection, une fiche par bien, la première photo sauf
// « Sans photo », le prix figé, « Pourquoi » et « À savoir » ; rien hors de la liste d'autorisation.
describe('le dossier acquéreur', () => {
  it('une fiche par bien dans l’ordre, la première photo, le prix et le prix au m², le secteur', () => {
    const dossier = build([item({ itemId: 'i2', position: 2 }), item()]);
    expect(dossier.items.map((entry) => entry.itemId)).toEqual(['i1', 'i2']);
    expect(dossier.items[0]).toMatchObject({
      photoUrl: 'https://photos.example/1.jpg',
      hasPhoto: true,
      pricePerSqm: 7807,
      seenOnLabel: 'affiché le 24/10/2026',
      gaps: ['Pas de piscine'],
    });
    expect(dossier.sector).toBe('Mougins, Valbonne');
    expect(dossier.criteria).toContain('Une piscine');
    expect(dossier.items[0]!.why.some((line) => /piscine/i.test(line))).toBe(false);
  });

  it('« Sans photo » retire la photo du document ; un bien sans prix n’a pas de prix au m²', () => {
    const dossier = build([
      item({ photoHidden: true }),
      item({ itemId: 'i2', position: 2, price: null, source: 'project' }),
    ]);
    expect(dossier.items[0]).toMatchObject({ photoUrl: null, hasPhoto: true, photoHidden: true });
    expect(dossier.items[1]).toMatchObject({ price: null, pricePerSqm: null, seenOnLabel: null });
  });

  it('une visite déjà demandée est dite, pour la dernière page', () => {
    expect(build([item({ visitRequested: true })]).items[0]!.visitRequested).toBe(true);
  });

  it('jamais côté acquéreur : ni notes, ni critères éliminatoires, ni coordonnées de la fiche, ni titre piège', () => {
    const trap = {
      ...item(),
      title: 'EXCLUSIVITÉ Agence Dupont 12 rue des Lilas',
      listingUrl: 'https://www.seloger.com/annonces/piege.htm',
      address: '12 rue des Lilas',
      soldBy: 'agency',
      exclusivity: 'yes',
    } as unknown as ReturnType<typeof item>;
    const payload = JSON.stringify(build([trap]));
    for (const leak of [
      'NOTE-SECRETE',
      'ELIMINATOIRE-SECRET',
      'keller@example.org',
      '06 00 00 00 00',
      'EXCLUSIVITÉ Agence Dupont',
      'rue des Lilas',
      'piege.htm',
      'soldBy',
      'exclusivity',
      'title',
      'listingUrl',
    ]) {
      expect(payload).not.toContain(leak);
    }
    // Le conseiller et l'agence, eux, y sont : c'est le document qui les porte.
    expect(payload).toContain('Carl Conseiller');
    expect(payload).toContain('CPI 0605');
  });

  it('le code du dossier ne lit ni titre, ni adresse d’annonce, ni lien, ni vendeur, ni exclusivité, ni « estimation », ni « disponible »', () => {
    const root = join(process.cwd(), 'src');
    const files = [
      join(root, 'features', 'buyer-dossier', 'components', 'buyer-dossier-document.tsx'),
      join(root, 'features', 'buyer-dossier', 'components', 'dossier-visit-form.tsx'),
      join(root, 'features', 'buyer-dossier', 'services', 'build-buyer-dossier.ts'),
      join(root, 'app', 'dossier', '[token]', 'page.tsx'),
    ];
    const code = files.map((path) => readFileSync(path, 'utf8')).join('\n');
    for (const forbidden of [
      /\.title\b/,
      /listingUrl/,
      /listing_url/,
      /locator_address/,
      /soldBy|sold_by/,
      /exclusivity/,
      /advisor_price|advisorPrice/,
      /commercialization/i,
      /estimation/i,
      /disponible/i,
    ]) {
      expect(code).not.toMatch(forbidden);
    }
    const query = readFileSync(
      join(root, 'features', 'buyer-dossier', 'queries', 'load-buyer-dossier.ts'),
      'utf8',
    );
    for (const forbidden of [
      'title',
      'listing_url',
      'address',
      'sold_by',
      'exclusivity',
      'advisor_price',
      'commercialization',
    ]) {
      expect(query).not.toMatch(new RegExp(`select\\([^)]*\\b${forbidden}\\b`));
    }
  });
});

// Décision de Jean-Guy (24/10, test demandé le 25/10) : devant l'acquéreur, un bien de l'agence en
// mandat signé montre son prix de commercialisation ; un vendeur à relancer ne montre aucun prix,
// mais « Prix à confirmer avec le propriétaire » — sur le document imprimé comme sur le lien.
describe('le prix d’un bien de l’agence sur le dossier', () => {
  const render = (outcome: string) =>
    renderToStaticMarkup(
      createElement(BuyerDossierDocument, {
        dossier: build([item({ source: 'project', price: agencyPriceForBuyer(outcome, 452_000) })]),
      }),
    );

  it('vendeur à relancer : « Prix à confirmer avec le propriétaire », aucun montant', () => {
    const html = render('follow_up');
    expect(html).toContain(PRICE_TO_CONFIRM);
    expect(html).not.toContain('452');
    expect(html).not.toContain('data-testid="dossier-price"');
  });

  it('mandat signé : le prix de commercialisation, comme « Prix affiché »', () => {
    const html = render('signed');
    expect(html).toContain('data-testid="dossier-price"');
    expect(html.replace(/[\u00a0\u202f]/g, ' ')).toContain('452 000 €');
    expect(html).not.toContain(PRICE_TO_CONFIRM);
  });
});
