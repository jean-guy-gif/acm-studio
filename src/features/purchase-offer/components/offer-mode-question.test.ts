import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// Lot B (Jean-Guy, 27/11) — en tête de l'offre d'achat, « Comment finance-t-il ? » quand ce n'est
// pas encore dit, ou lu dans ses notes et encore « À vérifier » : deux choix, avant tout champ.
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => undefined }) }));
vi.mock('@/features/buyers/actions/buyers', () => ({
  markBuyerContacted: vi.fn(),
  setBuyerFinancing: vi.fn(),
  setBuyerFinancingMode: vi.fn(),
}));

const { OfferModeQuestion } =
  await import('@/features/purchase-offer/components/offer-mode-question');

const render = (mode: 'cash' | 'loan' | 'not_said', toVerify: boolean) =>
  renderToStaticMarkup(createElement(OfferModeQuestion, { buyerId: 'b1', mode, toVerify }));
const pressed = (html: string) =>
  [...html.matchAll(/aria-pressed="true"[^>]*>([^<]+)</g)].map((match) => match[1]);

describe('la question en tête de l’offre', () => {
  it('pas encore dit : la question, deux choix, aucun choisi d’avance', () => {
    const html = render('not_said', false);
    expect(html).toContain('Comment finance-t-il');
    expect(html).toContain('Dites d’abord comment l’acquéreur finance son achat');
    expect(html).toContain('>Comptant</button>');
    expect(html).toContain('>Avec prêt</button>');
    expect(html).not.toContain('Pas encore dit');
    expect(pressed(html)).toEqual([]);
  });

  // Lot B5 (Jean-Guy, 28/11) — à la signature d'une offre préparée : la même question, à la place
  // de la signature, et ce qui est saisi reste.
  it('à la signature : la question à sa place, ce qui est saisi reste', () => {
    const html = renderToStaticMarkup(
      createElement(OfferModeQuestion, {
        buyerId: 'b1',
        mode: 'not_said',
        toVerify: false,
        onAnswered: () => undefined,
      }),
    );
    expect(html).toContain('data-testid="offer-ask-mode-at-signing"');
    expect(html).not.toContain('data-testid="offer-ask-mode"');
    expect(html).toContain('Comment finance-t-il');
    expect(html).toContain('ce que vous avez saisi reste, et la signature continue');
    expect(html).not.toContain('role="alert"');
  });

  it('lu dans ses notes : ce qu’elles disent, à confirmer ou corriger', () => {
    const html = render('cash', true);
    expect(html).toMatch(/Lu dans ses notes\s:\s«\sComptant\s»/);
    expect(pressed(html)).toEqual(['Comptant']);
  });
});
