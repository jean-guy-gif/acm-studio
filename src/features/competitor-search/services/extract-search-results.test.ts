import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  candidateSignature,
  detectSearchPortal,
  extractSearchResults,
  filterAndDedupeCandidates,
} from '@/features/competitor-search/services/extract-search-results';
import type { CompetitorCandidate, SearchPortal } from '@/features/competitor-search/types';

// Mission 50 — on extrait par le MARQUEUR DE CARTE du portail, jamais par la forme
// de l'adresse. Les fixtures sont des pages de résultats RÉELLES (Nice), capturées
// par l'extension, jamais recopiées à la main.
const DIR = join(__dirname, '..', '__fixtures__');

const PAGES: Record<SearchPortal, { file: string; url: string; count: number }> = {
  seloger: {
    file: 'seloger-resultats-nice.html',
    url: 'https://www.seloger.com/recherche/achat/appartement/provence-alpes-cote-d-azur/nice-06000/ad08fr2038',
    count: 30,
  },
  bienici: {
    file: 'bienici-resultats-nice.html',
    url: 'https://www.bienici.com/recherche/achat/nice-06000/appartement',
    count: 26,
  },
  green_acres: {
    // La page que notre constructeur fetch réellement : /immobilier/nice (H1 trompeur
    // « 1 576 maisons à vendre », mais 19 appartements / 4 maisons / 1 parking sur 24).
    file: 'green-acres-resultats-nice.html',
    url: 'https://www.green-acres.fr/immobilier/nice',
    count: 24,
  },
  maisons_appartements: {
    file: 'maisons-et-appartements-resultats-nice.html',
    url: 'https://www.maisonsetappartements.fr/views/Search.php',
    count: 17,
  },
};

function load(portal: SearchPortal): CompetitorCandidate[] {
  const { file, url } = PAGES[portal];
  const html = readFileSync(join(DIR, file), 'utf8');
  return extractSearchResults(html, url, portal);
}

describe('detectSearchPortal', () => {
  it('maps hosts to portals', () => {
    expect(detectSearchPortal('www.green-acres.fr')).toBe('green_acres');
    expect(detectSearchPortal('www.seloger.com')).toBe('seloger');
    expect(detectSearchPortal('selogerneuf.com')).toBe('seloger');
    expect(detectSearchPortal('www.bienici.com')).toBe('bienici');
    expect(detectSearchPortal('www.maisonsetappartements.fr')).toBe('maisons_appartements');
    // Figaro retiré : ses hôtes ne sont plus reconnus par la recherche.
    expect(detectSearchPortal('immobilier.lefigaro.fr')).toBeNull();
    expect(detectSearchPortal('example.com')).toBeNull();
  });
});

// §11.1 — le nombre de cartes lues vaut la taille de page mesurée, sur deux villes.
describe('extractSearchResults — nombre de cartes = taille de page mesurée', () => {
  it.each(Object.entries(PAGES))('%s : lit exactement le bon nombre de cartes', (portal) => {
    const cards = load(portal as SearchPortal);
    expect(cards).toHaveLength(PAGES[portal as SearchPortal].count);
  });
});

// §11.2 — aucune carte n'est un lien de navigation vers une commune voisine : chaque
// carte porte une clé publiée par le portail et une URL d'annonce, pas un lien de
// recherche « (N annonces) ».
describe('extractSearchResults — chaque carte est une annonce, pas un lien de navigation', () => {
  it.each(Object.keys(PAGES) as SearchPortal[])(
    '%s : clé + URL d’annonce sur chaque carte',
    (portal) => {
      const cards = load(portal);
      for (const card of cards) {
        expect(card.key).toBeTruthy();
        expect(card.url).toMatch(/^https?:\/\//);
        // Pas un lien de recherche/navigation vers une commune.
        expect(card.url).not.toMatch(/\(\d+\s*annonces?\)/i);
        expect(card.url).not.toContain('/recherche/');
      }
    },
  );

  it('SeLoger : 33 conteneurs mais 30 cartes — sponsorisé et suggestions écartés', () => {
    // Le marqueur `serp-core-classified-card-testid` sépare les 30 vraies cartes du
    // top-position et des 2 suggestions ; les clés sont toutes distinctes.
    const cards = load('seloger');
    const keys = new Set(cards.map((card) => card.key));
    expect(keys.size).toBe(30);
  });
});

// §11.6 — une carte sans prix ni surface ne fait pas échouer la lecture des autres.
describe('extractSearchResults — lecture robuste des champs', () => {
  it('SeLoger : prix, surface et pièces lus sur la majorité des cartes', () => {
    const cards = load('seloger');
    expect(cards.filter((c) => c.price != null).length).toBeGreaterThanOrEqual(25);
    expect(cards.filter((c) => c.surfaceArea != null).length).toBeGreaterThanOrEqual(25);
    expect(cards.every((c) => c.city != null)).toBe(true);
  });

  it('Bien’ici : prix ET prix au m² sur les 26 cartes (mesuré 26/26)', () => {
    const cards = load('bienici');
    expect(cards.filter((c) => c.price != null)).toHaveLength(26);
    expect(cards.filter((c) => c.pricePerSqm != null)).toHaveLength(26);
  });

  it('Green Acres : prix au m² sur les 24 cartes (mesuré 24/24), URL décodée de data-o', () => {
    const cards = load('green_acres');
    expect(cards.filter((c) => c.pricePerSqm != null)).toHaveLength(24);
    for (const card of cards) {
      expect(card.url).toMatch(/green-acres\.fr\/.*\/properties\/.*\.htm$/i);
    }
  });

  it('une carte sans prix reste lue sans casser les autres', () => {
    const cards = extractSearchResults(
      [
        '<article data-id="ag-1"><a class="detailedSheetLink" href="/annonce/vente/nice/appartement/2pieces/ag-1"></a>',
        '<span class="ad-price__the-price">300&nbsp;000&nbsp;€</span>',
        '<span class="ad-price__price-per-square-meter">5&nbsp;000&nbsp;€/m²</span>',
        '<img alt="Achat appartement 2 pièces 60 m²"></article>',
        '<article data-id="ag-2"><a class="detailedSheetLink" href="/annonce/vente/nice/appartement/3pieces/ag-2"></a>',
        '<img alt="Achat appartement 3 pièces 80 m²"></article>',
      ].join(''),
      'https://www.bienici.com/recherche/achat/nice-06000',
      'bienici',
    );
    expect(cards).toHaveLength(2);
    expect(cards[0].price).toBe(300000);
    expect(cards[1].price).toBeNull();
    expect(cards[1].surfaceArea).toBe(80);
  });
});

// §5 point 8 — le type de bien est lu sur la carte (jamais relâché au classement).
describe('extractSearchResults — type de bien et titre', () => {
  it('SeLoger : le type est lu (majorité d’appartements sur une recherche appartement)', () => {
    const cards = load('seloger');
    expect(cards.filter((c) => c.propertyType === 'apartment').length).toBeGreaterThanOrEqual(20);
  });

  it('Bien’ici : le type est lu depuis le chemin de l’annonce', () => {
    const cards = load('bienici');
    expect(cards.filter((c) => c.propertyType === 'apartment').length).toBeGreaterThanOrEqual(20);
  });

  it('Green Acres : pas de titre publié → libellé composé « Type à Commune », type lu', () => {
    const cards = load('green_acres');
    // Aucune carte ne retombe sur « Annonce détectée » : chacune porte un libellé.
    expect(cards.every((c) => c.title != null && c.title.trim() !== '')).toBe(true);
    const apart = cards.find((c) => c.propertyType === 'apartment');
    expect(apart?.title).toMatch(/ à /);
  });

  it('Green Acres : page tous types (19 appartements / 4 maisons / 1 parking mesurés)', () => {
    // La page /immobilier/nice titre « maisons à vendre » mais sert tous les types.
    // On vérifie que le lecteur les distingue — dont le PARKING, à écarter d'un 3 pièces.
    const cards = load('green_acres');
    const byType = (t: string) => cards.filter((c) => c.propertyType === t).length;
    expect(byType('apartment')).toBe(19);
    expect(byType('house')).toBe(4);
    expect(byType('parking')).toBe(1);
  });

  it('Maisons et Appartements : le type est lu depuis l’alt', () => {
    const cards = load('maisons_appartements');
    expect(cards.filter((c) => c.propertyType === 'apartment').length).toBeGreaterThanOrEqual(10);
  });
});

// Point 3 — un logo d'agence n'est pas la photo du bien : on l'écarte, on prend la
// première VRAIE photo, et à défaut pas de vignette (jamais un logo).
describe('extractSearchResults — la vignette n’est jamais un logo d’agence', () => {
  // Le cas de PRODUCTION qui manquait : chez SeLoger le logo n'a AUCUN mot « logo »,
  // c'est la première image, minuscule (h=50), même CDN, alt = nom de l'agence. Un
  // test sur une fixture réelle, pas sur un balisage inventé (Bien'ici) qui validait
  // un monde que SeLoger ne fabrique pas.
  it('SeLoger (fixture réelle) : aucune carte ne retient le logo minuscule de l’agence', () => {
    const cards = load('seloger');
    expect(cards.filter((c) => c.photoUrl != null)).toHaveLength(30);
    for (const card of cards) {
      const url = card.photoUrl ?? '';
      // Aucune dimension déclarée ≤ 160 px : ce serait une vignette/logo, pas la photo.
      for (const m of url.matchAll(/[?&](?:w|h|width|height)=(\d{1,4})\b/gi)) {
        expect(Number.parseInt(m[1], 10)).toBeGreaterThan(160);
      }
    }
  });

  it('saute le logo de l’annonceur et prend la vraie photo', () => {
    const [card] = extractSearchResults(
      [
        '<article data-id="iad-1"><a class="detailedSheetLink" href="/annonce/vente/nice/appartement/2pieces/iad-1"></a>',
        '<div class="account-logo"><img src="https://file.bienici.com/photo/agency-logo-xyz?height=90&width=180" alt="Logo de l’annonceur"></div>',
        '<div class="photo"><img src="https://file.bienici.com/photo/iad-1_real_photo.jpg?width=300&height=180&fit=cover" alt="Achat appartement 2 pièces 60 m²"></div>',
        '</article>',
      ].join(''),
      'https://www.bienici.com/recherche/achat/nice-06000',
      'bienici',
    );
    expect(card.photoUrl).toContain('iad-1_real_photo');
    expect(card.photoUrl).not.toContain('agency-logo');
  });

  it('aucune vraie photo (seulement un logo /Agences/) → pas de vignette', () => {
    const [card] = extractSearchResults(
      [
        '<article id="7" class="RR_article" itemscope itemtype="https://schema.org/Apartment">',
        '<a href="https://www.maisonsetappartements.fr/views/ficheAnnonce.php?IdAnnonce=7"></a>',
        '<img src="https://medias.maisonsetappartements.fr/Agences/Logos/five-star.png" alt="Appartement à vendre à Nice - 2 pièces 40 m²">',
        '</article>',
      ].join(''),
      'https://www.maisonsetappartements.fr/views/Search.php',
      'maisons_appartements',
    );
    expect(card.photoUrl).toBeNull();
  });
});

// §11.3 — les programmes neufs sont écartés, y compris à fourchette de prix.
describe('filterAndDedupeCandidates — le neuf est écarté', () => {
  it('SeLoger : au moins un programme neuf figure et est écarté', () => {
    const cards = load('seloger');
    expect(cards.some((c) => c.isNewBuild)).toBe(true);
    const { candidates, excludedNewBuild } = filterAndDedupeCandidates(cards);
    expect(excludedNewBuild).toBeGreaterThanOrEqual(1);
    expect(candidates.every((c) => !c.isNewBuild)).toBe(true);
  });

  it('Bien’ici : /programme/ et fourchette de prix sont écartés', () => {
    const cards = extractSearchResults(
      [
        // Programme neuf : segment /programme/ dans l'adresse + fourchette de prix.
        '<article data-id="mgc-1"><a class="detailedSheetLink" href="/annonce/vente/nice/programme/2pieces/mgc-1"></a>',
        '<span class="ad-price__the-price">670&nbsp;000 à 770&nbsp;000&nbsp;€</span>',
        '<img alt="Achat appartement 2 pièces 45 m²"></article>',
        // Annonce ancienne ordinaire.
        '<article data-id="iad-2"><a class="detailedSheetLink" href="/annonce/vente/nice/appartement/3pieces/iad-2"></a>',
        '<span class="ad-price__the-price">400&nbsp;000&nbsp;€</span>',
        '<span class="ad-price__price-per-square-meter">6&nbsp;000&nbsp;€/m²</span>',
        '<img alt="Achat appartement 3 pièces 66 m²"></article>',
      ].join(''),
      'https://www.bienici.com/recherche/achat/nice-06000',
      'bienici',
    );
    expect(cards[0].isNewBuild).toBe(true);
    expect(cards[1].isNewBuild).toBe(false);
    const { candidates, excludedNewBuild } = filterAndDedupeCandidates(cards);
    expect(excludedNewBuild).toBe(1);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].key).toBe('iad-2');
  });
});

// §11.4 — un doublon prix+surface+pièces+commune n'apparaît qu'une fois.
describe('filterAndDedupeCandidates — déduplication prix+surface+pièces+commune', () => {
  const base = {
    title: null,
    propertyType: null,
    pricePerSqm: null,
    photoUrl: null,
    isNewBuild: false,
  };

  it('le même bien chez deux agences n’apparaît qu’une fois, la première gardée', () => {
    const candidates: CompetitorCandidate[] = [
      {
        ...base,
        key: 'agenceA',
        url: 'https://x/a',
        price: 464000,
        surfaceArea: 66,
        roomsCount: 3,
        city: 'Nice',
      },
      {
        ...base,
        key: 'agenceB',
        url: 'https://x/b',
        price: 464000,
        surfaceArea: 66,
        roomsCount: 3,
        city: 'Nice',
      },
      {
        ...base,
        key: 'autre',
        url: 'https://x/c',
        price: 500000,
        surfaceArea: 80,
        roomsCount: 4,
        city: 'Nice',
      },
    ];
    const { candidates: kept, excludedDuplicates } = filterAndDedupeCandidates(candidates);
    expect(kept).toHaveLength(2);
    expect(excludedDuplicates).toBe(1);
    expect(kept[0].key).toBe('agenceA');
  });

  it('deux annonces sans prix ni surface ne sont pas fusionnées à tort', () => {
    const candidates: CompetitorCandidate[] = [
      {
        ...base,
        key: 'a',
        url: 'https://x/a',
        price: null,
        surfaceArea: null,
        roomsCount: null,
        city: 'Nice',
      },
      {
        ...base,
        key: 'b',
        url: 'https://x/b',
        price: null,
        surfaceArea: null,
        roomsCount: null,
        city: 'Nice',
      },
    ];
    const { candidates: kept } = filterAndDedupeCandidates(candidates);
    expect(kept).toHaveLength(2);
    expect(candidateSignature(candidates[0])).toBeNull();
  });
});
