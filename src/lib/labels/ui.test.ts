import { describe, expect, it } from 'vitest';

import { UI } from '@/lib/labels/ui';

// Mots anglais critiques interdits dans les libellés d'interface (règle produit
// bloquante : aucun mot anglais visible).
const FORBIDDEN_ENGLISH = [
  'save',
  'cancel',
  'submit',
  'edit',
  'delete',
  'close',
  'next',
  'previous',
  'loading',
  'unknown',
  'outdated',
  'up to date',
  'no data',
  'full screen',
  'fullscreen',
  'price history',
  'seller',
  'competitor',
  'search',
  'settings',
  'logout',
];

describe('dictionnaire UI', () => {
  it('ne contient aucun mot anglais critique', () => {
    for (const [key, value] of Object.entries(UI)) {
      const lower = value.toLowerCase();
      for (const word of FORBIDDEN_ENGLISH) {
        expect(lower.includes(word), `«${value}» (clé ${key}) contient «${word}»`).toBe(false);
      }
    }
  });

  it('a des libellés non vides', () => {
    for (const value of Object.values(UI)) {
      expect(value.trim().length).toBeGreaterThan(0);
    }
  });

  it('mappe les libellés attendus', () => {
    expect(UI.save).toBe('Enregistrer');
    expect(UI.upToDate).toBe('À jour');
    expect(UI.outdated).toBe('À actualiser');
    expect(UI.fullscreen).toBe('Plein écran');
    expect(UI.unknown).toBe('Non renseigné');
  });
});
