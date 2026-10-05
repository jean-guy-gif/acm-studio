import { describe, expect, it } from 'vitest';

import proximityFixture from '@/features/competitor-search/__fixtures__/stream-estate-nice-4p-proximite.json';
import { extractSearchResults } from '@/features/competitor-search/services/extract-search-results';
import { learnFromDecisions } from '@/features/competitor-search/services/learn-from-decisions';
import {
  isGeneratedNewBuildTitle,
  isNewBuildAddress,
  NEW_BUILD_COMPLEMENT_MENTION,
} from '@/features/competitor-search/services/new-build';
import { splitVisible } from '@/features/competitor-search/services/proximity';
import { rankCandidates } from '@/features/competitor-search/services/rank-candidates';
import {
  isStreamEstateNewBuild,
  parseStreamEstateResponse,
  type StreamEstateProperty,
} from '@/features/competitor-search/services/stream-estate';
import {
  STREAM_ESTATE_LABEL,
  STREAM_ESTATE_SOURCE,
  type CompetitorCandidate,
  type CompetitorSearchCriteria,
  type PortalSearchResult,
} from '@/features/competitor-search/types';

// LE NEUF (règle de Laurent, 05/10) : pas de neuf, sauf en complément sous 3 concurrents admis
// dans l'ancien après le desserrage complet, avec la mention. Reconnu à la structure, jamais à la
// description.

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
const NOW = new Date('2026-10-05T13:16:18Z');

let n = 0;
function c(over: Partial<CompetitorCandidate>): CompetitorCandidate {
  n += 1;
  return {
    key: `k${n}`,
    url: `https://www.seloger.com/annonces/achat/appartement/nice-06/${n}.htm`,
    title: null,
    price: 450000,
    surfaceArea: 80,
    roomsCount: 4,
    propertyType: 'apartment',
    pricePerSqm: null,
    landArea: null,
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

describe('repères structurels du neuf', () => {
  it('titre généré : « Appartement neuf à vendre » oui, « refait à neuf » non', () => {
    expect(isGeneratedNewBuildTitle('Appartement neuf à vendre')).toBe(true);
    expect(isGeneratedNewBuildTitle('Maison neuve à vendre')).toBe(true);
    expect(isGeneratedNewBuildTitle('Maison de ville neuve à vendre')).toBe(true);
    expect(isGeneratedNewBuildTitle('Appartement à vendre')).toBe(false);
    expect(isGeneratedNewBuildTitle('Appartement refait à neuf à vendre')).toBe(false);
    expect(
      isGeneratedNewBuildTitle(
        'A Saisir 4 pièces en position dominante, refait à neuf, vue mer et collines',
      ),
    ).toBe(false);
    expect(isGeneratedNewBuildTitle(null)).toBe(false);
  });

  it('adresse : /programme/, /neuf/, selogerneuf.com', () => {
    expect(
      isNewBuildAddress('https://www.bienici.com/annonce/vente/nice/programme/4pieces/mki-1'),
    ).toBe(true);
    expect(isNewBuildAddress('https://www.green-acres.fr/fr/properties/neuf/nice/P1.htm')).toBe(
      true,
    );
    expect(isNewBuildAddress('https://www.selogerneuf.com/annonces/x/278726241/')).toBe(true);
    expect(
      isNewBuildAddress(
        'https://www.seloger.com/annonce/achat/provence-alpes-cote-d-azur/alpes-maritimes-06/nice-06000/26LS3XTTE3UF',
      ),
    ).toBe(false);
    // « neuf » dans un mot du chemin n'est pas un segment.
    expect(isNewBuildAddress('https://www.leboncoin.fr/ad/refait-a-neuf-4p/123')).toBe(false);
  });
});

describe('Stream Estate : les 7 neufs de la réponse enregistrée (05/10)', () => {
  const members = (proximityFixture as { 'hydra:member': StreamEstateProperty[] })['hydra:member'];
  const SEVEN = [
    '443014ff', // « Appartement neuf à vendre »
    '755df92a', // idem
    '051934d3', // idem
    'ddb86cb7', // idem (annonces SeLoger expirées, ParuVendu en ligne)
    'e8aec357', // idem (idem)
    'e3a43e80', // idem, et année de construction 2028
    'd062decb', // « Appartement à vendre », mais année de construction 2028 : livraison à venir
  ];

  it('les 7 sont reconnus, et aucun des 23 autres biens', () => {
    const detected = members
      .filter((property) => isStreamEstateNewBuild(property, NOW))
      .map((property) => property.uuid.slice(0, 8));
    expect(detected.sort()).toEqual([...SEVEN].sort());
    expect(members).toHaveLength(30);
  });

  it('le titre généré, porté par une annonce même expirée, suffit', () => {
    const property = {
      uuid: 'x',
      title: 'Appartement à vendre',
      adverts: [
        { url: 'https://www.bienici.com/annonce/a-1', title: 'Appartement 4 pièces' },
        {
          url: 'https://www.seloger.com/annonce/2',
          title: 'Appartement neuf à vendre',
          expired: true,
        },
      ],
    } as StreamEstateProperty;
    expect(isStreamEstateNewBuild(property, NOW)).toBe(true);
  });

  it('« refait à neuf » reste de l’ancien ; l’année en cours ne fait pas un programme', () => {
    const property = {
      uuid: 'y',
      title: '4 pièces refait à neuf, vue mer',
      adverts: [
        {
          url: 'https://www.leboncoin.fr/ad/ventes_immobilieres/3046574062',
          title: 'A Saisir 4 pièces en position dominante, refait à neuf, vue mer et collines',
          features: ['état: neuf'],
          constructionYear: 2026,
        },
      ],
    } as StreamEstateProperty;
    expect(isStreamEstateNewBuild(property, NOW)).toBe(false);
  });

  it('la réponse marque ses candidats neufs et les compte', () => {
    const parsed = parseStreamEstateResponse(proximityFixture, NOW)!;
    // ddb86cb7 et e8aec357 n'ont plus d'origine utilisable : 5 neufs parmi les candidats.
    expect(parsed.newBuild).toBe(5);
    expect(parsed.candidates.filter((candidate) => candidate.isNewBuild)).toHaveLength(5);
  });

  it('pas de neuf quand l’ancien suffit : aucun des 5 n’est proposé, tous comptés', () => {
    const parsed = parseStreamEstateResponse(proximityFixture, NOW)!;
    const search = rankCandidates(
      CRITERIA,
      [
        {
          portal: STREAM_ESTATE_SOURCE,
          label: STREAM_ESTATE_LABEL,
          searchUrl: '',
          status: 'ok',
          message: null,
          candidates: parsed.candidates,
        },
      ],
      PREFS,
    );
    expect(search.ranked.length).toBeGreaterThanOrEqual(3);
    expect(search.ranked.some((entry) => entry.candidate.isNewBuild)).toBe(false);
    expect(search.ranked.some((entry) => entry.newBuildComplement)).toBe(false);
    expect(search.newBuildHeld).toBe(5);
  });
});

describe('le classement : le neuf ne vient qu’en complément sous 3', () => {
  it('pas de neuf quand l’ancien suffit (3 admis), même si le neuf est plus proche', () => {
    const res = run([
      c({ key: 'a1', surfaceArea: 84 }),
      c({ key: 'a2', surfaceArea: 76 }),
      c({ key: 'a3', surfaceArea: 83 }),
      c({ key: 'n1', surfaceArea: 80, isNewBuild: true }),
    ]);
    expect(res.ranked.map((r) => r.candidate.key)).toEqual(
      expect.arrayContaining(['a1', 'a2', 'a3']),
    );
    expect(res.ranked).toHaveLength(3);
    expect(res.newBuildHeld).toBe(1);
    expect(res.belowMinimum).toBe(false);
  });

  it('le neuf ne pèse pas sur le cran : 6 neufs n’empêchent pas le desserrage de l’ancien', () => {
    const res = run([
      ...Array.from({ length: 6 }, () => c({ isNewBuild: true })),
      c({ key: 'loose', surfaceArea: 74 }), // n'entre qu'à ±7,5 %
      c({ key: 'a1' }),
      c({ key: 'a2' }),
    ]);
    expect(res.loosening.surfaceLoosened).toBe(true);
    expect(res.ranked.map((r) => r.candidate.key)).toContain('loose');
    expect(res.ranked.some((r) => r.candidate.isNewBuild)).toBe(false);
  });

  it('sous 3 après le desserrage complet : complément neuf jusqu’à 3, après l’ancien, avec la mention', () => {
    const res = run([
      c({ key: 'a1' }),
      c({ key: 'n1', isNewBuild: true }),
      c({ key: 'n2', isNewBuild: true, surfaceArea: 79 }),
      c({ key: 'n3', isNewBuild: true, surfaceArea: 81 }),
      c({ key: 'n-out', isNewBuild: true, price: 600000 }), // hors fourchette : jamais
    ]);
    expect(res.loosening.roomsLoosened).toBe(true); // dernier cran atteint
    expect(res.ranked).toHaveLength(3);
    expect(res.ranked[0].candidate.key).toBe('a1');
    expect(res.ranked[0].newBuildComplement).toBe(false);
    const added = res.ranked.slice(1);
    expect(added.every((r) => r.candidate.isNewBuild && r.newBuildComplement)).toBe(true);
    expect(added.map((r) => r.candidate.key)).not.toContain('n-out');
    // 1 neuf admis mais au-delà du complément + 1 hors fourchette : non proposés.
    expect(res.newBuildHeld).toBe(2);
    expect(res.belowMinimum).toBe(false);
    expect(NEW_BUILD_COMPLEMENT_MENTION).toBe('Neuf — ajouté faute de 3 concurrents dans l’ancien');
  });

  it('aucun ancien : le neuf seul complète, et belowMinimum reste vrai s’il en manque', () => {
    const res = run([c({ key: 'n1', isNewBuild: true })]);
    expect(res.ranked.map((r) => [r.candidate.key, r.newBuildComplement])).toEqual([['n1', true]]);
    expect(res.belowMinimum).toBe(true);
  });

  it('le neuf ajouté n’est jamais coché d’office', () => {
    const res = run([c({ key: 'a1' }), c({ key: 'n1', isNewBuild: true })]);
    const { shown, preselected } = splitVisible(res.ranked);
    expect(shown.map((r) => r.candidate.key)).toEqual(['a1', 'n1']);
    expect(preselected.map((r) => r.candidate.key)).toEqual(['a1']);
  });
});

describe('lectures des portails : même règle', () => {
  it('« refait à neuf » sur une carte M&A reste de l’ancien ; « Immobilier neuf - » est du neuf', () => {
    const cards = extractSearchResults(
      [
        '<article id="1" itemtype="https://schema.org/Apartment"><a href="/views/ficheAnnonce.php?IdAnnonce=1"></a>',
        '<img alt="Appartement refait à neuf à vendre à NICE  - 4 pièces 80 m²"></article>',
        '<article id="2" itemtype="https://schema.org/Apartment"><a href="/views/ficheAnnonce.php?IdAnnonce=2"></a>',
        '<img alt="Immobilier neuf - Appartement à vendre à NICE  - 4 pièces 80 m²"></article>',
      ].join(''),
      'https://www.maisonsetappartements.fr/',
      'maisons_appartements',
    );
    expect(cards.map((card) => [card.key, card.isNewBuild])).toEqual([
      ['1', false],
      ['2', true],
    ]);
  });

  it('un programme Bien’ici aux bornes complète une liste de 2 anciens, avec la mention', () => {
    const programme = c({
      key: 'mki-1',
      url: 'https://www.bienici.com/annonce/vente/nice/programme/4pieces/mki-1',
      isNewBuild: true,
    });
    const res = rankCandidates(
      CRITERIA,
      [portal([c({ key: 'a1' }), c({ key: 'a2' })]), { ...portal([programme]), portal: 'bienici' }],
      PREFS,
    );
    expect(res.ranked.map((r) => [r.candidate.key, r.newBuildComplement])).toEqual([
      ['a1', false],
      ['a2', false],
      ['mki-1', true],
    ]);
  });
});
