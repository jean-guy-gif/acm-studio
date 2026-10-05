import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { learnFromDecisions } from '@/features/competitor-search/services/learn-from-decisions';
import { rankCandidates } from '@/features/competitor-search/services/rank-candidates';
import {
  guessSearchPortal,
  readSearchPage,
} from '@/features/competitor-search/services/read-search-page';
import type { CompetitorSearchCriteria, SearchPortal } from '@/features/competitor-search/types';

// MISSION 65 — les quatre pages de résultats FILTRÉES par le conseiller sur le portail
// (Nice, appartement, 4 pièces, 75–85 m² — jusqu'à 90 m² sur SeLoger —, 400–480 k€), copiées
// de son navigateur le 1er octobre 2026. Les chiffres ci-dessous sont MESURÉS, pas forcés :
// si un portail change son balisage, c'est ce test qui le dit.
const DIR = join(__dirname, '..', '__fixtures__', 'filtre');
const PAGES: Record<SearchPortal, { file: string; url: string }> = {
  seloger: { file: 'seloger.html', url: 'https://www.seloger.com/classified-search' },
  bienici: {
    file: 'bienici.html',
    url: 'https://www.bienici.com/recherche/achat/nice-06000/appartement/4-pieces',
  },
  green_acres: { file: 'green-acres.html', url: 'https://www.green-acres.fr/maison-a-vendre' },
  maisons_appartements: {
    file: 'maisons-appartements.html',
    url: 'https://www.maisonsetappartements.fr/views/Search.php',
  },
};

// Le bien du vendeur : un 4 pièces de 80 m² à Nice, fourchette 400–480 k€.
const CRITERIA: CompetitorSearchCriteria = {
  city: 'Nice',
  postalCode: '06000',
  propertyType: 'apartment',
  district: null,
  surfaceArea: 80,
  roomsCount: 4,
  advisorPriceMin: 400000,
  advisorPriceMax: 480000,
};
const PREFS = learnFromDecisions([]);

const html = (portal: SearchPortal) => readFileSync(join(DIR, PAGES[portal].file), 'utf8');

function read(portal: SearchPortal) {
  const result = readSearchPage(html(portal), PAGES[portal].url);
  if (!result.ok) {
    throw new Error(`lecture ${portal} : ${result.reason}`);
  }
  return result;
}

// Le même chemin que l'écran : cartes lues → doublons écartés → les quatre filtres (M61), le neuf
// tenu en réserve par le classement.
function rank(portal: SearchPortal) {
  return rankCandidates(CRITERIA, [read(portal).portal], PREFS);
}

// Cran 1 = bornes serrées : pièces exactes, surface ±5 % (76–84 m²), sans aucun desserrage.
const tight = (portal: SearchPortal) =>
  rank(portal).ranked.filter((entry) => !entry.loosenedSurface && !entry.loosenedRooms);

describe('readSearchPage — pages de résultats filtrées par le conseiller (fixtures réelles)', () => {
  it.each([
    ['seloger', 30, 0, 0, 23],
    ['bienici', 26, 2, 1, 19],
    ['green_acres', 24, 2, 0, 5],
    ['maisons_appartements', 15, 0, 0, 11],
  ] as const)(
    '%s : %i cartes lues, %i neuf marqué, %i doublon écarté, %i admis au cran 1 pour un 4P 80 m²',
    (portal, cardsRead, newBuild, duplicates, admitted) => {
      const result = read(portal);
      expect(result.portal.portal).toBe(portal);
      expect(result.portal.status).toBe('ok');
      expect(result.cardsRead).toBeGreaterThanOrEqual(1);
      expect(result.cardsRead).toBe(cardsRead);
      expect(result.newBuild).toBe(newBuild);
      expect(result.excludedDuplicates).toBe(duplicates);
      expect(result.portal.candidates).toHaveLength(cardsRead - duplicates);
      expect(result.portal.candidates.filter((c) => c.isNewBuild)).toHaveLength(newBuild);
      expect(tight(portal)).toHaveLength(admitted);
    },
  );

  it('SeLoger, Bien’ici, M&A : le cran 1 suffit, aucun élargissement', () => {
    for (const portal of ['seloger', 'bienici', 'maisons_appartements'] as const) {
      const { loosening, ranked } = rank(portal);
      expect(loosening.surfaceLoosened).toBe(false);
      expect(loosening.roomsLoosened).toBe(false);
      for (const entry of ranked) {
        expect(entry.candidate.roomsCount).toBe(4);
        expect(entry.candidate.surfaceArea).toBeGreaterThanOrEqual(76);
        expect(entry.candidate.surfaceArea).toBeLessThanOrEqual(84);
      }
    }
  });

  it('Green Acres : le portail complète de lui-même (surfaces plus petites, communes voisines) — nos filtres les écartent, et le 6e entre à ±7,5 % avec sa mention', () => {
    const { ranked, loosening } = rank('green_acres');
    expect(loosening.surfaceTolerancePct).toBe(7.5);
    expect(loosening.roomsLoosened).toBe(false);
    expect(ranked).toHaveLength(6);
    expect(ranked.filter((entry) => entry.loosenedSurface)).toHaveLength(1);
    expect(ranked.every((entry) => entry.candidate.city === 'Nice')).toBe(true);
  });

  it('Maisons & Appartements : la commune est lue sur chaque carte', () => {
    const cities = read('maisons_appartements').portal.candidates.map((c) => c.city);
    expect(cities.filter((city) => city === 'Nice')).toHaveLength(11);
    expect(cities.filter((city) => city === 'St Laurent Du Var')).toHaveLength(3);
    expect(cities.filter((city) => city === 'Cagnes Sur Mer')).toHaveLength(1);
  });

  it('Maisons & Appartements : les 2 annonces de Saint-Laurent-du-Var dans les bornes sont écartées par le filtre commune, il reste 11 admis', () => {
    // 4190530 (76 m², 467 000 €) et 4412241 (81 m², 415 000 €) : 4 pièces, dans la fourchette et
    // la surface — seule la COMMUNE les écarte. Avant la lecture de la commune, elles passaient
    // pour des annonces de Nice (13 admis).
    const { ranked } = rank('maisons_appartements');
    const keys = ranked.map((entry) => entry.candidate.key);
    expect(keys).not.toContain('4190530');
    expect(keys).not.toContain('4412241');
    expect(ranked).toHaveLength(11);
    expect(ranked.every((entry) => entry.candidate.city === 'Nice')).toBe(true);
  });
});

describe('readSearchPage — repli par collage (pas d’adresse)', () => {
  it.each(Object.keys(PAGES) as SearchPortal[])(
    '%s : le portail est reconnu aux marqueurs de ses cartes',
    (portal) => {
      expect(guessSearchPortal(html(portal))).toBe(portal);
      const pasted = readSearchPage(html(portal), null);
      expect(pasted.ok && pasted.portal.portal).toBe(portal);
      expect(pasted.ok && pasted.cardsRead).toBe(read(portal).cardsRead);
    },
  );

  it('un code sans aucune carte : aucune annonce détectée, rien d’inventé', () => {
    expect(guessSearchPortal('<html><body><p>Bonjour</p></body></html>')).toBeNull();
    expect(readSearchPage('<html><body><p>Bonjour</p></body></html>', null)).toEqual({
      ok: false,
      reason: 'no_cards',
    });
  });

  it('un onglet d’un site inconnu : portail non reconnu', () => {
    expect(readSearchPage(html('seloger'), 'https://example.com/recherche')).toEqual({
      ok: false,
      reason: 'unknown_portal',
    });
  });

  it('un portail reconnu mais une page sans carte : aucune annonce détectée', () => {
    expect(readSearchPage('<html><body></body></html>', PAGES.seloger.url)).toEqual({
      ok: false,
      reason: 'no_cards',
    });
  });
});
