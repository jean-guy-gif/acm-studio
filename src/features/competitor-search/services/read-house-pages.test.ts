import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { learnFromDecisions } from '@/features/competitor-search/services/learn-from-decisions';
import { rankCandidates } from '@/features/competitor-search/services/rank-candidates';
import { readSearchPage } from '@/features/competitor-search/services/read-search-page';
import { scoreCandidate } from '@/features/competitor-search/services/score-candidate';
import type {
  CompetitorCandidate,
  CompetitorSearchCriteria,
  PortalSearchResult,
  SearchPortal,
} from '@/features/competitor-search/types';

// MISSION 70 — les maisons se lisent. Quatre pages de résultats MAISON filtrées par le conseiller
// sur le portail (Nice et alentours, 5 pièces), copiées de son navigateur le 5 octobre 2026. Les
// chiffres sont MESURÉS sur ces pages.
const DIR = join(__dirname, '..', '__fixtures__', 'filtre');
const PAGES: Record<SearchPortal, { file: string; url: string }> = {
  seloger: { file: 'seloger-maison.html', url: 'https://www.seloger.com/classified-search' },
  bienici: {
    file: 'bienici-maison.html',
    url: 'https://www.bienici.com/recherche/achat/nice-06000/maison',
  },
  green_acres: {
    file: 'green-acres-maison.html',
    url: 'https://www.green-acres.fr/maison-a-vendre',
  },
  maisons_appartements: {
    file: 'maisons-appartements-maison.html',
    url: 'https://www.maisonsetappartements.fr/views/Search.php',
  },
};

function cards(portal: SearchPortal): CompetitorCandidate[] {
  const result = readSearchPage(
    readFileSync(join(DIR, PAGES[portal].file), 'utf8'),
    PAGES[portal].url,
  );
  if (!result.ok) {
    throw new Error(`lecture ${portal} : ${result.reason}`);
  }
  return result.portal.candidates;
}

describe('Mission 70 — les pages maison se lisent', () => {
  it('Maisons & Appartements : les 15 cartes schema.org/House sont lues, surface prise du texte de la photo', () => {
    const read = cards('maisons_appartements');
    expect(read).toHaveLength(15);
    expect(read.every((c) => c.propertyType === 'house')).toBe(true);
    const first = read.find((c) => c.key === '4567025');
    // alt : « Maison à vendre à Nice  - 5 pièces 157 m² »
    expect(first?.surfaceArea).toBe(157);
    expect(first?.roomsCount).toBe(5);
    expect(first?.city).toBe('Nice');
    expect(read.every((c) => c.surfaceArea != null)).toBe(true);
  });

  it('Green Acres : le type se lit sur le titre de la carte (le chemin dit « immobilier »)', () => {
    const read = cards('green_acres');
    expect(read).toHaveLength(24);
    // « maison individuelle divisée en 2 beaux appartements » : la maison est nommée d'abord.
    expect(read.find((c) => c.key === 'As37hqyghan93qiz')?.propertyType).toBe('house');
    expect(read.filter((c) => c.propertyType === 'house')).toHaveLength(21);
    // Trois titres ne nomment AUCUN type : type inconnu, jamais deviné (ni description, ni chemin).
    const unknown = read.filter((c) => c.propertyType == null).map((c) => [c.key, c.title]);
    expect(unknown).toEqual([
      ['Aonuopgj11n4j5ov', 'Grasse Saint-Jacques - Domaine privé et sécurisé'],
      [
        'Abyd0pulvcgc5l74',
        'Emplacement privilégié, vue exceptionnelle et réel potentiel de rénovation',
      ],
      ['Awm3at6xzzk4x8d5', 'MOUANS-SARTOUX Un havre de paix au cœur de la nature'],
    ]);
    // Le libellé est le titre de la carte, jamais « Immobilier à … ».
    expect(read.some((c) => /^immobilier/i.test(c.title ?? ''))).toBe(false);
  });

  it('Terrain : SeLoger le lit dans « · 800 m² de terrain », sans le confondre avec l’habitable', () => {
    const read = cards('seloger');
    expect(read.filter((c) => c.landArea != null)).toHaveLength(15);
    const big = read.find((c) => c.key === '2634EPZPW2FZ'); // « 141,2 m², 5 300 m² de terrain »
    expect(big?.surfaceArea).toBe(141.2);
    expect(big?.landArea).toBe(5300);
    expect(read.find((c) => c.key === '26566QPI11SU')?.landArea).toBe(800);
  });

  it('Terrain : Green Acres le lit sur l’étiquette « Terrain » de chaque carte', () => {
    const read = cards('green_acres');
    expect(read.every((c) => c.landArea != null)).toBe(true);
    const first = read.find((c) => c.key === 'As37hqyghan93qiz');
    expect(first?.surfaceArea).toBe(147);
    expect(first?.landArea).toBe(488);
  });

  it('Terrain : rien n’est déduit de la description sur Bien’ici et M&A', () => {
    expect(cards('bienici').every((c) => c.landArea == null)).toBe(true);
    expect(cards('maisons_appartements').every((c) => c.landArea == null)).toBe(true);
  });
});

// Le terrain ORDONNE, il ne filtre jamais.
const HOUSE: CompetitorSearchCriteria = {
  city: 'Nice',
  postalCode: '06000',
  propertyType: 'house',
  district: null,
  surfaceArea: 145,
  roomsCount: 5,
  advisorPriceMin: 700000,
  advisorPriceMax: 900000,
};
const PREFS = learnFromDecisions([]);
const seloger = (): PortalSearchResult => {
  const result = readSearchPage(
    readFileSync(join(DIR, PAGES.seloger.file), 'utf8'),
    PAGES.seloger.url,
  );
  if (!result.ok) throw new Error('lecture seloger');
  return result.portal;
};

describe('Mission 70 — le terrain est un critère secondaire d’ordre', () => {
  it('avec ou sans terrain du bien vendeur, les MÊMES annonces sont admises', () => {
    const without = rankCandidates(HOUSE, [seloger()], PREFS);
    const withLand = rankCandidates({ ...HOUSE, landArea: 800 }, [seloger()], PREFS);
    const keys = (r: typeof without) => r.ranked.map((e) => e.candidate.key).sort();
    expect(without.ranked.length).toBeGreaterThan(0);
    expect(keys(withLand)).toEqual(keys(without));
    expect(withLand.loosening).toEqual(without.loosening);
    // Une annonce sans terrain écrit reste admise (le terrain n'écarte jamais).
    expect(withLand.ranked.some((e) => e.candidate.landArea == null)).toBe(true);
  });

  it('à critères principaux égaux, le terrain le plus proche passe devant', () => {
    const facts = {
      price: 800000,
      surfaceArea: 145,
      roomsCount: 5,
      city: 'Nice',
      district: null,
      propertyType: 'house',
    };
    const criteria = { ...HOUSE, landArea: 800 };
    const near = scoreCandidate(criteria, { ...facts, landArea: 850 });
    const far = scoreCandidate(criteria, { ...facts, landArea: 5300 });
    expect(near.score).toBeGreaterThan(far.score);
    expect(near.strengths).toContain('Terrain proche');
    expect(far.weaknesses).toContain('Terrain plus grand');
  });

  it('sans terrain d’un côté ou de l’autre, le score ne bouge pas (appartements inchangés)', () => {
    const facts = {
      price: 450000,
      surfaceArea: 80,
      roomsCount: 4,
      city: 'Nice',
      district: null,
      propertyType: 'apartment',
    };
    const base = scoreCandidate({ ...HOUSE, propertyType: 'apartment' }, facts);
    expect(
      scoreCandidate({ ...HOUSE, propertyType: 'apartment', landArea: 800 }, facts).score,
    ).toBe(base.score);
    expect(
      scoreCandidate({ ...HOUSE, propertyType: 'apartment' }, { ...facts, landArea: 4560 }).score,
    ).toBe(base.score);
  });

  it('un appartement vendeur avec jardin : le terrain de copropriété des cartes ne change pas l’ordre', () => {
    const flat: CompetitorSearchCriteria = {
      ...HOUSE,
      propertyType: 'apartment',
      surfaceArea: 80,
      roomsCount: 4,
      advisorPriceMin: 400000,
      advisorPriceMax: 500000,
    };
    const card = (key: string, landArea: number | null): CompetitorCandidate => ({
      key,
      url: `https://www.seloger.com/annonces/${key}.htm`,
      title: 'Appartement à vendre - Nice',
      price: 450000,
      surfaceArea: 80,
      roomsCount: 4,
      propertyType: 'apartment',
      pricePerSqm: null,
      landArea,
      city: 'Nice',
      photoUrls: [],
      isNewBuild: false,
    });
    // Le terrain de copropriété (4 560 m²) passe en tête : si le terrain pesait, la carte à 150 m²
    // (égale au jardin du vendeur) le doublerait.
    const portal: PortalSearchResult = {
      portal: 'seloger',
      label: 'SeLoger',
      searchUrl: 'https://www.seloger.com/classified-search',
      status: 'ok',
      message: null,
      candidates: [card('copro', 4560), card('sans', null), card('jardin', 150)],
    };
    const order = (criteria: CompetitorSearchCriteria) =>
      rankCandidates(criteria, [portal], PREFS).ranked.map((e) => [e.candidate.key, e.score]);
    expect(order({ ...flat, landArea: 150 })).toEqual(order({ ...flat, landArea: null }));
    expect(order({ ...flat, landArea: 150 }).map(([key]) => key)).toEqual([
      'copro',
      'sans',
      'jardin',
    ]);
    // Le terrain reste lu sur la carte, donc affiché.
    expect(
      rankCandidates({ ...flat, landArea: 150 }, [portal], PREFS).ranked[0].candidate.landArea,
    ).toBe(4560);
  });

  it('une maison vendeuse : le même terrain, lui, ordonne', () => {
    const house: CompetitorSearchCriteria = { ...HOUSE, landArea: 800 };
    const card = (key: string, landArea: number): CompetitorCandidate => ({
      key,
      url: `https://www.seloger.com/annonces/${key}.htm`,
      title: 'Maison à vendre - Nice',
      price: 800000,
      surfaceArea: 145,
      roomsCount: 5,
      propertyType: 'house',
      pricePerSqm: null,
      landArea,
      city: 'Nice',
      photoUrls: [],
      isNewBuild: false,
    });
    const portal: PortalSearchResult = {
      portal: 'seloger',
      label: 'SeLoger',
      searchUrl: 'https://www.seloger.com/classified-search',
      status: 'ok',
      message: null,
      candidates: [card('loin', 5300), card('proche', 800)],
    };
    const keys = rankCandidates(house, [portal], PREFS).ranked.map((e) => e.candidate.key);
    expect(keys).toEqual(['proche', 'loin']);
  });
});
