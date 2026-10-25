import { describe, expect, it } from 'vitest';

import {
  readSelectionInput,
  seenOnLabel,
  SELECTION_EMPTY,
  SELECTION_TOO_MANY,
  toSelection,
} from '@/features/ideal-properties/services/ideal-selection';

const item = (reference: string) => ({
  source: 'listing',
  reference,
  label: 'Appartement · 3 pièces · 68 m² · Antibes',
  listedPrice: 390_000,
  category: 'strong',
  gaps: [],
  snapshot: { photoUrls: ['https://photos.example/1.jpg'] },
});

// Mission 118 — la sélection : trois au plus, relue par le serveur ; « affiché le », jamais
// « disponible ».
describe('la sélection de biens idéaux', () => {
  it('vide : refusée ; quatre : refusés ; trois : acceptés, sans doublon', () => {
    expect(readSelectionInput([])).toEqual({ ok: false, error: SELECTION_EMPTY });
    expect(readSelectionInput(['a', 'b', 'c', 'd'])).toEqual({
      ok: false,
      error: SELECTION_TOO_MANY,
    });
    const read = readSelectionInput([item('u1'), item('u2'), item('u2')]);
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.items.map((entry) => entry.reference)).toEqual(['u1', 'u2']);
  });

  it('une source ou une catégorie hors liste : refusée', () => {
    expect(readSelectionInput([{ ...item('u1'), source: 'portal' }]).ok).toBe(false);
    expect(readSelectionInput([{ ...item('u1'), category: 'perfect' }]).ok).toBe(false);
    expect(readSelectionInput([{ ...item('u1'), category: 'agency', source: 'project' }]).ok).toBe(
      true,
    );
  });

  it('« affiché le », jamais « disponible »', () => {
    expect(seenOnLabel('2026-10-24')).toBe('affiché le 24/10/2026');
    expect(seenOnLabel(null)).toBeNull();
    expect(seenOnLabel('pas une date')).toBeNull();
  });

  it('la sélection relue : biens dans l’ordre, photo de l’import sinon de la recherche', () => {
    const row = {
      id: 's1',
      agency_id: 'a',
      buyer_id: 'b',
      created_by: null,
      created_at: '2026-10-24T10:00:00Z',
      presented_at: null,
      buyer_words: null,
    };
    const base = {
      agency_id: 'a',
      selection_id: 's1',
      listed_price: 390_000,
      price_seen_on: '2026-10-24',
      gaps: [],
      created_at: '2026-10-24T10:00:00Z',
      dossier_hide_photo: false,
      pitch: null,
    };
    const selection = toSelection(row, [
      {
        ...base,
        id: 'i2',
        position: 2,
        source: 'listing',
        reference: 'u2',
        label: 'B',
        category: 'explore',
        snapshot: { photoUrls: ['https://p/2.jpg'] },
        imported: { photoUrls: ['https://p/imported.jpg'] },
      },
      {
        ...base,
        id: 'i1',
        position: 1,
        source: 'project',
        reference: 'p1',
        label: 'A',
        category: 'agency',
        snapshot: null,
        imported: null,
      },
    ]);
    expect(selection.items.map((entry) => entry.position)).toEqual([1, 2]);
    expect(selection.items[1]).toMatchObject({
      photoUrl: 'https://p/imported.jpg',
      imported: true,
      category: 'explore',
    });
    expect(selection.items[0]).toMatchObject({
      photoUrl: null,
      imported: false,
      source: 'project',
    });
  });
});
