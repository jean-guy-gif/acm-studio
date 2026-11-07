import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { GridScreen, ItemScreen } from '@/features/buyer-deck/components/deck-presentation';
import { buildBuyerDeck } from '@/features/buyer-deck/services/buyer-deck';
import { allowedDeck } from '@/features/buyer-deck/services/frozen-deck';
import { publicDeck } from '@/features/buyer-dossier/services/build-buyer-dossier';
import {
  finishConfirmation,
  sendConfirmation,
} from '@/features/buyer-deck/services/deck-navigation';
import type { DeckItemInput } from '@/features/buyer-deck/types';
import { dossierShareMessage } from '@/features/buyer-dossier/services/dossier-share';
import { relaunchMessage } from '@/features/buyers/services/link-relaunch';
import { proposalMessage, propertyPhrase } from '@/features/buyers/services/loop-properties';
import type { BuyerLoopProperty } from '@/features/buyers/services/property-buyers';
import type { BuyerInput } from '@/features/buyers/types';
import { offerAnswerBuyerMessage } from '@/features/purchase-offer/services/offer-answer';
import type { TextLanguage } from '@/lib/client-texts';
import { frenchLeaks } from '@/test-fixtures/french-leaks';

// Mission 140 B — l'acquéreur dans sa langue : ses messages, la présentation, le lien et le PDF
// lisent leurs mots dans les textes du client. En anglais, rien ne reste du français (hors noms
// propres) ; sans langue, le français d'avant.

const buyer: BuyerInput = {
  name: 'Mr and Mrs Wilson',
  phone: null,
  email: null,
  purpose: 'primary',
  timeline: 'now',
  notes: null,
  propertyTypes: ['house'],
  cities: ['Vence'],
  budgetIdeal: 750_000,
  budgetMax: 800_000,
  roomsMin: 5,
  bedroomsMin: 3,
  surfaceMin: 140,
  outdoor: true,
  parking: true,
  pool: true,
  floorMin: null,
  elevator: null,
  energyRatingMax: 'D',
  worksAccepted: false,
  mustHave: ['cities', 'pool'],
  dealBreakers: null,
};

const item = (over: Partial<DeckItemInput> = {}): DeckItemInput => ({
  itemId: 'i1',
  position: 1,
  source: 'listing',
  category: 'strong',
  label: 'Maison · 5 pièces · 140 m² · Vence',
  city: 'Vence',
  district: null,
  price: 779_000,
  priceSeenOn: '2026-11-02',
  surfaceArea: 140,
  roomsCount: 5,
  bedroomsCount: 3,
  outdoor: ['garden'],
  parking: ['garage'],
  energyRating: 'C',
  photos: [],
  gaps: [],
  propertyType: 'house',
  floor: null,
  hasPool: true,
  hasElevator: null,
  condition: 'good',
  listedSince: '2026-10-28',
  priceDrop: { amount: 20_000, at: '2026-11-03' },
  pitch: null,
  ...over,
});

const deck = (language?: TextLanguage) =>
  buildBuyerDeck({
    buyerId: 'b',
    buyer,
    selectionId: 's',
    selectedAt: '2026-11-02T10:00:00Z',
    presentedAt: null,
    buyerWords: null,
    items: [item(), item({ itemId: 'i2', position: 2, hasPool: false, price: 820_000 })],
    now: new Date('2026-11-06T10:00:00Z'),
    language,
  });

const property: BuyerLoopProperty = {
  propertyType: 'house',
  roomsCount: 5,
  surfaceArea: 140,
  city: 'Vence',
  bedroomsCount: 3,
  floor: null,
  hasElevator: null,
  hasPool: true,
  outdoorSpaces: ['garden'],
  parkingTypes: ['garage'],
  energyRating: 'C',
  generalCondition: 'good',
};

const PROPER = ['Mr and Mrs Wilson', 'Vence', 'Camille'];

describe('l’acquéreur dans sa langue', () => {
  it('le déroulé en anglais : ses mots, la grille, chaque bien, la phrase de tête', () => {
    const english = deck('en');
    expect(english.language).toBe('en');
    expect(english.words).toBe('A house with 5 rooms in Vence, with a pool, up to €800,000.');
    expect(english.items[0]!.item.label.replace(/\u00a0/g, ' ')).toBe(
      'House · 5 rooms · 140 m² · Vence',
    );
    expect(english.items[0]!.priceLine).toBe('Asking price: €779,000 · price as of 02/11/2026');
    expect(english.items[0]!.datedFact).toBe(
      'On the market for 9 days · Price reduced by €20,000 3 days ago',
    );
    // Les textes du déroulé, sans ses clés techniques (« surface » est un critère, pas un mot).
    const texts = [
      english.words,
      english.lead ?? '',
      ...english.criteria.map((row) => row.label),
      ...english.items.flatMap((entry) => [
        entry.item.label,
        entry.priceLine ?? '',
        entry.pitch ?? '',
        entry.datedFact ?? '',
        ...entry.marks.map((mark) => mark.text),
      ]),
    ].join('\n');
    expect(frenchLeaks(texts, PROPER)).toEqual([]);
  });

  it('sans langue, le déroulé français d’avant', () => {
    const french = deck();
    expect(french.words).toBe(
      'Une maison de 5 pièces à Vence, avec une piscine, jusqu’à 800 000 €.',
    );
    expect(french.items[0]!.item.label).toBe('Maison · 5 pièces · 140 m² · Vence');
  });

  it('la grille et un bien, rendus en anglais', () => {
    const english = deck('en');
    const grid = renderToStaticMarkup(
      createElement(GridScreen, {
        deck: english,
        responses: [],
        onOpen: () => undefined,
        onLead: () => undefined,
        leadLetter: english.leadLetter,
        language: 'en',
      }),
    );
    const screen = renderToStaticMarkup(
      createElement(ItemScreen, {
        item: english.items[0]!,
        answer: 'no',
        readOnly: false,
        busy: false,
        onAnswer: () => undefined,
        reasons: [],
        onReason: () => undefined,
        language: 'en',
      }),
    );
    expect(grid).toContain('Your criteria');
    expect(screen).toContain('I’d like to view it');
    expect(screen).toContain('The neighbourhood');
    expect(frenchLeaks(grid + screen, PROPER)).toEqual([]);
  });

  it('un déroulé figé garde sa langue ; figé avant la mission (sans langue), il se lit en français', () => {
    expect(allowedDeck(deck('en')).language).toBe('en');
    expect(publicDeck(allowedDeck(deck('en')), new Map()).language).toBe('en');
    const { language: _dropped, ...before } = deck();
    void _dropped;
    expect(allowedDeck(before).language).toBe('fr');
    expect(publicDeck(allowedDeck(before), new Map()).language).toBe('fr');
    // Une valeur inattendue relue de la base vaut le français.
    expect(allowedDeck({ ...before, language: 'xx' as never }).language).toBe('fr');
  });

  it('les confirmations, en anglais', () => {
    expect(finishConfirmation(['A', 'B'], 'en')).toBe(
      '2 properties without an answer: A and B. Finish anyway?',
    );
    expect(sendConfirmation(['C'], 'en')).toBe('1 property without an answer: C. Send anyway?');
    expect(finishConfirmation(['A', 'B'])).toBe(
      '2 biens sans réponse : A et B. Terminer quand même ?',
    );
  });

  it('ses messages en anglais : proposition, relance, lien, réponse à son offre', () => {
    const messages = [
      proposalMessage({
        buyer: { ...buyer, budgetMax: 800_000 },
        item: { property, price: 779_000, origin: 'mandate' },
        url: 'https://x.test/d',
        advisorFirstName: 'Camille',
        language: 'en',
      }),
      relaunchMessage({
        buyer,
        bien: { property },
        fits: true,
        sentOn: '2026-11-04',
        url: 'https://x.test/d',
        advisorFirstName: 'Camille',
        language: 'en',
      }),
      dossierShareMessage('https://x.test/d', 'Camille', 'en'),
      offerAnswerBuyerMessage({
        decision: 'accepted',
        buyerName: buyer.name,
        property: propertyPhrase(property, 'en'),
        decidedAt: '2026-11-06T10:00:00Z',
        url: 'https://x.test/o',
        advisorFirstName: 'Camille',
        language: 'en',
      }),
    ];
    expect(messages[0]).toContain(
      'I have a property for you: a house in Vence with the pool you wanted, outdoor space, parking, €21,000 below your budget.',
    );
    expect(messages[1]).toContain(
      'The house in Vence with the pool you wanted, outdoor space, parking ticks what you are looking for',
    );
    expect(messages[3]).toContain('the seller accepted your purchase offer for the house in Vence');
    // Les dates en toutes lettres : « 4 November », jamais « 04/11 » qu'un lecteur américain lirait le 11 avril.
    expect(messages[1]).toContain('the selection I sent on 4 November?');
    expect(messages[3]).toContain('on 6 November.');
    for (const message of messages) {
      expect(frenchLeaks(message, PROPER)).toEqual([]);
      expect(message).not.toMatch(/\bavailab/i);
    }
  });

  it('ses messages en français ne changent pas', () => {
    expect(propertyPhrase(property)).toBe('la maison de Vence');
    expect(dossierShareMessage('https://x.test/d', null)).toBe(
      'Bonjour, voici les biens que j’ai sélectionnés pour vous : https://x.test/d\nDites-moi lesquels vous voulez visiter.',
    );
  });
});
