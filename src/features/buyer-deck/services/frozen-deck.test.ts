import { describe, expect, it } from 'vitest';

import { deckForReading, storedDeck } from '@/features/buyer-deck/services/frozen-deck';
import type { BuyerDeck, DeckItem } from '@/features/buyer-deck/types';

const item = (
  itemId: string,
  source: 'project' | 'competitor' | 'listing',
  photo: string,
  pitch: string,
) =>
  ({
    letter: itemId.toUpperCase(),
    item: {
      itemId,
      source,
      photos: [photo],
      label: `${itemId} label`,
      outdoor: [],
      parking: [],
      gaps: [],
      priceDrop: null,
    },
    photos: [photo],
    marks: [{ criterion: 'surface', mark: 'ok', text: '68 m²' }],
    okCount: 1,
    total: 1,
    priceLine: null,
    pricePerSqm: null,
    pitch,
    pitchProposed: pitch,
    datedFact: null,
    blocked: false,
    blockedBy: [],
  }) as unknown as DeckItem;

const deck = (words: string, items: DeckItem[]): BuyerDeck => ({
  buyerId: 'b',
  buyerName: 'M. et Mme Rossi',
  selectionId: 's',
  selectedAt: '2026-10-24T10:00:00Z',
  presentedAt: null,
  words,
  wordsProposed: words,
  criteria: [{ criterion: 'surface', label: '65 m² et plus', mustHave: false }],
  items,
  lead: null,
  leadLetter: null,
  meetingAvailability: [],
});

// Ce qui a été affiché à « Terminer »…
const frozen = deck('Un 3 pièces au calme.', [
  item('a', 'project', 'https://signe.example/ancien-lien', 'Il coche vos critères.'),
  item('b', 'listing', 'https://annonce.example/photo-figee.jpg', 'Une phrase figée.'),
]);
// …et ce que le calcul du jour donnerait (la fiche a changé, les liens sont neufs).
const computed = deck('Un 4 pièces, phrase du jour.', [
  item('a', 'project', 'https://signe.example/nouveau-lien', 'Phrase recalculée.'),
  item('b', 'listing', 'https://annonce.example/photo-du-jour.jpg', 'Phrase recalculée.'),
]);

// Mission 122 (décisions de Jean-Guy, 25/10) — une présentation terminée se relit telle qu'elle a
// été affichée ; seules les photos d'un bien de l'agence (liens signés d'une heure) se renouvellent.
describe('la relecture d’une présentation terminée', () => {
  it('un déroulé figé : rien ne se recalcule — ses mots, la grille, les phrases, les faits', () => {
    const shown = deckForReading({
      presentedAt: '2026-10-25T11:00:00Z',
      presentedDeck: frozen,
      computed,
    });
    expect(shown.words).toBe('Un 3 pièces au calme.');
    expect(shown.criteria).toEqual(frozen.criteria);
    expect(shown.items.map((entry) => entry.pitch)).toEqual([
      'Il coche vos critères.',
      'Une phrase figée.',
    ]);
    expect(shown.presentedAt).toBe('2026-10-25T11:00:00Z');
  });

  it('les photos d’un bien de l’agence se renouvellent, celles d’une annonce restent figées', () => {
    const shown = deckForReading({
      presentedAt: '2026-10-25T11:00:00Z',
      presentedDeck: frozen,
      computed,
    });
    expect(shown.items[0]!.photos).toEqual(['https://signe.example/nouveau-lien']);
    expect(shown.items[0]!.item.photos).toEqual(['https://signe.example/nouveau-lien']);
    expect(shown.items[1]!.photos).toEqual(['https://annonce.example/photo-figee.jpg']);
  });

  it('terminée avant la mission (déroulé nul) : elle se recalcule ; pas terminée : le calcul du moment', () => {
    expect(
      deckForReading({ presentedAt: '2026-10-20T11:00:00Z', presentedDeck: null, computed }),
    ).toBe(computed);
    expect(deckForReading({ presentedAt: null, presentedDeck: frozen, computed })).toBe(computed);
  });

  it('chaque bien relu repasse par la liste d’autorisation : une colonne glissée n’en sort pas', () => {
    const spiked = deck('Un 3 pièces.', [
      {
        ...item('b', 'listing', 'https://annonce.example/photo.jpg', 'Une phrase.'),
        item: {
          ...item('b', 'listing', 'https://annonce.example/photo.jpg', 'Une phrase.').item,
          title: 'EXCLUSIVITÉ Agence Dupont 12 rue des Lilas',
          listingUrl: 'https://www.seloger.com/annonces/piege.htm',
        } as unknown as DeckItem['item'],
      },
    ]);
    const shown = JSON.stringify(
      deckForReading({ presentedAt: '2026-10-25T11:00:00Z', presentedDeck: spiked, computed }),
    );
    expect(shown).not.toContain('Agence Dupont');
    expect(shown).not.toContain('piege.htm');
    expect(shown).toContain('https://annonce.example/photo.jpg');
  });

  it('tout le déroulé figé relu passe par la liste d’autorisation : déroulé, bien, marque', () => {
    const spiked = {
      ...frozen,
      notes: 'NOTE-SECRETE',
      items: frozen.items.map((entry) => ({
        ...entry,
        advisorComment: 'COMMENTAIRE-CONSEILLER',
        marks: entry.marks.map((mark) => ({ ...mark, internal: 'MARQUE-INTERNE' })),
      })),
    };
    const shown = JSON.stringify(
      deckForReading({ presentedAt: '2026-10-25T11:00:00Z', presentedDeck: spiked, computed }),
    );
    for (const leak of ['NOTE-SECRETE', 'COMMENTAIRE-CONSEILLER', 'MARQUE-INTERNE']) {
      expect(shown).not.toContain(leak);
    }
    expect(shown).toContain('Il coche vos critères.');
  });

  it('les créneaux du rendez-vous se relisent du déroulé figé, et eux seuls', () => {
    const withSlots = {
      ...frozen,
      meetingAvailability: ['sunday', 'pas-un-creneau', 'sat_morning'],
    } as unknown as BuyerDeck;
    expect(
      deckForReading({ presentedAt: '2026-10-25T11:00:00Z', presentedDeck: withSlots, computed })
        .meetingAvailability,
    ).toEqual(['sat_morning', 'sunday']);
    // Un déroulé figé avant que les créneaux y soient rangés : aucun, rien n'est reconstitué.
    const { meetingAvailability: _none, ...older } = frozen;
    void _none;
    expect(
      deckForReading({ presentedAt: '2026-10-25T11:00:00Z', presentedDeck: older, computed })
        .meetingAvailability,
    ).toEqual([]);
  });

  it('un déroulé stocké de forme inattendue ne vaut rien', () => {
    expect(storedDeck({ words: 'x' })).toBeNull();
    expect(storedDeck([1, 2])).toBeNull();
    expect(storedDeck(frozen)).toEqual(frozen);
  });
});
