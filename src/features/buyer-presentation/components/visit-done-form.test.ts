import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, refresh: () => undefined }),
  usePathname: () => '/visites',
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

  it('ce qui a plu, ce qui a gêné et la note sont repliés', () => {
    expect(html).not.toContain('data-testid="visit-liked-');
    expect(html).not.toContain('data-testid="visit-disliked-');
    expect(html).not.toContain('data-testid="visit-note"');
    expect(html).toContain('Ce qui a plu, ce qui a gêné, une note (facultatif)');
  });

  it('de grands boutons, et l’enregistrement attend son avis et la suite', () => {
    expect(html.match(/min-h-12/g)?.length).toBeGreaterThanOrEqual(8);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*data-testid="visit-done-save"/);
  });
});
