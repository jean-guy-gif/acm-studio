import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const where = vi.hoisted(() => ({ pathname: '/visites' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, refresh: () => undefined }),
  usePathname: () => where.pathname,
}));
vi.mock('@/features/buyer-presentation/actions/visit-requests', () => ({
  recordVisitDone: async () => ({ ok: true }),
}));

const { VisitDoneForm } = await import('@/features/buyer-presentation/components/visit-done-form');

// Lancement, mission 7 (Jean-Guy, 23/11) — le compte rendu de visite en trente secondes : son avis
// et la suite d'abord, en grands boutons ; le reste est facultatif, replié.
const html = renderToStaticMarkup(
  createElement(VisitDoneForm, { requestId: 'v1', onCancel: () => undefined }),
);

describe('« Visite faite », au pouce', () => {
  it('son avis, puis la suite, puis « Enregistrer » : rien d’autre à parcourir', () => {
    const at = (testId: string) => html.indexOf(`data-testid="${testId}"`);
    const order = [
      at('visit-opinion-love'),
      at('visit-opinion-not_for_me'),
      at('visit-next-offer'),
      at('visit-next-keep_searching'),
      at('visit-more-open'),
      at('visit-done-save'),
    ];
    expect(order.every((position) => position > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('ce qui a plu, ce qui a déplu et la note sont repliés', () => {
    expect(html).not.toContain('data-testid="visit-liked-');
    expect(html).not.toContain('data-testid="visit-disliked-');
    expect(html).not.toContain('data-testid="visit-note"');
    expect(html).toContain('Ce qui a plu, ce qui a déplu, une note (facultatif)');
  });

  it('de grands boutons ; au premier rendu, rien n’est choisi et « Enregistrer » est désactivé', () => {
    // La refonte, lot F — « Enregistrer » prend le bouton du socle (`h-12`, 48 px) : les grands
    // boutons se comptent sur leurs deux écritures.
    expect(html.match(/\b(?:min-)?h-12\b/g)?.length).toBeGreaterThanOrEqual(8);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*data-testid="visit-done-save"/);
    expect(html).not.toContain('aria-pressed="true"');
  });

  it('sur Visites, « Enregistrer » est le bouton plein ; sur la fiche acquéreur, il est en contour (M146)', () => {
    const save = (markup: string) =>
      markup.match(/<button[^>]*data-testid="visit-done-save"[^>]*>/)?.[0] ??
      markup.match(/<button[^>]*class="[^"]*"[^>]*data-testid="visit-done-save"/)?.[0] ??
      '';
    expect(save(html)).toContain('btn-filled');
    where.pathname = '/acquereurs/3971f875-ac81-4e0a-be73-d9554ffa2987';
    const onBuyerPage = renderToStaticMarkup(
      createElement(VisitDoneForm, { requestId: 'v1', onCancel: () => undefined }),
    );
    where.pathname = '/visites';
    expect(save(onBuyerPage)).not.toBe('');
    expect(save(onBuyerPage)).not.toContain('btn-filled');
  });
});
