import { describe, expect, it } from 'vitest';

import {
  ALL_BUYERS_HREF,
  allBuyersSearch,
  showsAllBuyers,
} from '@/features/buyers/services/buyers-page';

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

  // Relecture du lot B — vider la recherche ou revenir à « Mes fiches » ramenait l'adresse à
  // `/acquereurs` : une actualisation ouvrait « à faire aujourd'hui » à la place de la liste.
  it('la liste garde son adresse : sans vue, filtre ni recherche, « tous=1 » reste', () => {
    const plain = { view: 'mine', filter: 'all', query: '' } as const;
    const listed = (search: string) =>
      showsAllBuyers(Object.fromEntries(new URLSearchParams(search)));
    // Arrivé par « Tous mes acquéreurs », un filtre posé puis retiré.
    const filtered = allBuyersSearch('?tous=1', { ...plain, filter: 'ready' });
    expect(new URLSearchParams(filtered).get('etat')).toBe('ready');
    expect(listed(allBuyersSearch(`?${filtered}`, plain))).toBe(true);
    // Arrivé par un lien d'avant (`?vue=agence&q=rossi`), tout remis par défaut.
    const back = allBuyersSearch('?vue=agence&q=rossi', plain);
    expect(back).toBe('tous=1');
    expect(listed(back)).toBe(true);
    // La recherche vidée : des espaces ne sont pas une recherche.
    expect(allBuyersSearch('?q=kel', { ...plain, query: '   ' })).toBe('tous=1');
    // La vue, le filtre et la recherche se lisent toujours dans l'adresse (un lien envoyé).
    const sent = new URLSearchParams(
      allBuyersSearch('?tous=1', { view: 'agency', filter: 'under_offer', query: ' Keller ' }),
    );
    expect([sent.get('vue'), sent.get('etat'), sent.get('q')]).toEqual([
      'agence',
      'under_offer',
      'Keller',
    ]);
    // L'avis d'une fiche archivée désigne déjà la liste : rien n'est ajouté.
    expect(allBuyersSearch('?archive=Famille+Keller', plain)).toBe('archive=Famille+Keller');
  });
});
