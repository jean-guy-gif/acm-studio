import { describe, expect, it } from 'vitest';

import {
  buildBuyerDeck,
  clampPitch,
  datedFact,
  deckCriteria,
  judgeForBuyer,
  leadSentence,
  proposedBuyerWords,
  proposedPitch,
} from '@/features/buyer-deck/services/buyer-deck';
import type { DeckItemInput, DeckMark } from '@/features/buyer-deck/types';
import { PRICE_TO_CONFIRM } from '@/features/buyer-presentation/services/agency-price';
import type { PresentedItemInput } from '@/features/buyer-presentation/types';
import type { BuyerInput } from '@/features/buyers/types';

const buyer: BuyerInput = {
  name: 'M. et Mme Rossi',
  phone: '06 00 00 00 00',
  email: 'rossi@example.org',
  purpose: 'primary',
  timeline: 'now',
  notes: 'NOTE-SECRETE du conseiller',
  propertyTypes: ['apartment'],
  cities: ['Antibes'],
  budgetIdeal: 400_000,
  budgetMax: 430_000,
  roomsMin: 3,
  bedroomsMin: 2,
  surfaceMin: 65,
  outdoor: true,
  parking: true,
  pool: null,
  floorMin: null,
  elevator: true,
  energyRatingMax: null,
  worksAccepted: null,
  mustHave: ['cities', 'rooms', 'outdoor'],
  dealBreakers: 'ELIMINATOIRE-SECRET',
};

const item = (over: Partial<DeckItemInput> = {}): DeckItemInput => ({
  itemId: 'i1',
  position: 1,
  source: 'listing',
  category: 'strong',
  label: 'Appartement · 3 pièces · 68 m² · Antibes',
  city: 'Antibes',
  district: null,
  price: 415_000,
  priceSeenOn: '2026-10-24',
  surfaceArea: 68,
  roomsCount: 3,
  bedroomsCount: 2,
  outdoor: ['terrace'],
  parking: ['garage'],
  energyRating: 'C',
  photos: ['https://p.example/1.jpg'],
  gaps: [],
  propertyType: 'Appartement',
  floor: 2,
  hasPool: null,
  hasElevator: true,
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

const plain = (value: unknown): string => JSON.stringify(value).replace(/[\u00a0\u202f]/g, ' ');
const mark = (over: Partial<PresentedItemInput>, criterion: Parameters<typeof judgeForBuyer>[0]) =>
  judgeForBuyer(criterion, buyer, item(over));

// Mission 122 — tout part de sa recherche : la grille de ses critères, bien par bien.
describe('la grille', () => {
  it('ses critères en lignes : les indispensables (★) d’abord, puis les préférences', () => {
    const rows = deckCriteria(buyer);
    expect(rows.map((row) => [row.criterion, row.mustHave])).toEqual([
      ['cities', true],
      ['rooms', true],
      ['outdoor', true],
      ['property_types', false],
      ['budget', false],
      ['bedrooms', false],
      ['surface', false],
      ['parking', false],
      ['elevator', false],
    ]);
    expect(plain(rows.map((row) => row.label))).toContain('Budget ≤ 430 000 €');
    expect(rows.map((row) => row.label)).toContain('3 pièces et plus');
  });

  it('✓ satisfait, avec son fait', () => {
    expect(mark({}, 'bedrooms')).toEqual({ mark: 'ok', text: '2 chambres, comme demandé' });
    expect(mark({}, 'cities')).toEqual({ mark: 'ok', text: 'À Antibes' });
    expect(plain(mark({}, 'budget'))).toContain('Dans votre budget : 15 000 € de marge');
  });

  it('≈ proche dans les marges de M86 (budget +5 %, surface 95 %), l’écart nommé', () => {
    const budget = mark({ price: 440_000 }, 'budget');
    expect(budget.mark).toBe('near');
    expect(plain(budget)).toContain('10 000 € au-dessus de votre budget, à négocier');
    expect(mark({ surfaceArea: 62 }, 'surface')).toMatchObject({ mark: 'near' });
    expect(plain(mark({ surfaceArea: 62 }, 'surface'))).toContain('62 m² au lieu de 65 m²');
  });

  it('✗ au-delà des marges, ou une préférence non satisfaite', () => {
    expect(mark({ price: 460_000 }, 'budget').mark).toBe('no');
    expect(mark({ surfaceArea: 55 }, 'surface').mark).toBe('no');
    expect(mark({ parking: ['none'] }, 'parking')).toEqual({ mark: 'no', text: 'Pas de parking' });
  });

  it('? à vérifier ensemble quand l’annonce ne dit rien', () => {
    expect(mark({ hasElevator: null }, 'elevator')).toEqual({
      mark: 'check',
      text: 'Ascenseur\u00a0: à vérifier à la visite',
    });
    expect(mark({ outdoor: [] }, 'outdoor').mark).toBe('check');
  });

  it('le budget est un critère, jamais un titre ; un vendeur à relancer : « Prix à confirmer » (24/10)', () => {
    expect(mark({ source: 'project', price: null }, 'budget')).toEqual({
      mark: 'check',
      text: PRICE_TO_CONFIRM,
    });
    const [only] = deck([item()]).items;
    expect(plain(only!.priceLine)).toBe('"Prix affiché : 415 000 € · affiché le 24/10/2026"');
    const [project] = deck([item({ source: 'project', price: null })]).items;
    expect(project!.priceLine).toBeNull();
  });

  it('un indispensable n’est ✗ qu’au cas restant : le bien est signalé, jamais recommandé', () => {
    const outside = deck([
      item({ itemId: 'a', position: 1, outdoor: ['none'] }),
      item({ itemId: 'b', position: 2, parking: ['none'] }),
    ]);
    expect(outside.items[0]!.blocked).toBe(true);
    // Le signalement ne nomme que l'indispensable en cause, pas les préférences ✗.
    expect(outside.items[0]!.blockedBy).toEqual(['Pas d’extérieur']);
    expect(outside.items[1]!.blocked).toBe(false);
    expect(outside.lead).toBe('Le bien B en coche le plus\u00a0: 8 sur 9.');
    // La lettre du bien de tête vient du service.
    expect(outside.leadLetter).toBe('B');
    // Une préférence ✗ n'est pas un blocage ; un indispensable « ? » non plus.
    expect(deck([item({ outdoor: [] })]).items[0]!.blocked).toBe(false);
  });
});

describe('la phrase de tête', () => {
  const marks = (ok: number, total: number): DeckMark[] =>
    Array.from({ length: total }, (_, index) => ({
      criterion: 'rooms',
      mark: index < ok ? 'ok' : 'check',
      text: '',
    }));
  const entry = (letter: string, ok: number, total: number, blocked = false) => ({
    ...deck([item()]).items[0]!,
    letter,
    okCount: ok,
    total,
    marks: marks(ok, total),
    blocked,
  });

  it('tous les critères : « c’est par lui que je vous propose de commencer »', () => {
    expect(leadSentence([entry('A', 6, 7), entry('B', 7, 7)])).toBe(
      'Le bien B coche tous vos critères\u00a0: c’est par lui que je vous propose de commencer.',
    );
  });

  // Essai de Jean-Guy (25/10) : plusieurs biens cochent tout, la phrase les nomme tous.
  it('plusieurs biens cochent tout : « Les biens A et B cochent tous vos critères »', () => {
    expect(leadSentence([entry('A', 7, 7), entry('B', 7, 7), entry('C', 6, 7)])).toBe(
      'Les biens A et B cochent tous vos critères.',
    );
    expect(leadSentence([entry('A', 7, 7), entry('B', 7, 7), entry('C', 7, 7)])).toBe(
      'Les biens A, B et C cochent tous vos critères.',
    );
    // Un bien bloqué n'y est jamais nommé.
    expect(leadSentence([entry('A', 7, 7, true), entry('B', 7, 7), entry('C', 7, 7)])).toBe(
      'Les biens B et C cochent tous vos critères.',
    );
  });

  it('sinon le plus de ✓ ; à égalité, l’ordre de la sélection', () => {
    expect(leadSentence([entry('A', 6, 7), entry('B', 6, 7)])).toBe(
      'Le bien A en coche le plus\u00a0: 6 sur 7.',
    );
  });

  it('aucun bien ne coche rien : pas de phrase', () => {
    expect(leadSentence([entry('A', 0, 7), entry('B', 0, 7)])).toBeNull();
  });

  it('jamais un bien bloqué ; aucun bien recommandable : pas de phrase', () => {
    expect(leadSentence([entry('A', 7, 7, true), entry('B', 5, 7)])).toBe(
      'Le bien B en coche le plus\u00a0: 5 sur 7.',
    );
    expect(leadSentence([entry('A', 7, 7, true)])).toBeNull();
  });
});

describe('« Pourquoi je vous le propose »', () => {
  // Essai de Jean-Guy (25/10) : la surface, puis deux extérieurs ou équipements satisfaits au plus
  // (piscine, jardin, terrasse, garage), puis la commune, puis la marge de budget ; jamais « Il
  // coche vos N critères », jamais un doute en tête.
  const spaced = (text: string | null) => (text ?? '').replace(/[\u00a0\u202f]/g, ' ');
  it('la surface, les équipements, la commune, la marge de budget', () => {
    const full = deck([item()]).items[0]!;
    expect(spaced(full.pitch)).toBe(
      '68 m², terrasse et garage à Antibes, 15 000 € sous votre budget.',
    );
    expect(full.pitch).not.toMatch(/Il coche/);
    // La surface en dessous du minimum (≈) n'est pas un fait satisfait : elle n'y est pas.
    const partial = deck([item({ surfaceArea: 62, hasElevator: null })]).items[0]!;
    expect(spaced(partial.pitch)).toBe('Terrasse et garage à Antibes, 15 000 € sous votre budget.');
  });

  it('une villa : « 210 m², piscine et jardin à Mougins… » ; un doute jamais en tête', () => {
    const villaBuyer = {
      ...buyer,
      propertyTypes: ['house'],
      cities: ['Mougins'],
      surfaceMin: 180,
      pool: true,
      mustHave: ['pool', 'cities'],
    } as BuyerInput;
    const villa = (over: Partial<DeckItemInput>) =>
      buildBuyerDeck({
        buyerId: 'b',
        buyer: villaBuyer,
        selectionId: 's',
        selectedAt: '2026-10-24T10:00:00Z',
        presentedAt: null,
        buyerWords: null,
        items: [
          item({
            propertyType: 'Maison',
            city: 'Mougins',
            surfaceArea: 210,
            outdoor: ['terrace', 'garden'],
            hasPool: true,
            ...over,
          }),
        ],
        now: new Date('2026-10-25T10:00:00Z'),
      }).items[0]!;
    expect(spaced(villa({}).pitch)).toBe(
      '210 m², piscine et jardin à Mougins, 15 000 € sous votre budget.',
    );
    // La piscine non indiquée : elle n'est pas dans la phrase, et reste « ? » dans la liste.
    const unknownPool = villa({ hasPool: null });
    expect(spaced(unknownPool.pitch)).toBe(
      '210 m², jardin et terrasse à Mougins, 15 000 € sous votre budget.',
    );
    expect(unknownPool.marks.find((mark) => mark.criterion === 'pool')?.mark).toBe('check');
    // Au-dessus du budget : pas de marge, rien n'est dit du prix.
    expect(spaced(villa({ price: 440_000 }).pitch)).toBe('210 m², piscine et jardin à Mougins.');
  });

  it('aucun de ces faits : combien il en coche, et ce qui est à voir ensemble', () => {
    const bare = deck([
      item({
        surfaceArea: 62,
        outdoor: [],
        parking: [],
        city: null,
        price: null,
        hasElevator: null,
      }),
    ]).items[0]!;
    expect(bare.pitch).toMatch(/^Il coche \d+ critères? sur \d+\s: .* à voir ensemble\.$/);
  });

  it('140 caractères au plus, coupée à un mot', () => {
    const long = 'mot '.repeat(60);
    const clamped = clampPitch(long);
    expect(clamped.length).toBeLessThanOrEqual(140);
    expect(clamped.endsWith('…')).toBe(true);
    expect(clamped).not.toMatch(/mo…$/);
    expect(proposedPitch([])).toBeNull();
  });

  it('la phrase du conseiller l’emporte, la proposée reste à côté', () => {
    const [entry] = deck([item({ pitch: 'Le calme, à 5 minutes du marché.' })]).items;
    expect(entry!.pitch).toBe('Le calme, à 5 minutes du marché.');
    expect(entry!.pitchProposed).toMatch(/sous votre budget\.$/);
  });
});

// Essai de Jean-Guy (26/10) : le budget de l'acquéreur est vert dans son budget, orange au-dessus
// (« à négocier » jusqu'à +5 %), jamais rouge ; les autres critères n'ont pas de couleur à part.
describe('le budget en couleur', () => {
  const toneAt = (price: number | null) =>
    deck([item({ price })]).items[0]!.marks.find((mark) => mark.criterion === 'budget')?.tone;
  it('vert dans le budget, orange au-dessus, jamais rouge', () => {
    expect(toneAt(415_000)).toBe('green');
    expect(toneAt(430_000)).toBe('green');
    expect(toneAt(430_001)).toBe('orange');
    expect(toneAt(451_500)).toBe('orange');
    expect(toneAt(600_000)).toBe('orange');
    expect(toneAt(null)).toBeNull();
  });
  it('seul le budget porte une couleur', () => {
    const marks = deck([item()]).items[0]!.marks;
    for (const mark of marks.filter((entry) => entry.criterion !== 'budget')) {
      expect(mark.tone ?? null).toBeNull();
    }
  });
});

describe('ses mots et le fait daté', () => {
  it('« Vous m’avez dit » : type, pièces, communes, indispensables, budget plafond', () => {
    expect(plain(proposedBuyerWords(buyer))).toBe(
      '"Un 3 pièces à Antibes, avec un extérieur, jusqu’à 430 000 €."',
    );
    expect(deck([item()], 'Un 3 pièces au calme.').words).toBe('Un 3 pièces au calme.');
    expect(plain(deck([item()]).words)).toContain('Un 3 pièces à Antibes');
  });

  it('en vente depuis N jours, baisse de prix datée ; sinon rien', () => {
    const now = new Date('2026-10-25T10:00:00Z');
    expect(datedFact(item({ listedSince: '2026-10-16' }), now)).toBe('En vente depuis 9 jours');
    expect(
      plain(datedFact(item({ priceDrop: { amount: 10_000, at: '2026-10-17' } }), now)),
    ).toContain('Baisse de prix de 10 000 € il y a 8 jours');
    expect(datedFact(item(), now)).toBeNull();
  });
});

describe('jamais côté acquéreur', () => {
  it('ni notes, ni critères éliminatoires, ni coordonnées de la fiche, ni rien hors liste', () => {
    const trap = {
      ...item(),
      title: 'EXCLUSIVITÉ Agence Dupont 12 rue des Lilas',
      listingUrl: 'https://www.seloger.com/annonces/piege.htm',
      address: '12 rue des Lilas',
      soldBy: 'agency',
      exclusivity: 'yes',
    } as unknown as DeckItemInput;
    const payload = JSON.stringify(deck([trap]));
    for (const leak of [
      'NOTE-SECRETE',
      'ELIMINATOIRE-SECRET',
      'rossi@example.org',
      '06 00 00 00 00',
      'EXCLUSIVITÉ Agence Dupont',
      'rue des Lilas',
      'piege.htm',
      'soldBy',
      'exclusivity',
      'estimation',
      'disponible',
    ]) {
      expect(payload).not.toContain(leak);
    }
  });
});
