import { describe, expect, it } from 'vitest';

import type { CompetitorCandidate } from '@/features/competitor-search/types';
import type { CategorizedCandidate } from '@/features/ideal-properties/services/categorize-ideal';
import {
  agencyDeckCard,
  deckEndKicker,
  deckSelectionNote,
  marketDeckCard,
} from '@/features/ideal-properties/services/deck-cards';
import type { BuyerHit } from '@/features/meeting-conclusion/services/buyer-reconciliation';

// La refonte, lot C — ce que dit la carte d'un bien, « un bien à la fois ».

const candidate = (over: Partial<CompetitorCandidate> = {}): CompetitorCandidate =>
  ({
    key: 'k',
    url: 'https://annonces.demonstration.invalid/mou-14',
    title: 'EXCLUSIVITÉ Agence Dupont 12 rue des Lilas',
    price: 1_590_000,
    surfaceArea: 200,
    roomsCount: 8,
    propertyType: 'house',
    city: 'Mougins',
    photoUrls: ['https://photos.example.com/1.jpg', 'https://photos.example.com/2.jpg'],
    ...over,
  }) as CompetitorCandidate;

const entry = (over: Partial<CategorizedCandidate> = {}): CategorizedCandidate => ({
  candidate: candidate(),
  category: 'strong',
  gaps: [],
  toCheck: [],
  toVerify: [],
  percent: 92,
  criteriaOk: 8,
  criteriaTotal: 8,
  why: [
    { tone: 'plain', label: 'Mougins' },
    { tone: 'must', label: 'Piscine' },
  ],
  ...over,
});

const hit = (over: Partial<BuyerHit> = {}): BuyerHit => ({
  candidate: {
    key: 'project:p-valbonne',
    group: 'mandate',
    title: 'M. et Mme Castel',
    propertyType: 'Maison',
    roomsCount: 6,
    surfaceArea: 210,
    city: ' Valbonne ',
    price: 1_480_000,
    projectId: 'p-valbonne',
    sellerName: 'M. et Mme Castel',
    sellerPhone: null,
    step: null,
    listingUrl: null,
  },
  score: 80,
  gaps: [],
  note: null,
  condominiumNote: null,
  ...over,
});

describe('la carte d’une annonce du marché', () => {
  const card = marketDeckCard({
    key: 'listing:https://annonces.demonstration.invalid/mou-14',
    label: 'Maison · 8 pièces · 200 m² · Mougins',
    entry: entry(),
    origin: 'affiché le 24/11/2026',
    budgetMax: 1_700_000,
    reasons: { mentions: ['au calme'] },
  });

  it('« 8 critères sur 8 », la pastille du budget, sa première photo, jamais un pourcentage', () => {
    expect(card.criteria).toEqual({ label: '8 critères sur 8', allMet: true });
    expect(card.budget?.tone).toBe('good');
    expect(card.budget?.label).toContain('sous le budget');
    expect(card.photo).toBe('https://photos.example.com/1.jpg');
    expect(card.origin).toBe('affiché le 24/11/2026');
    expect(card.listing).toBe(true);
    expect(JSON.stringify(card)).not.toContain('%');
    expect(JSON.stringify(card)).not.toContain('92');
  });

  it('« Pourquoi celui-ci pour eux » : l’indispensable, ce que dit l’annonce, puis le reste', () => {
    expect(card.why).toEqual([
      { tone: 'must', label: 'Piscine' },
      { tone: 'said', label: '«\u00a0au calme\u00a0» dans l’annonce' },
      { tone: 'plain', label: 'Mougins' },
    ]);
  });

  it('jamais le titre de l’annonce ni son adresse : le libellé neutre', () => {
    const text = JSON.stringify(card);
    expect(text).not.toContain('EXCLUSIVITÉ');
    expect(text).not.toContain('Dupont');
    expect(text).not.toContain('rue des Lilas');
    expect(card.label).toBe('Maison · 8 pièces · 200 m² · Mougins');
  });

  it('les écarts et ce qui reste à vérifier ne sont jamais cachés ; l’écart au budget n’est dit qu’une fois', () => {
    const over = marketDeckCard({
      key: 'k',
      label: 'Maison · 8 pièces · 200 m² · Mougins',
      entry: entry({
        candidate: candidate({ price: 1_720_000 }),
        category: 'compromise',
        criteriaOk: 6,
        gaps: ['20 000 € au-dessus du budget, à négocier', 'Pas de piscine'],
        toVerify: ['Ascenseur'],
      }),
      origin: null,
      budgetMax: 1_700_000,
      reasons: undefined,
    });
    expect(over.criteria).toEqual({ label: '6 critères sur 8', allMet: false });
    expect(over.budget?.tone).toBe('watch');
    expect(over.notes).toContain('Pas de piscine');
    expect(over.notes.some((note) => note.includes('Ascenseur'))).toBe(true);
    expect(over.notes).not.toContain(over.budget?.label);
  });

  it('une fiche sans critère renseigné, un bien sans prix ni photo : rien d’inventé', () => {
    const bare = marketDeckCard({
      key: 'k',
      label: 'Maison · Mougins',
      entry: entry({
        candidate: candidate({ price: null, photoUrls: [] }),
        criteriaOk: 0,
        criteriaTotal: 0,
        why: [],
      }),
      origin: null,
      budgetMax: 1_700_000,
      reasons: undefined,
    });
    expect(bare.criteria).toBeNull();
    expect(bare.budget).toBeNull();
    expect(bare.photo).toBeNull();
    expect(bare.price).toBeNull();
    expect(bare.why).toEqual([]);
    expect(bare.notes).toEqual([]);
  });
});

describe('la carte d’un bien de l’agence', () => {
  it('sa commune, son vendeur, ses écarts ; sa photo et ses critères se lisent sur sa fiche', () => {
    const card = agencyDeckCard({
      key: 'project:p-valbonne',
      label: 'Maison · 6 pièces · 210 m² · Valbonne',
      hit: hit({ condominiumNote: 'Copropriété\u00a0: à vérifier' }),
      sourceLabel: 'Dans l’agence',
      budgetMax: 1_500_000,
      reasons: { mentions: ['une vue'] },
    });
    expect(card.origin).toBe('Dans l’agence · Pour\u00a0: M. et Mme Castel');
    expect(card.photo).toBeNull();
    expect(card.criteria).toBeNull();
    expect(card.listing).toBe(false);
    expect(card.why).toEqual([
      { tone: 'said', label: '«\u00a0une vue\u00a0» dans l’annonce' },
      { tone: 'plain', label: 'Valbonne' },
    ]);
    expect(card.notes).toEqual(['Copropriété\u00a0: à vérifier']);
    expect(card.budget?.tone).toBe('good');
  });

  it('la marge de négociation n’est dite qu’une fois, par la pastille du budget', () => {
    const card = agencyDeckCard({
      key: 'k',
      label: 'Maison · Valbonne',
      hit: hit(),
      sourceLabel: 'Dans l’agence',
      budgetMax: 1_450_000,
      reasons: undefined,
    });
    expect(card.budget?.tone).toBe('watch');
    const again = agencyDeckCard({
      key: 'k',
      label: 'Maison · Valbonne',
      hit: hit({ note: card.budget!.label }),
      sourceLabel: 'Dans l’agence',
      budgetMax: 1_450_000,
      reasons: undefined,
    });
    expect(again.notes).toEqual([]);
  });
});

// Relecture du lot C (bloquant) — des biens proposés, pas encore enregistrés : l'écran le dit, avec
// « Retenir la sélection », dès le premier bien proposé.
describe('la ligne au-dessus des deux gestes', () => {
  it('rien à dire tant que la sélection est celle qui est enregistrée, et qu’il reste de la place', () => {
    expect(deckSelectionNote({ count: 0, changed: false })).toBeNull();
    expect(deckSelectionNote({ count: 2, changed: false })).toBeNull();
  });

  it('des biens proposés, pas encore enregistrés : « Retenir la sélection » est offert', () => {
    expect(deckSelectionNote({ count: 1, changed: true })).toEqual({
      text: '1 bien dans la sélection, pas encore enregistrée.',
      retain: true,
    });
    expect(deckSelectionNote({ count: 2, changed: true })).toEqual({
      text: '2 biens dans la sélection, pas encore enregistrée.',
      retain: true,
    });
    expect(deckSelectionNote({ count: 3, changed: true })).toEqual({
      text: 'Sélection complète, pas encore enregistrée.',
      retain: true,
    });
  });

  it('sélection complète et déjà enregistrée : comment faire de la place, sans bouton', () => {
    const note = deckSelectionNote({ count: 3, changed: false });
    expect(note?.retain).toBe(false);
    expect(note?.text).toContain('retirez-en un dans toute la liste');
  });

  it('une sélection vidée ne s’enregistre pas d’ici', () => {
    expect(deckSelectionNote({ count: 0, changed: true })).toBeNull();
  });
});

describe('la fin du parcours', () => {
  it('tous les biens vus : ceux de la veille, ou tous ceux de la page', () => {
    expect(deckEndKicker({ seen: true, scope: 'watch', unread: false })).toBe(
      'Tous les nouveaux biens sont vus',
    );
    expect(deckEndKicker({ seen: true, scope: 'all', unread: false })).toBe(
      'Tous les biens sont vus',
    );
  });

  it('rien à voir : dit comme tel', () => {
    expect(deckEndKicker({ seen: false, scope: 'watch', unread: false })).toBe(
      'Aucun nouveau bien à voir pour l’instant',
    );
    expect(deckEndKicker({ seen: false, scope: 'all', unread: false })).toBe(
      'Aucun bien à voir pour l’instant',
    );
  });

  // M98 — une lecture en échec n'est jamais lue comme une absence.
  it('une lecture en échec ne se dit jamais « aucun bien »', () => {
    for (const scope of ['watch', 'all'] as const) {
      const kicker = deckEndKicker({ seen: false, scope, unread: true });
      expect(kicker).toBe('Ses biens n’ont pas pu être lus');
      expect(kicker).not.toMatch(/aucun/i);
    }
  });
});
