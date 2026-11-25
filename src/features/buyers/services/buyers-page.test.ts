import { describe, expect, it } from 'vitest';

import { ALL_BUYERS_HREF, showsAllBuyers } from '@/features/buyers/services/buyers-page';

// La refonte, lot B — « à faire aujourd'hui » en tête d'Acquéreurs ; la liste entière derrière
// « Tous mes acquéreurs ».
describe('Acquéreurs : « à faire aujourd’hui », ou la liste entière', () => {
  it('sans rien dans l’adresse, ou avec la seule personne choisie : « à faire aujourd’hui »', () => {
    expect(showsAllBuyers({})).toBe(false);
    expect(showsAllBuyers({ personne: '8f1c' })).toBe(false);
  });

  it('« Tous mes acquéreurs » ouvre la liste', () => {
    const query = Object.fromEntries(new URL(ALL_BUYERS_HREF, 'https://acm.test').searchParams);
    expect(new URL(ALL_BUYERS_HREF, 'https://acm.test').pathname).toBe('/acquereurs');
    expect(showsAllBuyers(query)).toBe(true);
  });

  it('un lien d’avant mène toujours à la liste : vue, filtre, recherche, fiche archivée', () => {
    for (const query of [
      { vue: 'agence' },
      { etat: 'ready' },
      { q: 'rossi' },
      { q: '' },
      { archive: 'Famille Keller' },
      { vue: 'agence', q: 'keller', personne: 'x' },
    ]) {
      expect(showsAllBuyers(query), JSON.stringify(query)).toBe(true);
    }
  });
});
