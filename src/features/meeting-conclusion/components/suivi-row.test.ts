import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// Mission 160 — un accès direct au dossier depuis la carte du Suivi (maquette M160-1, validée par
// Jean-Guy le 18/11) : le nom du vendeur mène à la Vue d'ensemble du dossier, et « Ouvrir le
// dossier → » vient en dernier dans la rangée des liens de la carte, pour les quatre issues ; il
// quitte « Détail des prix » (un seul endroit) ; aucun bouton plein de plus.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined }),
  usePathname: () => '/suivi',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/features/meeting-conclusion/actions/conclude-meeting', () => ({}));
const { SuiviRow } = await import('@/features/meeting-conclusion/components/suivi-row');
const { SuiviLeadProvider } = await import('@/features/meeting-conclusion/components/suivi-lead');

const PROJECT = '0ccccccc-0000-4000-8000-000000000160';

const card = (
  outcome: 'signed' | 'follow_up' | 'sold_elsewhere' | 'withdrawn',
  panel?: 'details',
  options: { example?: boolean; dueButton?: boolean } = {},
) =>
  renderToStaticMarkup(
    createElement(
      SuiviLeadProvider,
      // La carte mène l'écran : son étape due porte le seul bouton plein (M146).
      { dueIds: options.dueButton ? [PROJECT] : [] } as Parameters<typeof SuiviLeadProvider>[0],
      createElement(SuiviRow, {
        dossier: {
          project: {
            id: PROJECT,
            seller_name: 'M. Lefebvre',
            is_example: options.example ?? false,
          },
          property: null,
          conclusion: { outcome, concludedAt: '2026-10-18T10:00:00Z', mandateType: 'exclusive' },
        } as never,
        followUp: { contacts: [], message: null, sellerSaid: null } as never,
        step: {
          when: 'aujourd’hui',
          whenLate: false,
          title: 'Prochaine étape',
          phrase: '',
          button: options.dueButton
            ? { label: 'Faire le point marché', action: { kind: 'market_update' }, primary: true }
            : null,
        },
        frieze: null,
        ...(panel ? { initialPanel: panel as never } : {}),
      }),
    ),
  );

const linksOf = (html: string) =>
  [...html.matchAll(/data-testid="suivi-links"[\s\S]*?<\/div>/g)][0]?.[0] ?? '';

describe('la carte du Suivi : un accès direct au dossier', () => {
  for (const outcome of ['signed', 'follow_up', 'sold_elsewhere', 'withdrawn'] as const) {
    it(`${outcome} : le nom du vendeur mène à la Vue d’ensemble`, () => {
      const html = card(outcome);
      const name = html.match(/<a[^>]*data-testid="suivi-seller-link"[^>]*>([^<]*)<\/a>/);
      expect(name?.[1]).toBe('M. Lefebvre');
      expect(name?.[0]).toContain(`href="/builder/${PROJECT}"`);
      expect(html).toContain('aria-label="Ouvrir le dossier de M. Lefebvre"');
    });

    it(`${outcome} : « Ouvrir le dossier → » en dernier dans la rangée des liens`, () => {
      const links = linksOf(card(outcome));
      expect(links).toMatch(/Ouvrir le dossier <span aria-hidden="true">→<\/span><\/a><\/div>$/);
      expect(links.lastIndexOf('Ouvrir le dossier')).toBeGreaterThan(
        links.lastIndexOf('Détail des prix'),
      );
      expect(links).toContain(`href="/builder/${PROJECT}"`);
    });
  }

  it('« Ouvrir le dossier » quitte « Détail des prix » : un seul endroit', () => {
    const html = card('signed', 'details');
    // Le texte visible une seule fois (le nom porte, lui, un libellé accessible).
    expect(html.match(/>Ouvrir le dossier/g)).toHaveLength(1);
  });

  it('aucun bouton plein de plus : l’étape due garde le seul plein de la carte', () => {
    const html = card('signed', undefined, { dueButton: true });
    expect(html.match(/btn-filled/g)).toHaveLength(1);
    expect(html).toMatch(/btn-filled[^>]*>Faire le point marché</);
  });

  it('le dossier d’exemple compris', () => {
    const html = card('follow_up', undefined, { example: true });
    expect(html).toMatch(/data-testid="suivi-seller-link"[^>]*>M\. Lefebvre</);
    expect(html).toContain('data-testid="suivi-open-project"');
  });
});
