import { describe, expect, it } from 'vitest';

import {
  accountMenuFor,
  isNavItemActive,
  NAV_ITEMS,
  SELLER_TABS,
} from '@/features/workspace-mode/services/workspace-mode';

// La refonte, lot A (mission de Jean-Guy, 25/11 au soir) — un menu de quatre entrées, le même aux
// trois tailles ; Prospection et Aide s'y ajoutent quand la place le permet (remplace M145 B, les
// trois groupes, et M149, leurs titres).
describe('le menu de l’application', () => {
  it('Aujourd’hui · Vendeurs · Acquéreurs · Visites, à toutes les tailles', () => {
    expect(NAV_ITEMS.filter((item) => item.from === 'phone').map((item) => item.label)).toEqual([
      'Aujourd’hui',
      'Vendeurs',
      'Acquéreurs',
      'Visites',
    ]);
  });

  it('Aide à partir de la tablette, Prospection sur ordinateur ; les adresses ne changent pas', () => {
    expect(NAV_ITEMS.map((item) => [item.label, item.href, item.from])).toEqual([
      ['Aujourd’hui', '/aujourdhui', 'phone'],
      ['Vendeurs', '/builder', 'phone'],
      ['Acquéreurs', '/acquereurs', 'phone'],
      ['Visites', '/visites', 'phone'],
      ['Prospection', '/prospection', 'desktop'],
      ['Aide', '/bienvenue', 'tablet'],
    ]);
    // Aide est rangée en bas du menu, comme sur les maquettes.
    expect(NAV_ITEMS.filter((item) => item.pinned).map((item) => item.label)).toEqual(['Aide']);
  });

  it('« Vendeurs » tient Préparation, Live et Suivi : il les surligne tous les trois', () => {
    const sellers = NAV_ITEMS.find((item) => item.label === 'Vendeurs')!;
    for (const path of ['/builder', '/builder/abc/concurrents', '/live', '/suivi']) {
      expect(isNavItemActive(sellers, path), path).toBe(true);
    }
    for (const path of ['/acquereurs', '/builders', '/prospection', '/aujourdhui']) {
      expect(isNavItemActive(sellers, path), path).toBe(false);
    }
    // Une seule entrée surlignée par page.
    for (const path of ['/builder/abc', '/live', '/suivi', '/acquereurs/x', '/visites']) {
      expect(
        NAV_ITEMS.filter((item) => isNavItemActive(item, path)),
        path,
      ).toHaveLength(1);
    }
  });

  it('les trois espaces du vendeur restent des pages, jointes par leurs onglets', () => {
    expect(SELLER_TABS).toEqual([
      { href: '/builder', label: 'Préparation' },
      { href: '/live', label: 'Live' },
      { href: '/suivi', label: 'Suivi' },
    ]);
  });
});

// Mission 125 — le compte du conseiller : tout ce qui n'est pas le travail. La refonte y range
// aussi ce que le menu ne montre pas à cette taille.
describe('la feuille du compte', () => {
  const labels = (demo: boolean, operator: boolean) =>
    accountMenuFor({ demo, operator }).map((link) => link.label);

  it('Mon profil, Administration ; Ma démo à la démo ; Erreurs à un opérateur', () => {
    expect(labels(false, false)).toEqual(['Mon profil', 'Administration', 'Prospection', 'Aide']);
    expect(labels(true, false)).toEqual([
      'Mon profil',
      'Administration',
      'Prospection',
      'Aide',
      'Ma démo',
    ]);
    expect(labels(false, true)).toEqual([
      'Mon profil',
      'Administration',
      'Prospection',
      'Aide',
      'Erreurs',
    ]);
  });

  it('Prospection et Aide n’y sont que là où le menu ne les montre pas', () => {
    const byHref = new Map(accountMenuFor({ demo: true, operator: true }).map((l) => [l.href, l]));
    // Prospection : au menu à partir de 1280 px, donc dans la feuille en dessous.
    expect(byHref.get('/prospection')?.until).toBe('desktop');
    expect(NAV_ITEMS.find((item) => item.href === '/prospection')?.from).toBe('desktop');
    // Aide : au menu à partir de 768 px, donc dans la feuille en dessous.
    expect(byHref.get('/bienvenue')?.until).toBe('tablet');
    expect(NAV_ITEMS.find((item) => item.href === '/bienvenue')?.from).toBe('tablet');
    // Le reste n'est jamais au menu : toujours dans la feuille.
    for (const href of ['/profil', '/admin', '/ma-demo', '/erreurs']) {
      expect(byHref.get(href)?.until, href).toBeUndefined();
      expect(NAV_ITEMS.map((item) => item.href)).not.toContain(href);
    }
  });
});
