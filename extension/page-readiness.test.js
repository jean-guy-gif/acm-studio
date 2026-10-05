import { describe, expect, it } from 'vitest';

import {
  SIZE_FLOOR,
  decideOpenTab,
  isAllowedUrl,
  isSearchTabUrl,
  isStableSize,
  isWaitingShell,
  listSearchTabs,
  urlsToOpen,
} from './page-readiness.js';

// These guard the two defects the extension shipped to production:
//   - 10 September 2026: a background tab that never built, returning its shell;
//   - 16 September 2026: a STABLE shell (« Un instant… », 29 k) taken for a finished
//     page — « Un instant… » landed in a competitor's Titre.

describe('isWaitingShell (plancher + titres d’attente)', () => {
  it('refuse une coquille de 29 000 caractères (sous le plancher de 60 000)', () => {
    // maisonsetappartements.fr, mesuré le 2026-09-16 : la coquille faisait ~29 k.
    expect(isWaitingShell({ size: 29_000, title: 'Villeneuve-Loubet - Appartement' })).toBe(true);
  });

  it('accepte une vraie fiche de 235 000 caractères', () => {
    // Même page, une fois rendue : 235 k, titre réel de l’annonce.
    expect(
      isWaitingShell({ size: 235_000, title: 'Villeneuve-Loubet - Appartement à vendre - 68 m²' }),
    ).toBe(false);
  });

  it('refuse le titre « Un instant… » quelle que soit la taille (maisonsetappartements.fr, 2026-09-16)', () => {
    expect(isWaitingShell({ size: 500_000, title: 'Un instant…' })).toBe(true);
    expect(isWaitingShell({ size: 29_000, title: 'Un instant…' })).toBe(true);
  });

  it('accepte une page juste au-dessus du plancher avec un vrai titre', () => {
    expect(isWaitingShell({ size: SIZE_FLOOR + 1, title: 'Annonce' })).toBe(false);
  });
});

describe('isAllowedUrl (jumeau des host_permissions)', () => {
  it('accepte les quatre portails retenus en https', () => {
    for (const url of [
      'https://www.seloger.com/annonces/x',
      'https://www.bienici.com/annonce/x',
      'https://www.green-acres.fr/fr/properties/x',
      'https://www.maisonsetappartements.fr/ads/4534734',
    ]) {
      expect(isAllowedUrl(url)).toBe(true);
    }
  });

  it('refuse une adresse hors des portails retenus', () => {
    expect(isAllowedUrl('https://example.com/annonce/1')).toBe(false);
  });

  it('refuse leboncoin.fr (robots.txt interdit /ad/ — jamais supporté)', () => {
    expect(isAllowedUrl('https://www.leboncoin.fr/ad/ventes_immobilieres/1')).toBe(false);
  });

  it('refuse le non-https et une adresse invalide', () => {
    expect(isAllowedUrl('http://www.seloger.com/annonces/x')).toBe(false);
    expect(isAllowedUrl('pas une url')).toBe(false);
  });
});

describe('isStableSize', () => {
  it('la première lecture (sans précédent) n’est jamais stable', () => {
    expect(isStableSize(null, 29_000)).toBe(false);
  });

  it('deux lectures à moins de 2 % sont stables', () => {
    expect(isStableSize(235_339, 235_373)).toBe(true);
  });

  it('un saut coquille → page réelle n’est pas stable', () => {
    expect(isStableSize(29_152, 235_339)).toBe(false);
  });
});

// Mission 65 — « Lire ma recherche » : quel onglet ouvert lire, sans jamais deviner.
describe('isSearchTabUrl (onglet de résultats d’un portail lisible)', () => {
  it('accepte les pages de résultats des quatre portails', () => {
    for (const url of [
      'https://www.seloger.com/classified-search?distributionTypes=Buy&estateTypes=Apartment',
      'https://www.bienici.com/recherche/achat/nice-06000/appartement/4-pieces?prix-min=400000',
      'https://www.green-acres.fr/maison-a-vendre?searchQuery=cn-fr-lg-fr-city_id-gr_3668',
      'https://www.maisonsetappartements.fr/views/Search.php?lang=fr&TypeAnnonce=VEN&nb_piece=4',
    ]) {
      expect(isSearchTabUrl(url)).toBe(true);
    }
  });

  it('refuse une fiche d’annonce, l’accueil d’un portail et un site hors portails', () => {
    for (const url of [
      'https://www.seloger.com/annonces/achat/appartement/nice-06/riquier/268299919.htm',
      'https://www.bienici.com/annonce/vente/nice/appartement/4pieces/apimo-87037164',
      'https://www.green-acres.fr/fr/properties/appartement/nice/A7zuht59kaufm0za.htm',
      'https://www.maisonsetappartements.fr/views/ficheAnnonce.php?IdAnnonce=4241266',
      'https://www.maisonsetappartements.fr/ads/4534734',
      'https://www.seloger.com/',
      'https://immobilier.lefigaro.fr/annonces/immobilier-vente-appartement-nice.html',
      'https://www.leboncoin.fr/recherche?category=9',
      'https://example.com/recherche',
      'http://www.seloger.com/classified-search',
      'pas une url',
    ]) {
      expect(isSearchTabUrl(url)).toBe(false);
    }
  });
});

describe('decideOpenTab (aucun, un, plusieurs)', () => {
  const seloger = {
    id: 11,
    title: 'Appartements à vendre – Nice',
    url: 'https://www.seloger.com/classified-search?estateTypes=Apartment',
  };
  const bienici = {
    id: 12,
    title: 'Achat immobilier Nice (06)',
    url: 'https://www.bienici.com/recherche/achat/nice-06000/appartement/4-pieces',
  };
  const annonce = {
    id: 13,
    title: 'Appartement 4 pièces',
    url: 'https://www.bienici.com/annonce/vente/nice/appartement/4pieces/apimo-87037164',
  };
  const autre = { id: 14, title: 'Boîte de réception', url: 'https://mail.example.com/inbox' };

  it('aucun onglet de recherche → none (une fiche d’annonce ou un autre site ne comptent pas)', () => {
    expect(decideOpenTab([])).toEqual({ kind: 'none' });
    expect(decideOpenTab(undefined)).toEqual({ kind: 'none' });
    expect(decideOpenTab([annonce, autre])).toEqual({ kind: 'none' });
  });

  it('un seul onglet de recherche → on le lit', () => {
    expect(decideOpenTab([autre, seloger, annonce])).toEqual({
      kind: 'read',
      tab: { tabId: 11, title: seloger.title, url: seloger.url },
    });
  });

  it('plusieurs onglets de recherche → la liste, c’est le conseiller qui choisit', () => {
    expect(decideOpenTab([seloger, autre, bienici])).toEqual({
      kind: 'choose',
      tabs: [
        { tabId: 11, title: seloger.title, url: seloger.url },
        { tabId: 12, title: bienici.title, url: bienici.url },
      ],
    });
  });

  it('un onglet mis en veille par Chrome est ignoré : le lire le rechargerait', () => {
    expect(decideOpenTab([{ ...seloger, discarded: true }])).toEqual({ kind: 'none' });
    expect(decideOpenTab([{ ...seloger, discarded: true }, bienici]).kind).toBe('read');
  });
});

describe('listSearchTabs (mission 69 — tous les onglets de recherche)', () => {
  it('garde les recherches des portails lisibles, écarte fiches, autres sites et onglets en veille', () => {
    const tabs = [
      {
        id: 1,
        windowId: 9,
        title: 'SeLoger',
        url: 'https://www.seloger.com/classified-search?x=1',
      },
      { id: 2, windowId: 9, title: 'Fiche', url: 'https://www.bienici.com/annonce/vente/nice/a-1' },
      { id: 3, windowId: 9, title: 'Mail', url: 'https://mail.example.com/' },
      {
        id: 4,
        windowId: 9,
        title: 'Bien’ici',
        url: 'https://www.bienici.com/recherche/achat/nice-06000/appartement/4-pieces',
      },
      {
        id: 5,
        windowId: 9,
        title: 'En veille',
        url: 'https://www.green-acres.fr/maison-a-vendre?searchQuery=x',
        discarded: true,
      },
    ];
    expect(listSearchTabs(tabs).map((tab) => tab.tabId)).toEqual([1, 4]);
    expect(listSearchTabs(tabs)[1]).toEqual({
      tabId: 4,
      windowId: 9,
      title: 'Bien’ici',
      url: 'https://www.bienici.com/recherche/achat/nice-06000/appartement/4-pieces',
    });
  });
});

describe('urlsToOpen (mission 69 — « Ouvrir mes recherches »)', () => {
  const seloger = 'https://www.seloger.com/classified-search?locations=AD08FR2038';
  const bienici = 'https://www.bienici.com/recherche/achat/nice-06000/appartement/4-pieces';

  it('n’ouvre que des recherches de portails lisibles (jamais une autre adresse)', () => {
    expect(
      urlsToOpen(
        [
          seloger,
          'https://example.com/recherche',
          'https://www.bienici.com/annonce/vente/nice/a-1',
          'http://www.seloger.com/classified-search',
          42,
        ],
        [],
      ),
    ).toEqual([seloger]);
  });

  it('n’ouvre pas deux fois la même adresse, ni une adresse déjà ouverte', () => {
    expect(urlsToOpen([seloger, bienici, seloger], [{ url: bienici }])).toEqual([seloger]);
    expect(urlsToOpen(undefined, [])).toEqual([]);
  });
});
