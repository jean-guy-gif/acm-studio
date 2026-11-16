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
    answered: false,
    answers: [],
    availability: [],
    meetingAnswers: [],
    meetingAvailability: [],
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

  it('une liste d’autorisation : un champ glissé dans le déroulé, le bien ou une marque n’en sort pas', () => {
    const base = deck([item()], 'Sa phrase.');
    const spiked = {
      ...base,
      notes: 'NOTE-SECRETE',
      items: base.items.map((entry) => ({
        ...entry,
        advisorComment: 'COMMENTAIRE-CONSEILLER',
        item: {
          ...entry.item,
          title: 'EXCLUSIVITÉ Agence Dupont',
          listingUrl: 'https://x/piege.htm',
        },
        marks: entry.marks.map((mark) => ({ ...mark, internal: 'MARQUE-INTERNE' })),
      })),
    } as unknown as typeof base;
    const shown = JSON.stringify(publicDeck(spiked, new Map()));
    for (const leak of [
      'NOTE-SECRETE',
      'COMMENTAIRE-CONSEILLER',
      'Agence Dupont',
      'piege.htm',
      'MARQUE-INTERNE',
    ]) {
      expect(shown).not.toContain(leak);
    }
    expect(publicDeck(spiked, new Map()).items[0]!.marks).toEqual(base.items[0]!.marks);
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

  // Essai de Jean-Guy (25/10).
  it('couverture : le conseiller y figure ; A « Sans photo », la première photo d’un autre bien', () => {
    const page = html(
      [item(), item({ itemId: 'i2', position: 2, photos: ['https://photos.example/b.jpg'] })],
      { i1: true },
    );
    const cover = page.slice(
      page.indexOf('data-testid="dossier-cover"'),
      page.indexOf('data-testid="dossier-grid"'),
    );
    expect(cover).toContain('https://photos.example/b.jpg');
    expect(cover).toContain('data-testid="dossier-cover-advisor"');
    expect(cover).toContain('Votre conseiller : Carl Conseiller · 06 11 22 33 44');
  });

  it('chaque bien commence une page et ne se coupe pas, photos comprises', () => {
    const page = html([item(), item({ itemId: 'i2', position: 2 })]);
    const sections = page.match(/<section class="[^"]*" data-testid="dossier-item"/g) ?? [];
    expect(sections).toHaveLength(2);
    for (const section of sections) {
      expect(section).toContain('break-before-page');
      expect(section).toContain('break-inside-avoid');
    }
    expect(page).toMatch(/class="[^"]*break-inside-avoid[^"]*" data-testid="dossier-photos"/);
    expect(page).toMatch(/class="[^"]*break-before-page[^"]*" data-testid="dossier-choices"/);
  });

  it('l’étoile des indispensables, dessinée, dans la grille et la légende', () => {
    const page = html([item()]);
    const grid = page.slice(
      page.indexOf('data-testid="dossier-grid"'),
      page.indexOf('data-testid="dossier-item"'),
    );
    const mustRows = deck([item()]).criteria.filter((row) => row.mustHave).length;
    // Une étoile par ligne indispensable, plus celle de la légende.
    expect(count(grid, 'data-testid="must-star"')).toBe(mustRows + 1);
    expect(grid).toContain('aria-label="indispensable"');
    expect(grid).toContain('data-testid="grid-legend"');
  });

  it('le budget en couleur, dans la grille et sur la ligne du bien', () => {
    // Plafond de 1 650 000 € : dans le budget, vert ; au-dessus, orange ; jamais rouge (26/10).
    const within = html([item({ price: 1_600_000 })]);
    expect(count(within, 'data-tone="green"')).toBe(2);
    const over = html([item({ price: 1_900_000 })]);
    expect(count(over, 'data-tone="orange"')).toBe(2);
    expect(over).not.toContain('data-tone="red"');
  });

  it('la grille : une miniature de chaque bien en tête de sa colonne, et sa lettre', () => {
    const page = html([
      item(),
      item({ itemId: 'i2', position: 2, photos: ['https://photos.example/b.jpg'] }),
    ]);
    const grid = page.slice(
      page.indexOf('data-testid="dossier-grid"'),
      page.indexOf('data-testid="dossier-item"'),
    );
    expect(count(grid, 'data-testid="dossier-grid-thumb"')).toBe(2);
    expect(grid).toContain('https://photos.example/b.jpg');
  });

  it('la couverture : la photo posée en bas, son haut rogné, le dégradé sombre en bas seulement', () => {
    const page = html([item()]);
    expect(page).toMatch(
      /class="[^"]*h-\[135%\][^"]*object-bottom[^"]*" data-testid="dossier-cover-photo"/,
    );
    const cover = page.slice(
      page.indexOf('data-testid="dossier-cover"'),
      page.indexOf('data-testid="dossier-grid"'),
    );
    expect(cover).not.toContain('via-');
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
      join(root, 'features', 'buyer-dossier', 'components', 'dossier-public-view.tsx'),
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

// Mission 147 (partie A) — le lien client « Vivre ici » d'Academia, collé sur le mandat : par liste
// d'autorisation, un bien du déroulé et un lien d'Academia relu, rien d'autre ; jamais dans le PDF.
describe('le lien « Vivre ici » d’Academia', () => {
  const withLinks = (links: { itemId: string; url: string }[]) =>
    buildBuyerDossier({
      buyerId: 'b',
      selectionId: 's',
      selectedAt: '2026-10-24T10:00:00Z',
      sector: 'Mougins',
      deck: deck([item({ itemId: 'i1', source: 'project' })]),
      hidden: new Map(),
      answered: false,
      answers: [],
      availability: [],
      meetingAnswers: [],
      meetingAvailability: [],
      agency,
      brandDeclarations: '',
      academiaLinks: links,
    });

  it('un bien du déroulé, un lien d’Academia : il passe', () => {
    expect(
      withLinks([{ itemId: 'i1', url: 'https://app.myacademia.ai/l/v3k9-2mq7.8f2c1a9e4b7d' }])
        .academiaLinks,
    ).toEqual([{ itemId: 'i1', url: 'https://app.myacademia.ai/l/v3k9-2mq7.8f2c1a9e4b7d' }]);
  });

  it('un autre site, ou un bien hors du déroulé, ne passe pas', () => {
    expect(
      withLinks([
        { itemId: 'i1', url: 'https://evil.test/l/x' },
        { itemId: 'i1', url: 'https://app.myacademia.ai/l/x?adresse=12 rue des Lilas' },
        { itemId: 'autre', url: 'https://app.myacademia.ai/l/abc' },
      ]).academiaLinks,
    ).toEqual([]);
  });

  it('le titre piège (M107) et une adresse glissés dans l’entrée n’en sortent pas', () => {
    const spiked = {
      itemId: 'i1',
      url: 'https://app.myacademia.ai/l/abc',
      title: 'EXCLUSIVITÉ Agence Dupont 12 rue des Lilas',
      address: '12 rue des Lilas, 06250 Mougins',
    } as { itemId: string; url: string };
    const dossier = withLinks([spiked]);
    expect(dossier.academiaLinks).toEqual([
      { itemId: 'i1', url: 'https://app.myacademia.ai/l/abc' },
    ]);
    const payload = JSON.stringify(dossier);
    expect(payload).not.toContain('Agence Dupont');
    expect(payload).not.toContain('rue des Lilas');
  });

  it('le PDF du dossier ne le montre pas', () => {
    const dossier = withLinks([{ itemId: 'i1', url: 'https://app.myacademia.ai/l/abc' }]);
    const pdf = renderToStaticMarkup(createElement(BuyerDossierDocument, { dossier }));
    expect(pdf).not.toContain('myacademia');
  });
});

// Mission 156 — l'exception assumée à M119 (Jean-Guy, 15/11) : le lien « Vivre ici » d'un bien HORS
// MANDAT de sa sélection part aussi vers l'acquéreur. ACM, lui, n'envoie toujours ni adresse ni
// rue : seul un lien d'Academia relu, sous un bien de sa sélection ; jamais la clé du bien, qui peut
// contenir l'adresse de l'annonce.
describe('le lien « Vivre ici » d’un bien hors mandat', () => {
  const outside = (links: { itemId: string; url: string }[]) =>
    buildBuyerDossier({
      buyerId: 'b',
      selectionId: 's',
      selectedAt: '2026-10-24T10:00:00Z',
      sector: 'Mougins',
      deck: deck([
        item({ itemId: 'i1', source: 'project' }),
        item({ itemId: 'i2', source: 'listing' }),
        item({ itemId: 'i3', source: 'competitor' }),
      ]),
      hidden: new Map(),
      answered: false,
      answers: [],
      availability: [],
      meetingAnswers: [],
      meetingAvailability: [],
      agency,
      brandDeclarations: '',
      academiaLinks: links,
    });

  it('une annonce du marché et un concurrent : leur lien d’Academia passe, sous leur bien', () => {
    expect(
      outside([
        { itemId: 'i2', url: 'https://app.myacademia.ai/l/b2' },
        { itemId: 'i3', url: 'https://app.myacademia.ai/l/c3' },
      ]).academiaLinks,
    ).toEqual([
      { itemId: 'i2', url: 'https://app.myacademia.ai/l/b2' },
      { itemId: 'i3', url: 'https://app.myacademia.ai/l/c3' },
    ]);
  });

  it('ni la clé du bien, ni l’adresse ou la rue de l’annonce, ni le titre piège (M107) n’en sortent', () => {
    const spiked = {
      itemId: 'i2',
      url: 'https://app.myacademia.ai/l/b2',
      propertyKey: 'listing:https://annonces.exemple.fr/12-rue-des-lilas',
      listingUrl: 'https://www.seloger.com/annonces/achat/maison/mougins-06/123456789.htm',
      title: 'EXCLUSIVITÉ Agence Dupont 12 rue des Lilas',
      address: '12 rue des Lilas, 06250 Mougins',
      street: 'rue des Lilas',
    } as { itemId: string; url: string };
    const dossier = outside([spiked]);
    expect(dossier.academiaLinks).toEqual([
      { itemId: 'i2', url: 'https://app.myacademia.ai/l/b2' },
    ]);
    const payload = JSON.stringify(dossier);
    for (const forbidden of [
      'listing:',
      'seloger',
      'annonces.exemple',
      'rue des Lilas',
      'Dupont',
    ]) {
      expect(payload).not.toContain(forbidden);
    }
  });

  it('un lien qui n’est pas d’Academia, ou glissé sous un bien hors de sa sélection, ne passe pas', () => {
    expect(
      outside([
        { itemId: 'i2', url: 'https://maps.example.com/12-rue-des-lilas' },
        { itemId: 'ailleurs', url: 'https://app.myacademia.ai/l/abc' },
      ]).academiaLinks,
    ).toEqual([]);
  });

  it('la page de l’acquéreur ne lit jamais la clé ni l’adresse d’une annonce', () => {
    const query = readFileSync(
      join(process.cwd(), 'src', 'features', 'buyer-dossier', 'queries', 'load-buyer-dossier.ts'),
      'utf8',
    );
    expect(query).not.toContain('property_key');
    expect(query).not.toContain('dismissalKey');
    // L'interrupteur est relu au serveur sur ce chemin vers l'acquéreur.
    expect(query).toContain('livingHereEverywhereOpen()');
  });
});
