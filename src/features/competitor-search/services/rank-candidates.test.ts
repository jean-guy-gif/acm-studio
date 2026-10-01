import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { extractSearchResults } from '@/features/competitor-search/services/extract-search-results';
import { learnFromDecisions } from '@/features/competitor-search/services/learn-from-decisions';
import { rankCandidates } from '@/features/competitor-search/services/rank-candidates';
import type {
  CompetitorCandidate,
  CompetitorSearchCriteria,
  PortalSearchResult,
  SearchPortal,
} from '@/features/competitor-search/types';

// Mission 61 — on inspecte LA CHARGE (des PortalSearchResult), pas scoreCandidate en isolation.
// Le cas de Laurent : un 4 pièces de 80 m², fourchette conseiller 400 000–500 000.
const CRITERIA: CompetitorSearchCriteria = {
  city: 'Nice',
  postalCode: '06000',
  propertyType: 'apartment',
  district: null,
  surfaceArea: 80,
  roomsCount: 4,
  advisorPriceMin: 400000,
  advisorPriceMax: 500000,
};
const PREFS = learnFromDecisions([]);

let n = 0;
function c(over: Partial<CompetitorCandidate>): CompetitorCandidate {
  n += 1;
  return {
    key: `k${n}`,
    url: `https://portal.example/${n}`,
    title: null,
    price: 450000,
    surfaceArea: 80,
    roomsCount: 4,
    propertyType: 'apartment',
    pricePerSqm: null,
    city: 'Nice',
    photoUrls: [],
    isNewBuild: false,
    ...over,
  };
}
function portal(candidates: CompetitorCandidate[]): PortalSearchResult {
  return {
    portal: 'seloger',
    label: 'SeLoger',
    searchUrl: 'https://www.seloger.com/x',
    status: 'ok',
    message: null,
    candidates,
  };
}
const run = (cands: CompetitorCandidate[]) => rankCandidates(CRITERIA, [portal(cands)], PREFS);
const keys = (res: ReturnType<typeof run>) => res.ranked.map((r) => r.candidate.key);

describe('rankCandidates — les quatre critères FILTRENT (Mission 61)', () => {
  it('§7.1 — pour un 4 pièces, aucun 2P ni 3P tant que le cran pièces n’est pas déclenché', () => {
    const res = run([
      c({ key: '4a', surfaceArea: 80 }),
      c({ key: '4b', surfaceArea: 82 }),
      c({ key: '4c', surfaceArea: 78 }),
      c({ key: '4d', surfaceArea: 81 }),
      c({ key: '4e', surfaceArea: 79 }),
      c({ key: '4f', surfaceArea: 83 }), // 6 admissibles exacts → aucun desserrage
      c({ key: '3p', roomsCount: 3 }),
      c({ key: '2p', roomsCount: 2 }),
    ]);
    expect(res.loosening.roomsLoosened).toBe(false);
    expect(res.ranked.every((r) => r.candidate.roomsCount === 4)).toBe(true);
    expect(keys(res)).not.toContain('3p');
    expect(keys(res)).not.toContain('2p');
  });

  it('§7.2a — pour 80 m², rien hors 76–84 au premier passage (±5 %)', () => {
    const res = run([
      c({ key: 's80', surfaceArea: 80 }),
      c({ key: 's84', surfaceArea: 84 }), // +5 % exact
      c({ key: 's76', surfaceArea: 76 }), // −5 % exact
      c({ key: 's82', surfaceArea: 82 }),
      c({ key: 's78', surfaceArea: 78 }),
      c({ key: 's81', surfaceArea: 81 }), // 6 dans ±5 % → pas de desserrage
      c({ key: 's85', surfaceArea: 85 }), // 6,25 % → dehors
      c({ key: 's50', surfaceArea: 50 }),
    ]);
    expect(res.loosening.surfaceLoosened).toBe(false);
    expect(
      res.ranked.every((r) => r.candidate.surfaceArea! >= 76 && r.candidate.surfaceArea! <= 84),
    ).toBe(true);
    expect(keys(res)).not.toContain('s85');
    expect(keys(res)).not.toContain('s50');
  });

  it('§7.2b — après le dernier cran, rien hors 72–88 (±10 %), un 70 m² reste dehors', () => {
    const res = run([
      c({ key: 's86', surfaceArea: 86 }), // 7,5 %
      c({ key: 's88', surfaceArea: 88 }), // 10 %
      c({ key: 's74', surfaceArea: 74 }), // 7,5 %
      c({ key: 's72', surfaceArea: 72 }), // 10 %
      c({ key: 's70', surfaceArea: 70 }), // 12,5 % → dehors, jamais
      c({ key: 's50', surfaceArea: 50 }),
    ]);
    expect(res.loosening.surfaceTolerancePct).toBe(10);
    expect(
      res.ranked.every((r) => r.candidate.surfaceArea! >= 72 && r.candidate.surfaceArea! <= 88),
    ).toBe(true);
    expect(keys(res)).not.toContain('s70');
    expect(keys(res)).not.toContain('s50');
  });

  it('§7.3 — un bien retenu grâce au desserrage porte sa mention, et l’état le dit', () => {
    const res = run([
      c({ key: 'tight', surfaceArea: 80 }),
      c({ key: 'wide', surfaceArea: 87 }), // 8,75 % → n’entre qu’après élargissement
    ]);
    expect(res.loosening.surfaceLoosened).toBe(true);
    const wide = res.ranked.find((r) => r.candidate.key === 'wide');
    const tight = res.ranked.find((r) => r.candidate.key === 'tight');
    expect(wide?.loosenedSurface).toBe(true);
    expect(tight?.loosenedSurface).toBe(false);
  });

  it('§7.4 — la fourchette prix du conseiller ne s’élargit à AUCUN cran (stricte)', () => {
    // Décision A (M61 §2) : fourchette STRICTE. 400k–500k → bornes [400k, 500k], jamais élargies.
    // Scénario qui FORCE le desserrage surface : le prix hors bornes reste exclu quoi qu’il arrive,
    // et un prix à 399k (que des ±10 % auraient laissé passer) est DEHORS.
    const res = run([
      c({ key: 'atlow', price: 400000, surfaceArea: 87 }), // pile à la borne basse
      c({ key: 'athigh', price: 500000, surfaceArea: 86 }), // pile à la borne haute
      c({ key: 'below', price: 399000, surfaceArea: 80 }), // sous la borne stricte → jamais
      c({ key: 'above', price: 500001, surfaceArea: 80 }), // au-dessus → jamais
    ]);
    expect(res.loosening.surfaceLoosened).toBe(true); // le desserrage a bien eu lieu
    expect(keys(res)).toContain('atlow');
    expect(keys(res)).toContain('athigh');
    expect(keys(res)).not.toContain('below');
    expect(keys(res)).not.toContain('above');
  });

  it('§7.5 — trop peu de candidats même après le dernier cran : belowMinimum, sans compléter', () => {
    const res = run([
      c({ key: 'ok1', surfaceArea: 80 }),
      c({ key: 'ok2', surfaceArea: 82 }),
      c({ key: 'out50', surfaceArea: 50 }), // hors bornes surface, ne doit jamais compléter
      c({ key: 'out3p50', roomsCount: 3, surfaceArea: 50 }), // ni par le cran pièces : surface dehors
    ]);
    expect(res.belowMinimum).toBe(true);
    expect(res.ranked.length).toBe(2);
    expect(res.ranked.length).toBeLessThan(res.minimum);
    expect(keys(res)).not.toContain('out50');
    expect(keys(res)).not.toContain('out3p50');
  });

  it('§7.6 — un candidat sans surface est écarté ET compté dans les écartés', () => {
    const res = run([
      c({ key: 'ok1', surfaceArea: 80 }),
      c({ key: 'ok2', surfaceArea: 82 }),
      c({ key: 'nosurf', surfaceArea: null }), // commune/prix/pièces ok, surface absente
    ]);
    expect(keys(res)).not.toContain('nosurf');
    expect(res.excludedForMissing.surface).toBe(1);
  });

  it('§6 — le type reste un filtre dur : une maison n’entre pas pour un appartement', () => {
    const res = run([
      c({ key: 'appt', surfaceArea: 80 }),
      c({ key: 'maison', propertyType: 'house', surfaceArea: 80 }),
    ]);
    expect(keys(res)).toContain('appt');
    expect(keys(res)).not.toContain('maison');
  });

  it('§4 — commune : un candidat d’une AUTRE commune n’entre pas', () => {
    const res = run([c({ key: 'nice', city: 'Nice' }), c({ key: 'cannes', city: 'Cannes' })]);
    expect(keys(res)).toContain('nice');
    expect(keys(res)).not.toContain('cannes');
  });

  it('§4 — commune : une carte SANS ville est GARDÉE (portée par la provenance), pas écartée', () => {
    const res = run([
      c({ key: 'withcity', city: 'Nice' }),
      c({ key: 'nocity', city: null }),
      c({ key: 'cannes', city: 'Cannes' }),
    ]);
    expect(keys(res)).toContain('nocity');
    expect(keys(res)).toContain('withcity');
    expect(keys(res)).not.toContain('cannes');
    // la commune n'est PAS une donnée manquante qui écarte
    expect(res.excludedForMissing).toEqual({ surface: 0, rooms: 0, price: 0 });
  });
});

// Mission 68 — la tolérance de surface reste ±5 % puis ±10 % au maximum, mais n'est JAMAIS
// inférieure à ±3 m² : sans plancher, ±5 % d'un studio de 20 m² ne laissait que 19–21 m².
describe('rankCandidates — plancher de ±3 m² sur la surface (Mission 68)', () => {
  const STUDIO: CompetitorSearchCriteria = {
    ...CRITERIA,
    surfaceArea: 20,
    roomsCount: 1,
    advisorPriceMin: 100000,
    advisorPriceMax: 200000,
  };
  const studio = (key: string, surfaceArea: number) =>
    c({ key, surfaceArea, roomsCount: 1, price: 150000 });
  const runStudio = (cands: CompetitorCandidate[]) =>
    rankCandidates(STUDIO, [portal(cands)], PREFS);

  it('pour 20 m² : 17–23 m² admis dès le cran 1, sans mention d’élargissement', () => {
    const res = runStudio([
      studio('s17', 17),
      studio('s18', 18),
      studio('s19', 19),
      studio('s20', 20),
      studio('s22', 22),
      studio('s23', 23),
      studio('s16_9', 16.9),
      studio('s23_1', 23.1),
    ]);
    expect(keys(res).sort()).toEqual(['s17', 's18', 's19', 's20', 's22', 's23']);
    expect(res.loosening.surfaceLoosened).toBe(false);
    expect(res.loosening.roomsLoosened).toBe(false);
    expect(res.ranked.some((r) => r.loosenedSurface)).toBe(false);
  });

  it('pour 20 m² : même au dernier cran (±10 % = 2 m²), on ne dépasse pas ±3 m²', () => {
    // Trop peu de candidats → tous les crans sont parcourus ; 16 et 24 m² restent dehors.
    const res = runStudio([
      studio('s17', 17),
      studio('s23', 23),
      studio('s16', 16),
      studio('s24', 24),
    ]);
    expect(keys(res).sort()).toEqual(['s17', 's23']);
    expect(res.ranked.some((r) => r.loosenedSurface)).toBe(false);
  });

  it('pour 80 m² : rien ne change — 76–84 m² au cran 1 (±5 % = 4 m², au-dessus du plancher)', () => {
    const res = run([
      c({ key: 'a76', surfaceArea: 76 }),
      c({ key: 'a78', surfaceArea: 78 }),
      c({ key: 'a80', surfaceArea: 80 }),
      c({ key: 'a81', surfaceArea: 81 }),
      c({ key: 'a82', surfaceArea: 82 }),
      c({ key: 'a84', surfaceArea: 84 }),
      c({ key: 'a75', surfaceArea: 75 }),
      c({ key: 'a85', surfaceArea: 85 }),
    ]);
    expect(keys(res).sort()).toEqual(['a76', 'a78', 'a80', 'a81', 'a82', 'a84']);
    expect(res.loosening.surfaceLoosened).toBe(false);
  });

  it('pour 80 m² : le desserrage reste en pourcentage — 74 m² entre à ±7,5 %, 71 m² jamais', () => {
    const res = run([
      c({ key: 'a80', surfaceArea: 80 }),
      c({ key: 'a74', surfaceArea: 74 }),
      c({ key: 'a71', surfaceArea: 71 }),
    ]);
    expect(keys(res).sort()).toEqual(['a74', 'a80']);
    expect(res.ranked.find((r) => r.candidate.key === 'a74')?.loosenedSurface).toBe(true);
  });
});

// La VRAIE charge : les quatre pages de résultats Nice capturées par l'extension. C'est le cas
// de Laurent — un 4 pièces de 80 m² — et l'invariant doit tenir quelles que soient les données :
// jamais un 2 pièces, jamais une surface hors ±10 %, jamais une autre commune.
describe('rankCandidates — invariants sur la vraie recherche Nice (fixtures)', () => {
  const DIR = join(__dirname, '..', '__fixtures__');
  const FILES: Record<SearchPortal, { file: string; url: string; label: string }> = {
    seloger: {
      file: 'seloger-resultats-nice.html',
      url: 'https://www.seloger.com/x',
      label: 'SeLoger',
    },
    bienici: {
      file: 'bienici-resultats-nice.html',
      url: 'https://www.bienici.com/x',
      label: 'Bien’ici',
    },
    green_acres: {
      file: 'green-acres-resultats-nice.html',
      url: 'https://www.green-acres.fr/x',
      label: 'Green Acres',
    },
    maisons_appartements: {
      file: 'maisons-et-appartements-resultats-nice.html',
      url: 'https://www.maisonsetappartements.fr/x',
      label: 'Maisons et Appartements',
    },
  };
  const realPortals: PortalSearchResult[] = (Object.keys(FILES) as SearchPortal[]).map((portal) => {
    const { file, url, label } = FILES[portal];
    return {
      portal,
      label,
      searchUrl: url,
      status: 'ok' as const,
      message: null,
      candidates: extractSearchResults(readFileSync(join(DIR, file), 'utf8'), url, portal),
    };
  });

  it('un 4P 80 m² : aucun 2P, aucune surface hors ±10 %, aucune autre commune que Nice', () => {
    const criteria: CompetitorSearchCriteria = {
      city: 'Nice',
      postalCode: '06000',
      propertyType: 'apartment',
      district: null,
      surfaceArea: 80,
      roomsCount: 4,
      advisorPriceMin: 350000,
      advisorPriceMax: 900000,
    };
    const res = rankCandidates(criteria, realPortals, PREFS);
    for (const r of res.ranked) {
      // pièces : jamais à plus d'un cran (et le cran max est ±1) → jamais un 2P pour un 4P
      if (r.candidate.roomsCount != null) {
        expect(Math.abs(r.candidate.roomsCount - 4)).toBeLessThanOrEqual(
          res.loosening.roomsTolerance,
        );
        expect(r.candidate.roomsCount).not.toBe(2);
      }
      // surface : jamais hors ±10 % (donc jamais un 50 m²)
      if (r.candidate.surfaceArea != null) {
        expect(Math.abs(r.candidate.surfaceArea - 80) / 80).toBeLessThanOrEqual(0.1 + 1e-9);
      }
      // commune : jamais une AUTRE commune (une carte sans ville est dans le périmètre Nice).
      if (r.candidate.city != null) {
        expect(r.candidate.city.toLowerCase()).toContain('nice');
      }
    }
  });
});
