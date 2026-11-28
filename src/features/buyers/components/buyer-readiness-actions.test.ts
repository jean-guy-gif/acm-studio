import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// Lot B (Jean-Guy, 27/11) — « Comment finance-t-il ? » sur la fiche acquéreur, sous l'état du
// financement (planche missions/maquettes/lot-b/LB2-comment-finance-t-il.png).
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => undefined }) }));
vi.mock('@/features/buyers/actions/buyers', () => ({
  markBuyerContacted: vi.fn(),
  setBuyerFinancing: vi.fn(),
  setBuyerFinancingMode: vi.fn(),
}));

const { BuyerReadinessActions } =
  await import('@/features/buyers/components/buyer-readiness-actions');

type Props = Parameters<typeof BuyerReadinessActions>[0];
const render = (props: Partial<Props> = {}) =>
  renderToStaticMarkup(
    createElement(BuyerReadinessActions, {
      buyerId: 'b1',
      financing: 'in_progress',
      financingChangedAt: null,
      contactedToday: false,
      financingMode: 'not_said',
      loan: { contribution: null, amount: null, agreement: null },
      modeToVerify: false,
      ...props,
    }),
  );
const pressed = (html: string) =>
  [...html.matchAll(/aria-pressed="true"[^>]*>([^<]+)</g)].map((match) => match[1]);

describe('« Comment finance-t-il ? » sur la fiche', () => {
  it('sous l’état du financement : trois choix, « Pas encore dit » par défaut, sans prêt', () => {
    const html = render();
    expect(html).toContain('Comment finance-t-il');
    for (const label of ['Comptant', 'Avec prêt', 'Pas encore dit']) {
      expect(html).toContain(`>${label}</button>`);
    }
    // L'état du financement (En cours) et le mode (Pas encore dit), chacun le sien.
    expect(pressed(html)).toEqual(['En cours', 'Pas encore dit']);
    expect(html.indexOf('data-testid="buyer-financing"')).toBeLessThan(
      html.indexOf('data-testid="buyer-financing-mode"'),
    );
    expect(html).not.toContain('data-testid="buyer-loan"');
    expect(html).not.toContain('À vérifier');
  });

  it('comptant : le choix plein, et aucun champ du prêt', () => {
    const html = render({ financingMode: 'cash' });
    expect(pressed(html)).toEqual(['En cours', 'Comptant']);
    expect(html).not.toContain('data-testid="buyer-loan"');
  });

  it('avec un prêt : l’apport et le prêt avec l’espace des milliers, l’accord, « Prêt enregistré »', () => {
    const html = render({
      financingMode: 'loan',
      loan: { contribution: 120_000, amount: 650_000, agreement: false },
    });
    expect(html).toContain('data-testid="buyer-loan"');
    expect(html).toContain('Apport');
    expect(html).toContain('Montant du prêt');
    // L'espace des milliers du champ de prix (celle de « Votre fourchette »).
    expect(html).toMatch(/value="120\s000"/);
    expect(html).toMatch(/value="650\s000"/);
    expect(html).toContain('Accord de principe de sa banque');
    expect(pressed(html)).toEqual(['En cours', 'Avec prêt', 'Non']);
    expect(html).toContain('Prêt enregistré ✓');
  });

  it('avec un prêt encore vide : rien à enregistrer, tout est facultatif', () => {
    const html = render({ financingMode: 'loan' });
    expect(html).toMatch(/disabled=""[^>]*data-testid="buyer-loan-save"[^>]*>Enregistrer le prêt</);
    expect(html).toContain('Facultatifs');
  });

  it('lu dans les notes : « À vérifier », et un toucher le confirme', () => {
    const html = render({ financingMode: 'cash', modeToVerify: true });
    expect(html).toContain('À vérifier · lu dans vos notes');
    expect(html).toContain('Un toucher sur le bon choix le confirme');
  });
});
