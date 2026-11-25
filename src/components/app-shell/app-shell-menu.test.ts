import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({ pathname: '/builder' }));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const { AccountMenu, AccountMenuEntries, ACCOUNT_MENU_LABEL } =
  await import('@/components/app-shell/account-menu');
const { accountMenuFor } = await import('@/features/workspace-mode/services/workspace-mode');
const { SidebarNav } = await import('@/components/app-shell/sidebar-nav');
const { ShellSidebar } = await import('@/components/app-shell/shell-sidebar');
const { PhoneAccount } = await import('@/components/app-shell/phone-account');
const { SellerTabs } = await import('@/components/app-shell/seller-tabs');
const { AppStage } = await import('@/components/theme/app-stage');
// Le compte lit le thème (Sombre / Clair) : rendu sous la scène, l'enfant passé en argument.
const Stage = AppStage as (props: {
  initialTheme: 'light' | 'dark';
  children?: ReactNode;
}) => ReactNode;

const links = (html: string): string[] =>
  [...html.matchAll(/<a [^>]*href="([^"]+)"/g)].map((match) => match[1]!);
// La balise <a> d'une adresse, avec ses classes.
const anchor = (html: string, href: string): string =>
  html.match(new RegExp(`<a [^>]*href="${href}"[^>]*>`))?.[0] ?? '';

const account = {
  profileName: 'Carl Conseiller',
  profileEmail: 'carl@example.org',
  agencyName: 'Agence Test',
  signOutAction: async () => {},
};
const card = (props: Partial<Parameters<typeof AccountMenu>[0]> = {}) =>
  renderToStaticMarkup(
    createElement(
      Stage,
      { initialTheme: 'light' },
      createElement(AccountMenu, { ...account, ...props }),
    ),
  );

// La refonte, lot A — UNE navigation, la même aux trois tailles (maquettes REFONTE-1, 5 et 6).
describe('le menu de l’application', () => {
  beforeEach(() => {
    nav.pathname = '/builder';
  });

  it('Aujourd’hui · Vendeurs · Acquéreurs · Visites, puis Prospection et Aide : une seule navigation', () => {
    const html = renderToStaticMarkup(createElement(SidebarNav));
    expect(html.match(/<nav /g)).toHaveLength(1);
    expect(html).toContain('aria-label="Menu principal"');
    expect(links(html)).toEqual([
      '/aujourdhui',
      '/builder',
      '/acquereurs',
      '/visites',
      '/prospection',
      '/bienvenue',
    ]);
    for (const label of [
      'Aujourd’hui',
      'Vendeurs',
      'Acquéreurs',
      'Visites',
      'Prospection',
      'Aide',
    ]) {
      expect(html).toContain(`<span>${label}</span>`);
    }
    // Plus de groupes, plus d'interrupteur, et rien du compte.
    expect(html).not.toMatch(/nav-group|workspace-switch|Préparation|Les deux/);
    expect(html).not.toMatch(/Administration|Ma démo|Erreurs|Mon profil/);
  });

  it('quatre entrées sur téléphone ; Aide à partir de 768 px, en bas ; Prospection à partir de 1280 px', () => {
    const html = renderToStaticMarkup(createElement(SidebarNav));
    for (const href of ['/aujourdhui', '/builder', '/acquereurs', '/visites']) {
      expect(anchor(html, href), href).toMatch(/class="flex /);
      expect(anchor(html, href), href).not.toMatch(/class="hidden /);
    }
    expect(anchor(html, '/bienvenue')).toMatch(/class="hidden md:flex /);
    expect(anchor(html, '/bienvenue')).toContain('md:mt-auto');
    expect(anchor(html, '/prospection')).toMatch(/class="hidden xl:flex /);
    // En bas sur téléphone (quatre colonnes), en colonne à partir de 768 px.
    expect(html).toMatch(
      /<nav [^>]*class="grid h-\[72px\] grid-cols-4 [^"]*md:flex[^"]*md:flex-col/,
    );
    // Dans la colonne, chaque entrée prend toute la largeur : les icônes s'alignent.
    expect(html).toMatch(/<nav [^>]*class="[^"]*md:items-stretch/);
  });

  it('« Vendeurs » surligne Préparation, Live et Suivi', () => {
    for (const pathname of ['/builder', '/builder/abc/avant-rendez-vous', '/live', '/suivi']) {
      nav.pathname = pathname;
      const html = renderToStaticMarkup(createElement(SidebarNav));
      expect(html.match(/aria-current="page"/g), pathname).toHaveLength(1);
      expect(anchor(html, '/builder'), pathname).toContain('aria-current="page"');
    }
  });

  it('la pastille d’Aujourd’hui ne s’affiche pas tant que la page n’a rien dit', () => {
    nav.pathname = '/aujourdhui';
    const html = renderToStaticMarkup(createElement(SidebarNav));
    expect(anchor(html, '/aujourdhui')).toContain('aria-current="page"');
    expect(html).not.toContain('today-count');
  });

  it('une page du compte ne surligne aucune entrée ; « Aide » surligne la sienne', () => {
    for (const pathname of ['/admin', '/admin/equipe', '/profil', '/ma-demo', '/erreurs']) {
      nav.pathname = pathname;
      expect(renderToStaticMarkup(createElement(SidebarNav)), pathname).not.toContain(
        'aria-current',
      );
    }
    nav.pathname = '/bienvenue';
    expect(anchor(renderToStaticMarkup(createElement(SidebarNav)), '/bienvenue')).toContain(
      'aria-current="page"',
    );
  });
});

describe('le compte du conseiller', () => {
  it('un bouton fermé, au libellé accessible, qui dit nom, e-mail et agence', () => {
    const html = card();
    expect(html).toContain(`aria-label="${ACCOUNT_MENU_LABEL}"`);
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('data-testid="account-card"');
    for (const text of ['Carl Conseiller', 'carl@example.org', 'Agence Test']) {
      expect(html).toContain(text);
    }
    expect(html).not.toContain('role="menu"');
  });

  it('sur tablette, un rond à ses initiales ; sur ordinateur, sa carte', () => {
    const html = card();
    // Le rond, caché à partir de 1280 px ; le nom, l'e-mail et l'agence, montrés à partir de là.
    expect(html).toMatch(
      /<span aria-hidden="true" class="[^"]*rounded-full[^"]*xl:hidden[^"]*">CC</,
    );
    expect(html).toMatch(/<span class="hidden [^"]*xl:flex">/);
  });

  it('sur téléphone, le rond seul, sous un autre repère', () => {
    const html = card({ variant: 'avatar' });
    expect(html).toContain('data-testid="account-avatar"');
    expect(html).not.toContain('data-testid="account-card"');
    expect(html).toContain(`aria-label="${ACCOUNT_MENU_LABEL}"`);
    expect(html).toContain('>CC<');
    expect(html).not.toContain('carl@example.org');
  });

  it('la pastille des erreurs : pour un opérateur, et seulement s’il y en a', () => {
    expect(card()).not.toContain('account-errors-badge');
    expect(card({ errorsBadge: { count: 0, label: '0 erreur depuis hier' } })).not.toContain(
      'account-errors-badge',
    );
    const html = card({ errorsBadge: { count: 3, label: '3 erreurs depuis hier' } });
    expect(html).toContain('data-testid="account-errors-badge"');
    expect(html).toContain('title="3 erreurs depuis hier"');
    // Sur téléphone, un repère à part : jamais deux fois le même sur la page d'« Aujourd'hui ».
    const phone = card({
      variant: 'avatar',
      errorsBadge: { count: 3, label: '3 erreurs depuis hier' },
    });
    expect(phone).toContain('data-testid="account-avatar-errors-badge"');
    expect(phone).not.toContain('data-testid="account-errors-badge"');
  });
});

// La feuille ouverte : « Erreurs » et sa pastille pour un opérateur ; ni l'un ni l'autre pour un
// conseiller (le layout ne transmet la pastille qu'aux opérateurs, M100).
describe('la feuille ouverte du compte', () => {
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
    expect(links(html)).toEqual(['/profil', '/admin', '/prospection', '/bienvenue']);
    expect(html).not.toContain('Erreurs');
    expect(html).not.toContain('account-errors-label');
    for (const label of ['Sombre', 'Déconnexion']) expect(html).toContain(label);
  });

  it('Prospection s’efface à partir de 1280 px, Aide à partir de 768 px : le menu les montre', () => {
    const html = entries(false, null);
    expect(anchor(html, '/prospection')).toContain('xl:hidden');
    expect(anchor(html, '/bienvenue')).toContain('md:hidden');
    for (const href of ['/profil', '/admin']) {
      expect(anchor(html, href), href).not.toMatch(/md:hidden|xl:hidden/);
    }
  });
});

// Le cadre aux trois tailles : en bas sur téléphone (remplace M132, la barre du haut et ☰), une
// colonne d'icônes à partir de 768 px, le menu complet à partir de 1280 px.
describe('le menu aux trois tailles', () => {
  const shell = () =>
    renderToStaticMarkup(
      createElement(
        Stage,
        { initialTheme: 'light' },
        createElement(ShellSidebar, {
          ...account,
          logoLightUrl: null,
          logoDarkUrl: null,
          errorsBadge: null,
          demoEntry: false,
        }),
      ),
    );

  it('fixé en bas sur téléphone, en colonne à gauche à partir de 768 px ; plus de ☰', () => {
    const html = shell();
    const aside = html.match(/<aside data-testid="shell-menu" class="([^"]+)"/)?.[1] ?? '';
    expect(aside).toMatch(/^fixed inset-x-0 bottom-0 /);
    expect(aside).toContain('md:sticky');
    expect(aside).toContain('md:h-screen');
    expect(aside).toContain('md:w-[var(--shell-left)]');
    // Jamais à l'impression.
    expect(aside).toContain('print:hidden');
    expect(html).not.toMatch(/mobile-menu-toggle|shell-menu-panel|mobile-today-count|☰/);
  });

  it('le logo de l’agence sur ordinateur seulement ; le compte à partir de 768 px', () => {
    const html = shell();
    expect(html).toMatch(/<div class="hidden [^"]*xl:block">[\s\S]*Agence Test/);
    expect(html).toMatch(/<div class="hidden md:block"><div class="relative"><button/);
    expect(links(html)).toEqual([
      '/aujourdhui',
      '/builder',
      '/acquereurs',
      '/visites',
      '/prospection',
      '/bienvenue',
    ]);
  });

  it('sur téléphone, le compte s’ouvre en haut d’« Aujourd’hui », et nulle part ailleurs', () => {
    const phone = () =>
      renderToStaticMarkup(
        createElement(
          Stage,
          { initialTheme: 'light' },
          createElement(PhoneAccount, { ...account, errorsBadge: null, demoEntry: false }),
        ),
      );
    nav.pathname = '/aujourdhui';
    expect(phone()).toMatch(/<div class="[^"]*md:hidden" data-testid="phone-account">/);
    expect(phone()).toContain('data-testid="account-avatar"');
    for (const pathname of ['/acquereurs', '/builder', '/visites', '/aujourdhui/x']) {
      nav.pathname = pathname;
      expect(phone(), pathname).not.toMatch(/account-avatar|phone-account/);
    }
  });
});

describe('les onglets du vendeur', () => {
  it('Préparation · Live · Suivi, des liens ; l’onglet de la page est dit', () => {
    for (const current of ['/builder', '/live', '/suivi'] as const) {
      const html = renderToStaticMarkup(createElement(SellerTabs, { current }));
      expect(html).toContain('aria-label="Vendeurs"');
      expect(links(html)).toEqual(['/builder', '/live', '/suivi']);
      expect(html.match(/aria-current="page"/g), current).toHaveLength(1);
      expect(anchor(html, current), current).toContain('aria-current="page"');
      // Des onglets, jamais un bouton plein de plus (M146).
      expect(html).not.toContain('btn-filled');
    }
  });
});
