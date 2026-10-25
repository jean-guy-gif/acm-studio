import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({ pathname: '/builder' }));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('@/features/workspace-mode/actions/set-workspace-mode', () => ({
  setWorkspaceMode: vi.fn(),
}));

const { AccountMenu, AccountMenuEntries, ACCOUNT_MENU_LABEL } =
  await import('@/components/app-shell/account-menu');
const { accountMenuFor } = await import('@/features/workspace-mode/services/workspace-mode');
const { SidebarNav } = await import('@/components/app-shell/sidebar-nav');
const { AppStage } = await import('@/components/theme/app-stage');
// La carte lit le thème (Sombre / Clair) : rendue sous la scène, l'enfant passé en argument.
const Stage = AppStage as (props: {
  initialTheme: 'light' | 'dark';
  children?: ReactNode;
}) => ReactNode;

const links = (html: string): string[] =>
  [...html.matchAll(/<a [^>]*href="([^"]+)"/g)].map((match) => match[1]!);

const card = (props: Partial<Parameters<typeof AccountMenu>[0]> = {}) =>
  renderToStaticMarkup(
    createElement(
      Stage,
      { initialTheme: 'light' },
      createElement(AccountMenu, {
        profileName: 'Carl Conseiller',
        profileEmail: 'carl@example.org',
        agencyName: 'Agence Test',
        signOutAction: async () => {},
        ...props,
      }),
    ),
  );

// Mission 125 — le menu de gauche ne montre que le travail ; le reste est derrière la carte.
describe('le menu de gauche', () => {
  beforeEach(() => {
    nav.pathname = '/builder';
  });

  it('mode Vendeur : les quatre espaces, rien d’autre', () => {
    const html = renderToStaticMarkup(createElement(SidebarNav, { workspaceMode: 'seller' }));
    expect(links(html)).toEqual(['/builder', '/live', '/suivi', '/prospection']);
    expect(html).not.toMatch(/Administration|Aide|Ma démo|Erreurs|Mon profil/);
  });

  it('mode Acquéreur : les quatre espaces, rien d’autre', () => {
    nav.pathname = '/acquereurs';
    const html = renderToStaticMarkup(createElement(SidebarNav, { workspaceMode: 'buyer' }));
    expect(links(html)).toEqual(['/acquereurs', '/biens-ideaux', '/visites', '/prospection']);
  });

  it('une page du menu de la carte ne surligne aucun des quatre espaces', () => {
    for (const pathname of [
      '/admin',
      '/admin/equipe',
      '/bienvenue',
      '/profil',
      '/ma-demo',
      '/erreurs',
    ]) {
      nav.pathname = pathname;
      const html = renderToStaticMarkup(createElement(SidebarNav, { workspaceMode: 'seller' }));
      expect(html).not.toContain('aria-current="page"');
    }
  });
});

describe('la carte du conseiller', () => {
  it('un bouton fermé, au libellé accessible, qui dit nom, e-mail et agence', () => {
    const html = card();
    expect(html).toContain(`aria-label="${ACCOUNT_MENU_LABEL}"`);
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-expanded="false"');
    for (const text of ['Carl Conseiller', 'carl@example.org', 'Agence Test']) {
      expect(html).toContain(text);
    }
    expect(html).not.toContain('role="menu"');
  });

  it('la pastille des erreurs : pour un opérateur, et seulement s’il y en a', () => {
    expect(card()).not.toContain('account-errors-badge');
    expect(card({ errorsBadge: { count: 0, label: '0 erreur depuis hier' } })).not.toContain(
      'account-errors-badge',
    );
    const html = card({ errorsBadge: { count: 3, label: '3 erreurs depuis hier' } });
    expect(html).toContain('data-testid="account-errors-badge"');
    expect(html).toContain('title="3 erreurs depuis hier"');
  });
});

// Le menu ouvert : « Erreurs » et sa pastille pour un opérateur ; ni l'un ni l'autre pour un
// conseiller (le layout ne transmet la pastille qu'aux opérateurs, M100).
describe('le menu ouvert de la carte', () => {
  const entries = (operator: boolean, errorsBadge: { count: number; label: string } | null) =>
    renderToStaticMarkup(
      createElement(AccountMenuEntries, {
        links: accountMenuFor({ demo: false, operator }),
        pathname: '/builder',
        errorsBadge,
        themeLabel: 'Sombre',
        onLink: () => {},
        onTheme: () => {},
        signOutAction: async () => {},
      }),
    );

  it('un opérateur : « Erreurs », avec la pastille à côté', () => {
    const html = entries(true, { count: 2, label: '2 erreurs depuis hier' });
    expect(links(html)).toContain('/erreurs');
    expect(html).toMatch(
      /href="\/erreurs"[^>]*>.*Erreurs.*data-testid="account-errors-label"[^>]*>2 erreurs depuis hier</,
    );
  });

  it('un opérateur sans erreur depuis hier : « Erreurs », sans pastille', () => {
    const html = entries(true, { count: 0, label: '0 erreur depuis hier' });
    expect(links(html)).toContain('/erreurs');
    expect(html).not.toContain('account-errors-label');
  });

  it('un conseiller : ni « Erreurs », ni pastille', () => {
    const html = entries(false, null);
    expect(links(html)).toEqual(['/profil', '/admin', '/bienvenue']);
    expect(html).not.toContain('Erreurs');
    expect(html).not.toContain('account-errors-label');
    for (const label of ['Sombre', 'Déconnexion']) expect(html).toContain(label);
  });
});
