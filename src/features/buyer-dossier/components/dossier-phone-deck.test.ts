import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { buildBuyerDeck } from '@/features/buyer-deck/services/buyer-deck';
import type { DeckItemInput, ItemResponse } from '@/features/buyer-deck/types';
import type { BuyerInput } from '@/features/buyers/types';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => undefined }) }));
vi.mock('@/features/buyer-dossier/actions/submit-dossier-answers', () => ({
  submitDossierAnswers: async () => ({ ok: true, answered: 1 }),
}));

const { DossierPhoneDeck } = await import('@/features/buyer-dossier/components/dossier-phone-deck');

const buyer = {
  name: 'Famille Test',
  phone: null,
  email: null,
  purpose: null,
  timeline: null,
  notes: null,
  propertyTypes: ['house'],
  cities: ['Mougins'],
  budgetIdeal: null,
  budgetMax: 1_650_000,
  roomsMin: null,
  bedroomsMin: null,
  surfaceMin: null,
  outdoor: null,
  parking: null,
  pool: null,
  floorMin: null,
  elevator: null,
  energyRatingMax: null,
  worksAccepted: null,
  mustHave: ['cities'],
  dealBreakers: null,
} as unknown as BuyerInput;

const item = (itemId: string, position: number): DeckItemInput => ({
  itemId,
  position,
  source: 'listing',
  category: 'strong',
  label: `Maison · ${position + 5} pièces · Mougins`,
  city: 'Mougins',
  district: null,
  price: 1_500_000,
  priceSeenOn: '2026-10-24',
  surfaceArea: 200,
  roomsCount: 6,
  bedroomsCount: 4,
  outdoor: [],
  parking: [],
  energyRating: null,
  photos: [],
  gaps: [],
  propertyType: 'Maison',
  floor: null,
  hasPool: null,
  hasElevator: null,
  condition: null,
  listedSince: null,
  priceDrop: null,
  pitch: null,
});

const deck = (presentedAt: string | null) => ({
  ...buildBuyerDeck({
    buyerId: 'b',
    buyer,
    selectionId: 's',
    selectedAt: '2026-10-24T10:00:00Z',
    presentedAt,
    buyerWords: 'Une maison à Mougins.',
    items: [item('i1', 1), item('i2', 2)],
    now: new Date('2026-10-25T10:00:00Z'),
  }),
  presentedAt,
});

const response = (
  itemId: string,
  answer: ItemResponse['answer'],
  answeredDuring: ItemResponse['answeredDuring'],
): ItemResponse => ({
  id: `${itemId}-${answeredDuring}`,
  itemId,
  answer,
  reasons: [],
  answeredDuring,
  answeredAt: '2026-10-25T10:00:00Z',
});

const render = (over: Partial<Parameters<typeof DossierPhoneDeck>[0]> = {}) =>
  renderToStaticMarkup(
    createElement(DossierPhoneDeck, {
      token: 'A'.repeat(43),
      deck: deck(null),
      answered: false,
      initialAnswers: [],
      initialAvailability: [],
      meetingAnswers: [],
      meetingAvailability: [],
      agencyName: 'Agence Test',
      logoUrl: null,
      advisorName: 'Carl Conseiller',
      advisorPhone: '06 11 22 33 44',
      ...over,
    }),
  );

// Mission 122 (partie B, décisions de Jean-Guy, 25/10) — ce que montre le lien selon l'état de la
// sélection : le déroulé à répondre, le merci après sa réponse, « Ce que nous avons vu ensemble »
// après la présentation ; jamais le formulaire une fois la réponse donnée.
describe('le lien du dossier sur téléphone', () => {
  it('pas encore répondu : le déroulé, et « Télécharger en PDF » à la fin', () => {
    const page = render();
    expect(page).toContain('data-testid="dossier-phone-deck"');
    expect(page).toContain('Vous m’avez dit :');
    expect(page).not.toContain('data-testid="dossier-thanks"');
  });

  it('déjà répondu : le merci et ses créneaux du lien, sans formulaire', () => {
    const page = render({
      answered: true,
      initialAnswers: [response('i1', 'visit', 'dossier')],
      initialAvailability: ['sunday'],
    });
    expect(page).toContain('Merci, j’ai bien reçu votre réponse');
    expect(page).toContain('data-testid="dossier-recap-item"');
    expect(page).toContain('Vos créneaux : Dimanche');
    expect(page).not.toContain('data-testid="dossier-send"');
    expect(page).not.toContain('data-testid="dossier-phone-deck"');
    expect(page).toContain('Télécharger en PDF');
  });

  it('déjà répondu sur un bien retiré depuis : le merci quand même, jamais le formulaire', () => {
    const page = render({ answered: true, initialAnswers: [] });
    expect(page).toContain('Merci, j’ai bien reçu votre réponse');
    expect(page).not.toContain('data-testid="dossier-send"');
  });

  it('présentation terminée : « Ce que nous avons vu ensemble », ses réponses du rendez-vous, en lecture seule', () => {
    const page = render({
      deck: deck('2026-10-25T11:00:00Z'),
      meetingAnswers: [
        response('i1', 'visit', 'presentation'),
        response('i2', 'no', 'presentation'),
      ],
      meetingAvailability: ['sat_morning'],
    });
    expect(page).toContain('data-testid="dossier-seen-together"');
    expect(page).toContain('Ce que nous avons vu ensemble');
    expect(page).toContain('Je veux le visiter');
    expect(page).toContain('Pas pour moi');
    expect(page).toContain('Vos créneaux : Samedi matin');
    expect(page).toContain('Carl Conseiller · 06 11 22 33 44');
    expect(page).toContain('Télécharger en PDF');
    for (const form of [
      'dossier-send',
      'dossier-phone-deck',
      'deck-answer',
      'dossier-availability',
    ]) {
      expect(page).not.toContain(`data-testid="${form}"`);
    }
  });
});
