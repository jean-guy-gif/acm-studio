import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// On isole le composant du Server Action (chaîne server-only) : le test ne porte que sur
// le rendu du champ.
vi.mock('@/features/meeting-conclusion/actions/save-commercialization-price', () => ({
  saveCommercializationPrice: async () => ({ ok: true }),
}));

import { LiveCommercializationPrice } from '@/features/meeting-conclusion/components/live-commercialization-price';

// Mission 53 §7.5 — le champ du prix de commercialisation est VIDE à l'ouverture, quel que
// soit le dossier : jamais pré-rempli avec le prix conseillé (règle M51 appliquée au
// dernier écran). Ancrer le vendeur sur notre chiffre au moment de lui demander le sien
// ruinerait la pédagogie.
describe('§7.5 — le champ prix de commercialisation est vide à l’ouverture', () => {
  it('rend un champ vide, jamais pré-rempli, quel que soit le dossier', () => {
    for (const projectId of ['p1', 'un-autre-dossier']) {
      const html = renderToStaticMarkup(createElement(LiveCommercializationPrice, { projectId }));
      const input = html.match(/<input[^>]*commercialization_price[^>]*>/)?.[0] ?? '';
      expect(input).toContain('name="commercialization_price"');
      // Vide : value="" présent, et jamais une valeur non vide.
      expect(input).toMatch(/value=""/);
      expect(input).not.toMatch(/value="[^"]+"/);
    }
  });
});
