import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { buildBuyerDeck } from '@/features/buyer-deck/services/buyer-deck';
import type { DeckItemInput } from '@/features/buyer-deck/types';
import { BuyerDossierDocument } from '@/features/buyer-dossier/components/buyer-dossier-document';
import {
  buildBuyerDossier,
  publicDeck,
} from '@/features/buyer-dossier/services/build-buyer-dossier';
import type { DossierAgency } from '@/features/buyer-dossier/types';
import {
  PRICE_TO_CONFIRM,
  agencyPriceForBuyer,
} from '@/features/buyer-presentation/services/agency-price';
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
  advisorQr: { size: 21, path: 'M0 0h1v1H0z' },
};

const item = (over: Partial<DeckItemInput> = {}): DeckItemInput => ({
  itemId: 'i1',
  position: 1,
  source: 'listing',
  category: 'compromise',
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
  gaps: [],
  propertyType: 'Maison',
  floor: null,
  hasPool: false,
  hasElevator: null,
  condition: null,
  listedSince: null,
  priceDrop: null,
  pitch: null,
  ...over,
});

const deck = (items: DeckItemInput[], words: string | null = null) =>
  buildBuyerDeck({
    buyerId: 'b',
    buyer,
    selectionId: 's',
    selectedAt: '2026-10-24T10:00:00Z',
    presentedAt: null,
    buyerWords: words,
    items,
    now: new Date('2026-10-25T10:00:00Z'),
  });

const build = (items: DeckItemInput[], hidden: Record<string, boolean> = {}) =>
  buildBuyerDossier({
    buyerId: 'b',
    selectionId: 's',
    selectedAt: '2026-10-24T10:00:00Z',
    sector: 'Mougins, Valbonne',
    deck: deck(items, 'Une maison à Mougins, avec une piscine.'),
    hidden: new Map(Object.entries(hidden)),
    answers: [],
    availability: [],
    agency,
    brandDeclarations: '',
  });

const html = (items: DeckItemInput[], hidden: Record<string, boolean> = {}) =>
  renderToStaticMarkup(createElement(BuyerDossierDocument, { dossier: build(items, hidden) }));
const count = (text: string, needle: string): number => text.split(needle).length - 1;

// Mission 122 (partie B) — le dossier suit le déroulé : ce que reçoit l'acquéreur, et rien de plus.
describe('le déroulé remis à l’acquéreur', () => {
  it('ni les phrases proposées par l’outil, ni le signalement réservé au conseiller', () => {
    const shown = publicDeck(
      deck([item({ pitch: 'Le calme à deux pas.', outdoor: ['none'] })], 'Sa phrase à lui.'),
      new Map(),
    );
    expect(shown.words).toBe('Sa phrase à lui.');
    expect(shown.wordsProposed).toBe('Sa phrase à lui.');
    expect(shown.items[0]!.pitchProposed).toBe('Le calme à deux pas.');
    expect(shown.items[0]!.blocked).toBe(false);
    expect(shown.items[0]!.blockedBy).toEqual([]);
  });

  it('« Sans photo » retire les photos du bien, sur le lien comme sur le PDF', () => {
    const dossier = build([item(), item({ itemId: 'i2', position: 2 })], { i1: true });
    expect(dossier.deck.items[0]!.photos).toEqual([]);
    expect(dossier.deck.items[0]!.item.photos).toEqual([]);
    expect(dossier.deck.items[1]!.photos).toHaveLength(2);
    expect(dossier.photoChoices).toEqual([
      expect.objectContaining({ itemId: 'i1', letter: 'A', hasPhoto: true, photoHidden: true }),
      expect.objectContaining({ itemId: 'i2', letter: 'B', hasPhoto: true, photoHidden: false }),
    ]);
  });

  it('jamais côté acquéreur : ni notes, ni critères éliminatoires, ni coordonnées de la fiche, ni titre piège', () => {
    const trap = {
      ...item(),
      title: 'EXCLUSIVITÉ Agence Dupont 12 rue des Lilas',
      listingUrl: 'https://www.seloger.com/annonces/piege.htm',
      soldBy: 'agency',
      exclusivity: 'yes',
    } as unknown as DeckItemInput;
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
      'listingUrl',
      'estimation',
      'disponible',
    ]) {
      expect(payload).not.toContain(leak);
    }
    expect(payload).toContain('Carl Conseiller');
    expect(payload).toContain('CPI 0605');
  });
});

// Mission 122 (partie B), point 10 — le PDF : couverture, la grille en page 2, un bien par page,
// « Mes choix » à la fin.
describe('le PDF du dossier qui fait agir', () => {
  it('couverture : sa phrase, la photo du bien A, « Votre sélection du [date] »', () => {
    const page = html([
      item(),
      item({ itemId: 'i2', position: 2, photos: ['https://photos.example/b.jpg'] }),
    ]);
    const cover = page.slice(
      page.indexOf('data-testid="dossier-cover"'),
      page.indexOf('data-testid="dossier-grid"'),
    );
    expect(cover).toContain('Votre sélection du 24/10/2026');
    expect(cover).toContain('« Une maison à Mougins, avec une piscine. »');
    expect(cover).toContain('https://photos.example/1.jpg');
    expect(cover).not.toContain('https://photos.example/b.jpg');
  });

  it('la grille en page 2, puis un bien par page, décrit par ses critères', () => {
    const page = html([
      item(),
      item({ itemId: 'i2', position: 2 }),
      item({ itemId: 'i3', position: 3 }),
    ]);
    expect(page.indexOf('data-testid="dossier-grid"')).toBeLessThan(
      page.indexOf('data-testid="dossier-item"'),
    );
    expect(count(page, 'data-testid="dossier-grid-row"')).toBe(deck([item()]).criteria.length);
    expect(count(page, 'data-testid="dossier-item"')).toBe(3);
    expect(page).toContain('Bien A · ');
    expect(page).toContain('data-testid="dossier-mark"');
  });

  it('« Mes choix » : trois cases par bien, ses disponibilités, le conseiller et son QR', () => {
    const page = html([item(), item({ itemId: 'i2', position: 2 })]);
    const choices = page.slice(page.indexOf('data-testid="dossier-choices"'));
    expect(choices).toContain('Mes choix');
    expect(count(choices, 'data-testid="dossier-choice-row"')).toBe(2);
    // 3 cases par bien, plus les 5 créneaux.
    expect(count(choices, 'data-testid="dossier-choice-box"')).toBe(2 * 3 + 5);
    for (const label of [
      'Je veux le visiter',
      'Peut-être',
      'Pas pour moi',
      'Samedi matin',
      'En semaine en soirée',
    ]) {
      expect(choices).toContain(label);
    }
    expect(choices).toContain('data-testid="dossier-advisor"');
    expect(choices).toContain('aria-label="Carte de contact du conseiller"');
  });

  it('un bien « Sans photo » n’en a aucune, couverture comprise', () => {
    const page = html([item()], { i1: true });
    expect(page).not.toContain('https://photos.example/1.jpg');
  });
});

// Décision de Jean-Guy (24/10) : devant l'acquéreur, un bien de l'agence en mandat signé montre son
// prix de commercialisation ; un vendeur à relancer ne montre aucun prix, mais « Prix à confirmer
// avec le propriétaire » — sur le document imprimé comme sur le lien.
describe('le prix d’un bien de l’agence sur le dossier', () => {
  const render = (outcome: string) =>
    html([item({ source: 'project', price: agencyPriceForBuyer(outcome, 1_500_000) })]);

  it('vendeur à relancer : « Prix à confirmer avec le propriétaire », aucun montant', () => {
    const page = render('follow_up');
    expect(page).toContain(PRICE_TO_CONFIRM);
    expect(page.replace(/[  ]/g, ' ')).not.toContain('1 500 000');
  });

  it('mandat signé : le prix, en petit sous le budget', () => {
    const page = render('signed').replace(/[  ]/g, ' ');
    expect(page).toContain('Prix affiché : 1 500 000 €');
    expect(page).not.toContain(PRICE_TO_CONFIRM);
  });
});

describe('le code du dossier', () => {
  it('ne lit ni titre, ni adresse d’annonce, ni lien, ni vendeur, ni exclusivité, ni « estimation », ni « disponible »', () => {
    const root = join(process.cwd(), 'src');
    const files = [
      join(root, 'features', 'buyer-dossier', 'components', 'buyer-dossier-document.tsx'),
      join(root, 'features', 'buyer-dossier', 'components', 'dossier-phone-deck.tsx'),
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
