import { describe, expect, it } from 'vitest';

import { SIZE_FLOOR, isAllowedUrl, isStableSize, isWaitingShell } from './page-readiness.js';

// These guard the two defects the extension shipped to production:
//   - 10 September 2026: a background tab that never built, returning its shell;
//   - 16 September 2026: a STABLE shell (« Un instant… », 29 k) taken for a finished
//     page — « Un instant… » landed in a competitor's Titre.

describe('isWaitingShell (plancher + titres d’attente)', () => {
  it('refuse une coquille de 29 000 caractères (sous le plancher de 60 000)', () => {
    // maisonsetappartements.fr, mesuré le 2026-09-16 : la coquille faisait ~29 k.
    expect(isWaitingShell({ size: 29_000, title: 'Villeneuve-Loubet - Appartement' })).toBe(true);
  });

  it('accepte une vraie fiche de 235 000 caractères', () => {
    // Même page, une fois rendue : 235 k, titre réel de l’annonce.
    expect(
      isWaitingShell({ size: 235_000, title: 'Villeneuve-Loubet - Appartement à vendre - 68 m²' }),
    ).toBe(false);
  });

  it('refuse le titre « Un instant… » quelle que soit la taille (maisonsetappartements.fr, 2026-09-16)', () => {
    expect(isWaitingShell({ size: 500_000, title: 'Un instant…' })).toBe(true);
    expect(isWaitingShell({ size: 29_000, title: 'Un instant…' })).toBe(true);
  });

  it('accepte une page juste au-dessus du plancher avec un vrai titre', () => {
    expect(isWaitingShell({ size: SIZE_FLOOR + 1, title: 'Annonce' })).toBe(false);
  });
});

describe('isAllowedUrl (jumeau des host_permissions)', () => {
  it('accepte les quatre portails retenus en https', () => {
    for (const url of [
      'https://www.seloger.com/annonces/x',
      'https://www.bienici.com/annonce/x',
      'https://www.green-acres.fr/fr/properties/x',
      'https://www.maisonsetappartements.fr/ads/4534734',
    ]) {
      expect(isAllowedUrl(url)).toBe(true);
    }
  });

  it('refuse une adresse hors des portails retenus', () => {
    expect(isAllowedUrl('https://example.com/annonce/1')).toBe(false);
  });

  it('refuse leboncoin.fr (robots.txt interdit /ad/ — jamais supporté)', () => {
    expect(isAllowedUrl('https://www.leboncoin.fr/ad/ventes_immobilieres/1')).toBe(false);
  });

  it('refuse le non-https et une adresse invalide', () => {
    expect(isAllowedUrl('http://www.seloger.com/annonces/x')).toBe(false);
    expect(isAllowedUrl('pas une url')).toBe(false);
  });
});

describe('isStableSize', () => {
  it('la première lecture (sans précédent) n’est jamais stable', () => {
    expect(isStableSize(null, 29_000)).toBe(false);
  });

  it('deux lectures à moins de 2 % sont stables', () => {
    expect(isStableSize(235_339, 235_373)).toBe(true);
  });

  it('un saut coquille → page réelle n’est pas stable', () => {
    expect(isStableSize(29_152, 235_339)).toBe(false);
  });
});
