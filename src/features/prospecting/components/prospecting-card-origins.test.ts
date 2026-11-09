import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/competitor-locator/actions/confirm-competitor-address', () => ({
  confirmCompetitorAddress: async () => ({ ok: true }),
}));
vi.mock('@/features/competitor-mandate/actions/set-competitor-mandate', () => ({
  setCompetitorMandate: async () => ({ ok: true }),
}));
vi.mock('@/features/prospecting/actions/add-prospecting-opposition', () => ({
  addProspectingOpposition: async () => ({ ok: true }),
}));
vi.mock('@/features/prospecting/actions/set-prospecting-status', () => ({
  setProspectingStatus: async () => ({ ok: true }),
  markLettersHanded: async () => ({ ok: true }),
}));

import { btnSecondary } from '@/components/ui/styles';
import { ProspectingCard } from '@/features/prospecting/components/prospecting-card';
import { groupProspecting } from '@/features/prospecting/services/group-prospecting';
import { addressed, entry } from '@/features/prospecting/services/test-cards';

const ADDRESS = '8 avenue du Docteur Hochet, 06160 Antibes';
const ORIGIN = { originId: 'o1', buyerId: 'b1', buyerName: 'Famille Keller' };

// Mission 120 B (reprise R4) — une carte à deux origines (concurrent d'un dossier vendeur ET
// recherche acquéreur) : « Préparer le dossier » et « Préparer le courrier » au même rang.
// Mission 146 (partie B) — en contour tous les deux : aucun bouton plein sur les cartes.
describe('carte de Prospection à deux origines', () => {
  const render = (buyerOrigins: (typeof ORIGIN)[]) =>
    renderToStaticMarkup(
      createElement(ProspectingCard, {
        card: groupProspecting([entry('martin', addressed('c1', ADDRESS))])[0],
        buyerOrigins,
      }),
    );

  it('les deux actions au même rang, en contour, le dossier d’abord', () => {
    const html = render([ORIGIN]);
    const fileAt = html.indexOf('Préparer le dossier');
    const letterAt = html.indexOf('Préparer le courrier');
    expect(fileAt).toBeGreaterThan(-1);
    expect(letterAt).toBeGreaterThan(fileAt);
    const outline = btnSecondary.split(' ')[0];
    const tagOf = (at: number) => html.slice(html.lastIndexOf('<a ', at), at);
    // La même classe, entière (relecteur) : contour et petite taille.
    const classOf = (at: number) => /class="([^"]*)"/.exec(tagOf(at))?.[1];
    expect(classOf(fileAt)).toContain(outline);
    expect(classOf(fileAt)).toBe(classOf(letterAt));
    expect(html).not.toContain('btn-filled');
    expect(tagOf(letterAt)).toContain('/acquereurs/courrier/o1');
  });

  it('sans recherche acquéreur, pas de courrier acquéreur', () => {
    expect(render([])).not.toContain('Préparer le courrier');
  });
});
