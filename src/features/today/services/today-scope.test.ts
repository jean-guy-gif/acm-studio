import { describe, expect, it } from 'vitest';

import { showsAllBuyers } from '@/features/buyers/services/buyers-page';
import { allPeopleLabel, scopeFromQuery, withScope } from '@/features/today/services/today-scope';

// Remarques de Jean-Guy (26/11) — Vendeurs et Acquéreurs suivent la vue choisie.

describe('la vue des pages « à faire »', () => {
  it('« Toute l’agence » se demande par `?agence=1` ; sinon « Mes dossiers »', () => {
    expect(scopeFromQuery('1')).toBe('agency');
    expect(scopeFromQuery(undefined)).toBe('mine');
    expect(scopeFromQuery('oui')).toBe('mine');
  });

  it('chaque lien de la page garde la vue choisie', () => {
    expect(withScope('/vendeurs?vendeur=p1', 'agency')).toBe('/vendeurs?vendeur=p1&agence=1');
    expect(withScope('/acquereurs', 'agency')).toBe('/acquereurs?agence=1');
    expect(withScope('/builder/p1?tout=1#acquereurs', 'agency')).toBe(
      '/builder/p1?tout=1&agence=1#acquereurs',
    );
    expect(withScope('/vendeurs?vendeur=p1', 'mine')).toBe('/vendeurs?vendeur=p1');
  });

  it('le lien d’en bas dit ce qu’il compte', () => {
    expect(allPeopleLabel('vendeurs', 'mine')).toBe('Tous mes vendeurs');
    expect(allPeopleLabel('vendeurs', 'agency')).toBe('Tous les vendeurs de l’agence');
    expect(allPeopleLabel('acquéreurs', 'mine')).toBe('Tous mes acquéreurs');
    expect(allPeopleLabel('acquéreurs', 'agency')).toBe('Tous les acquéreurs de l’agence');
  });

  it('sur Acquéreurs, `?agence=1` garde « à faire aujourd’hui » ; `?vue=agence` ouvre la liste', () => {
    expect(showsAllBuyers({ agence: '1' })).toBe(false);
    expect(showsAllBuyers({ agence: '1', personne: 'b1' })).toBe(false);
    expect(showsAllBuyers({ vue: 'agence' })).toBe(true);
  });
});
