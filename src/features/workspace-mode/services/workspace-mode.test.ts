import { describe, expect, it } from 'vitest';

import {
  accountMenuFor,
  NAV_GROUPS,
  NAV_ITEMS,
} from '@/features/workspace-mode/services/workspace-mode';

// Mission 145 (partie B) — un seul menu en trois groupes, sans interrupteur Vendeur | Acquéreur
// (remplace M118) : Aujourd'hui en tête, puis Vendeurs, Acquéreurs, et Prospection sous « Les deux ».
describe('le menu de gauche', () => {
  it('Aujourd’hui · Vendeurs · Acquéreurs · Les deux', () => {
    expect(NAV_GROUPS.map((group) => [group.label, group.items.map((item) => item.label)])).toEqual(
      [
        [null, ['Aujourd’hui']],
        ['Vendeurs', ['Préparation', 'Live', 'Suivi']],
        ['Acquéreurs', ['Acquéreurs', 'Visites']],
        ['Les deux', ['Prospection']],
      ],
    );
  });

  it('les adresses ne changent pas, Prospection une seule fois', () => {
    expect(NAV_ITEMS.map((item) => item.href)).toEqual([
      '/aujourdhui',
      '/builder',
      '/live',
      '/suivi',
      '/acquereurs',
      '/visites',
      '/prospection',
    ]);
  });

  // Mission 125 — le menu de la carte du conseiller : tout ce qui n'est pas le travail.
  it('la carte : Mon profil, Administration, Aide ; Ma démo à la démo ; Erreurs à un opérateur', () => {
    const labels = (demo: boolean, operator: boolean) =>
      accountMenuFor({ demo, operator }).map((link) => link.label);
    expect(labels(false, false)).toEqual(['Mon profil', 'Administration', 'Aide']);
    expect(labels(true, false)).toEqual(['Mon profil', 'Administration', 'Aide', 'Ma démo']);
    expect(labels(false, true)).toEqual(['Mon profil', 'Administration', 'Aide', 'Erreurs']);
    expect(accountMenuFor({ demo: true, operator: true }).map((link) => link.href)).toEqual([
      '/profil',
      '/admin',
      '/bienvenue',
      '/ma-demo',
      '/erreurs',
    ]);
  });

  it('aucune entrée de la carte n’est un espace du menu', () => {
    const spaces = NAV_ITEMS.map((item) => item.href);
    for (const link of accountMenuFor({ demo: true, operator: true })) {
      expect(spaces).not.toContain(link.href);
    }
  });
});
