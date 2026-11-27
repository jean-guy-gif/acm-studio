import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/live-seller/actions/reorder-live-competitors', () => ({
  reorderLiveCompetitors: async () => ({ ok: true }),
}));

import { LiveOrderEditor } from '@/features/live-seller/components/live-order-editor';
import { LIVE_ORDER_FROZEN } from '@/features/live-seller/services/live-timing';

const ENTRIES = [
  { id: 'a', label: 'Appartement · 3 pièces · 65 m² · Nice', shown: true },
  { id: 'b', label: 'Appartement · 3 pièces · 70 m² · Nice', shown: true },
  { id: 'c', label: 'Appartement · 4 pièces · 80 m² · Nice', shown: false },
];

const render = (frozen: boolean) =>
  renderToStaticMarkup(
    createElement(LiveOrderEditor, { projectId: 'p', entries: ENTRIES, frozen }),
  );

// Mission 110 — l'ordre des concurrents au Live, en mode expert.
describe('l’ordre des concurrents au Live', () => {
  it('se déplace par glisser-déposer et par flèches tant que le Live n’a pas commencé', () => {
    const html = render(false);
    expect(html.match(/draggable="true"/g)).toHaveLength(3);
    expect(html).not.toContain(LIVE_ORDER_FROZEN);
    // Seules les flèches impossibles (monter le premier, descendre le dernier) sont désactivées.
    expect(html.match(/<button[^>]*disabled=""/g)).toHaveLength(2);
  });

  it('une fois le Live commencé : ni glisser-déposer, ni flèches, et « Ordre figé »', () => {
    const html = render(true);
    expect(LIVE_ORDER_FROZEN).toBe('Ordre figé\u00a0: le Live a commencé');
    expect(html).toContain(LIVE_ORDER_FROZEN);
    expect(html).not.toContain('draggable="true"');
    expect(html.match(/<button[^>]*>/g)).toHaveLength(6);
    expect(html.match(/<button[^>]*disabled=""/g)).toHaveLength(6);
  });
});
