import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { buyerFollowUp, followUpSummary } from '@/features/buyers/services/buyer-follow-up';

// La fiche complète d'un bien s'ouvre par une action du serveur : ici, un simple bouton.
vi.mock('@/features/property-sheet/components/property-sheet-button', () => ({
  PropertySheetButton: ({ children }: { children: unknown }) =>
    createElement('button', { 'data-testid': 'open-property-sheet' }, children as string),
}));

const { BuyerFollowUp } = await import('@/features/buyers/components/buyer-follow-up');

// Lancement, mission 6 — « Son suivi », tel qu'il s'affiche : une lecture en échec se dit, ce que
// le conseiller a écarté est replié, les lignes de visite sont celles qu'on lui donne.
const NOW = new Date('2026-11-24T10:00:00Z');
const entries = buyerFollowUp({
  selections: [{ id: 's1', presented_at: '2026-11-14T09:30:00Z' }],
  shares: [],
  items: [
    {
      id: 'i1',
      selection_id: 's1',
      source: 'project',
      reference: 'p1',
      label: 'Appartement · 3 pièces · 65 m² · Antibes',
      listed_price: 395_000,
      removed_at: null,
    },
    {
      id: 'i2',
      selection_id: 's1',
      source: 'competitor',
      reference: 'c1',
      label: 'Appartement · 3 pièces · 71 m² · Antibes',
      listed_price: 398_000,
      removed_at: null,
    },
  ],
  proposals: [],
  responses: [
    {
      selection_item_id: 'i2',
      answer: 'no',
      reasons: ['district'],
      answered_at: '2026-11-14T09:15:00Z',
      answered_during: 'presentation',
    },
  ],
  dismissals: [
    {
      property_key: 'listing:seloger:ABC',
      label: 'Maison · 5 pièces · 140 m² · Vence',
      reason: 'over_budget',
      dismissed_at: '2026-11-20T08:00:00Z',
    },
  ],
  visits: [
    {
      id: 'v1',
      itemId: 'i1',
      requestedAt: '2026-11-14T09:10:00Z',
      visitedAt: '2026-11-22T15:00:00Z',
      opinion: 'love',
      outcome: 'visited',
    },
  ],
  competitorUrls: new Map(),
});

const render = (over: { unread?: boolean; list?: typeof entries } = {}) =>
  renderToStaticMarkup(
    createElement(BuyerFollowUp, {
      entries: over.list ?? entries,
      summary: followUpSummary(over.list ?? entries, 0),
      unread: over.unread ?? false,
      now: NOW,
      visitRows: {
        v1: createElement('li', { key: 'v1', 'data-testid': 'visit-line' }, 'La visite du 22/11'),
      },
    }),
  );

describe('« Son suivi », à l’écran', () => {
  it('un bloc, les groupes dans l’ordre, la ligne du haut', () => {
    const html = render();
    expect(html).toContain('Son suivi');
    expect(html).toContain('2 biens envoyés · 1 visité · 1 refusé · 1 écarté pour lui');
    const order = ['Visités', 'Refusés', 'Écartés pour lui, sans lui en parler'].map((title) =>
      html.indexOf(title),
    );
    expect(order.every((at) => at > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // Aucun groupe vide.
    expect(html).not.toContain('Visites à organiser');
    expect(html).not.toContain('Envoyés, en attente');
  });

  it('un bien visité : la ligne de sa visite, ce qui l’a précédée, et sa fiche à un toucher', () => {
    const html = render();
    expect(html).toContain('La visite du 22/11');
    expect(html).toContain('Envoyé le 14/11, en présentation');
    expect(html).toContain('Voir la fiche du bien');
  });

  it('un concurrent refusé : sa raison, « Concurrent à prospecter », jamais « Dans l’agence »', () => {
    const html = render();
    expect(html).toContain('Pas pour lui : Le quartier');
    expect(html).toContain('Concurrent à prospecter');
    expect(html).not.toContain('Dans l’agence');
    expect(html).toContain('>Refusé<');
  });

  it('ce que le conseiller a écarté pour lui est replié', () => {
    const html = render();
    expect(html).toMatch(/<details[^>]*data-group="dismissed"/);
    expect(html).not.toMatch(/<details[^>]*open/);
    expect(html).toContain('Prix au-dessus du budget');
  });

  it('une lecture en échec le dit, même sans rien à montrer ; sans rien ni échec, pas de bloc', () => {
    expect(render({ unread: true, list: [] })).toContain(
      'Son suivi n’a pas pu être lu en entier : rechargez la page.',
    );
    expect(render({ list: [] })).toBe('');
  });

  it('aucun bouton plein', () => {
    expect(render()).not.toContain('btn-filled');
  });
});
