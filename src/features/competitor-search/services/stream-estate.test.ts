import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import fixture from '@/features/competitor-search/__fixtures__/stream-estate-nice-4p.json';
import proximityFixture from '@/features/competitor-search/__fixtures__/stream-estate-nice-4p-proximite.json';
import { learnFromDecisions } from '@/features/competitor-search/services/learn-from-decisions';
import { rankCandidates } from '@/features/competitor-search/services/rank-candidates';
import {
  buildStreamEstateQuery,
  IMPORTABLE_HOST_SUFFIXES,
  isImportableUrl,
  parisDateTime,
  parseStreamEstateResponse,
} from '@/features/competitor-search/services/stream-estate';
import {
  STREAM_ESTATE_LABEL,
  STREAM_ESTATE_SOURCE,
  type CompetitorSearchCriteria,
  type PortalSearchResult,
} from '@/features/competitor-search/types';

// Fixture : vraie réponse de l'API (recherche « appartement 4 p, 72–88 m², 400–480 k€, Nice »,
// 05/10/2026), réduite à 5 biens et ANONYMISÉE — contacts, descriptions et références d'agence
// retirés ; il ne reste que les champs lus par le service.

const NICE_4P: CompetitorSearchCriteria = {
  city: 'Nice',
  postalCode: '06000',
  propertyType: 'Appartement',
  district: null,
  surfaceArea: 80,
  roomsCount: 4,
  advisorPriceMin: 400000,
  advisorPriceMax: 480000,
};

const PREFS = learnFromDecisions([]);
const NOW = new Date('2026-10-05T13:16:18Z'); // 15:16:18 à Paris

function query(criteria: Partial<CompetitorSearchCriteria>): Record<string, string> {
  const built = buildStreamEstateQuery({ ...NICE_4P, ...criteria }, '06088', NOW);
  if (!built.ok) throw new Error(built.reason);
  return Object.fromEntries(built.params);
}

describe('buildStreamEstateQuery', () => {
  it('traduit le bien vendeur : mêmes bornes que les portails, 30 jours, une page de 20', () => {
    expect(query({})).toEqual({
      transactionType: '0',
      'propertyTypes[]': '0',
      'includedInseeCodes[]': '06088',
      roomMin: '4',
      roomMax: '4',
      surfaceMin: '72',
      surfaceMax: '88',
      budgetMin: '400000',
      budgetMax: '480000',
      expired: 'false',
      fromUpdatedAt: '2026-09-05 15:16:18',
      itemsPerPage: '20',
    });
  });

  it('applique le plancher de ±3 m² à un petit bien (20 m² → 17–23 m²)', () => {
    expect(query({ surfaceArea: 20, roomsCount: 1 })).toMatchObject({
      surfaceMin: '17',
      surfaceMax: '23',
    });
  });

  it('cherche une maison avec le type 1', () => {
    expect(query({ propertyType: 'Maison' })['propertyTypes[]']).toBe('1');
  });

  it('refuse un type autre qu’appartement ou maison, ou inconnu', () => {
    expect(buildStreamEstateQuery({ ...NICE_4P, propertyType: 'Terrain' }, '06088', NOW)).toEqual({
      ok: false,
      reason: 'unsupported_type',
    });
    expect(buildStreamEstateQuery({ ...NICE_4P, propertyType: null }, '06088', NOW).ok).toBe(false);
  });

  it('n’envoie pas ce que le bien vendeur ne dit pas', () => {
    const params = query({
      roomsCount: null,
      surfaceArea: null,
      advisorPriceMin: null,
      advisorPriceMax: null,
    });
    for (const key of [
      'roomMin',
      'roomMax',
      'surfaceMin',
      'surfaceMax',
      'budgetMin',
      'budgetMax',
    ]) {
      expect(params).not.toHaveProperty(key);
    }
  });

  it('une seule borne de prix vaut pour les deux (comme le classement)', () => {
    expect(query({ advisorPriceMin: null })).toMatchObject({
      budgetMin: '480000',
      budgetMax: '480000',
    });
  });

  it('écrit la date à l’heure de Paris (heure d’hiver comprise)', () => {
    expect(parisDateTime(new Date('2026-12-01T08:00:00Z'))).toBe('2026-12-01 09:00:00');
  });
});

describe('parseStreamEstateResponse', () => {
  const parsed = parseStreamEstateResponse(fixture, NOW)!;

  it('compte les annonces facturées (renvoyées) et le total annoncé', () => {
    expect(parsed.billed).toBe(5);
    expect(parsed.totalItems).toBe(1435);
    expect(parsed.unreadable).toBe(0);
    // Le bien publié seulement sur ParuVendu est facturé, puis écarté par la liste blanche.
    expect(parsed.outsideWhitelist).toBe(1);
    expect(parsed.candidates).toHaveLength(4);
  });

  it('fait de chaque bien un candidat, avec ses faits Stream Estate', () => {
    expect(parsed.candidates[0]).toEqual({
      key: '828d2950-aa3c-4c9b-89df-dcd8e0bc8cde',
      url: 'https://www.bienici.com/annonce/apimo-87251688',
      title: 'vente - appartement',
      price: 429000,
      surfaceArea: 73,
      roomsCount: 4,
      propertyType: 'apartment',
      pricePerSqm: expect.any(Number),
      landArea: null,
      city: 'Nice',
      photoUrls: expect.any(Array),
      isNewBuild: false,
      streamEstate: {
        propertyId: '828d2950-aa3c-4c9b-89df-dcd8e0bc8cde',
        originSite: "Bien'ici",
        onlineSince: '2026-09-21T16:53:52+02:00',
        lastSeenAt: '2026-09-28T17:24:40+02:00',
        priceDrops: [-4.45],
      },
      // Cette fixture ne porte ni position ni équipements : tout reste inconnu, donc neutre.
      features: {
        location: null,
        locationDiscarded: false,
        district: null,
        floor: null,
        hasElevator: null,
        hasPool: null,
        parking: null,
        outdoor: null,
        condition: null,
        exposure: null,
        constructionYear: null,
      },
    });
  });

  it('prend pour origine une annonce encore en ligne, sur un site relisible', () => {
    // 6 annonces : leboncoin et SeLoger expirées, Bien'ici et Figaro en ligne.
    const origin = new URL(parsed.candidates[0].url).hostname;
    expect(['www.bienici.com', 'immobilier.lefigaro.fr']).toContain(origin);
  });

  it('liste blanche : aucun bien sans annonce sur un site que l’extension relit', () => {
    expect(parsed.candidates.some((c) => c.url.includes('paruvendu.fr'))).toBe(false);
    for (const candidate of parsed.candidates) {
      expect(isImportableUrl(candidate.url)).toBe(true);
    }
  });

  it('sur une vraie réponse de 30 biens : 7 hors liste, 3 sans origine utilisable, 20 admis', () => {
    // 3 seulement sur ParuVendu, 4 seulement sur Superimmo ; les biens multi-sites restent.
    const real = parseStreamEstateResponse(proximityFixture, NOW)!;
    expect(real).toMatchObject({
      billed: 30,
      outsideWhitelist: 7,
      expiredOrigin: 3,
      unreadable: 0,
    });
    expect(real.candidates).toHaveLength(20);
    expect(real.candidates.every((c) => isImportableUrl(c.url))).toBe(true);
  });

  it('un bien Leboncoin + SeLoger est admis, avec SeLoger pour origine', () => {
    const seloger = 'https://www.seloger.com/annonces/achat/appartement/nice-06/250123456.htm';
    const property = {
      ...fixture['hydra:member'][1],
      uuid: 'lbc-seloger',
      adverts: [
        // Leboncoin vu plus récemment et en ligne : il ne devient pas l'origine pour autant.
        {
          url: 'https://www.leboncoin.fr/ad/ventes_immobilieres/3000000001',
          expired: false,
          lastCrawledAt: '2026-10-05T10:00:00+02:00',
        },
        { url: seloger, expired: false, lastCrawledAt: '2026-10-01T10:00:00+02:00' },
      ],
    };
    const result = parseStreamEstateResponse({ 'hydra:member': [property] }, NOW)!;
    expect(result.outsideWhitelist).toBe(0);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].url).toBe(seloger);
    expect(result.candidates[0].streamEstate?.originSite).toBe('SeLoger');
  });

  it('un bien seulement sur Leboncoin est écarté et compté, pas « illisible »', () => {
    const property = {
      ...fixture['hydra:member'][1],
      adverts: [{ url: 'https://www.leboncoin.fr/ad/ventes_immobilieres/3000000001' }],
    };
    expect(parseStreamEstateResponse({ 'hydra:member': [property] }, NOW)).toMatchObject({
      billed: 1,
      outsideWhitelist: 1,
      unreadable: 0,
      candidates: [],
    });
  });

  it('retire les marqueurs de suivi des adresses', () => {
    for (const candidate of parsed.candidates) {
      expect(candidate.url).not.toMatch(/utm_/);
    }
  });

  it('ne laisse passer aucune donnée de contact', () => {
    expect(JSON.stringify(parsed.candidates)).not.toMatch(/contact|phone|email/i);
  });

  it('déduplique par l’identifiant du bien chez Stream Estate (chaque bien reste facturé)', () => {
    const members = fixture['hydra:member'];
    const twice = { ...fixture, 'hydra:member': [...members, members[0]] };
    const result = parseStreamEstateResponse(twice, NOW)!;
    expect(result.billed).toBe(6);
    expect(result.candidates).toHaveLength(4);
  });

  it('compte, sans le deviner, un bien sans annonce exploitable', () => {
    const broken = { ...fixture['hydra:member'][1], adverts: [] };
    const result = parseStreamEstateResponse({ 'hydra:member': [broken] }, NOW)!;
    expect(result).toMatchObject({ billed: 1, unreadable: 1, candidates: [] });
  });

  it('rend null sur une réponse qui n’a pas la forme attendue', () => {
    expect(parseStreamEstateResponse({ error: 'Access Denied' }, NOW)).toBeNull();
  });
});

describe('annonce d’origine utilisable : pas expirée, revue il y a 7 jours au plus', () => {
  const real = parseStreamEstateResponse(proximityFixture, NOW)!;
  const members = proximityFixture['hydra:member'];
  const member = (prefix: string) => members.find((property) => property.uuid.startsWith(prefix))!;
  const shown = (prefix: string) => real.candidates.some((c) => c.key!.startsWith(prefix));

  it('vraie réponse : le bien reste « en ligne » par une annonce hors liste, ses annonces SeLoger sont mortes', () => {
    // Le bien n'est pas expiré pour l'API (une annonce ParuVendu tient), mais toutes ses annonces
    // SeLoger le sont : plus d'annonce d'origine, il n'est pas affiché.
    for (const prefix of ['ddb86cb7', 'e8aec357']) {
      const property = member(prefix);
      expect(property.expired).toBe(false);
      const whitelisted = property.adverts.filter((advert) => isImportableUrl(advert.url));
      expect(whitelisted.length).toBeGreaterThan(0);
      expect(whitelisted.every((advert) => advert.expired)).toBe(true);
      expect(shown(prefix)).toBe(false);
    }
  });

  it('vraie réponse : le bien paraît vu il y a 6 jours, mais grâce à une AUTRE annonce', () => {
    // Seule annonce en ligne sur un site relisible : Figaro, pas revue depuis 10 jours. Le
    // passage du 29/09 sur le bien vient d'une annonce SeLoger… expirée.
    const property = member('e46243c9');
    const daysAgo = (at: string) => (NOW.getTime() - Date.parse(at)) / 86_400_000;
    expect(daysAgo(property.lastCrawledAt)).toBeLessThan(7);
    const alive = property.adverts.filter((a) => isImportableUrl(a.url) && !a.expired);
    expect(alive.map((a) => new URL(a.url).hostname)).toEqual(['immobilier.lefigaro.fr']);
    expect(daysAgo(alive[0].lastCrawledAt)).toBeGreaterThan(7);
    expect(shown('e46243c9')).toBe(false);
  });

  it('chaque bien affiché a une origine non expirée, revue dans les 7 jours', () => {
    for (const candidate of real.candidates) {
      const seenAt = Date.parse(candidate.streamEstate!.lastSeenAt!);
      expect(NOW.getTime() - seenAt).toBeLessThanOrEqual(7 * 86_400_000);
      const advert = member(candidate.key!).adverts.find((a) => a.url === candidate.url);
      if (advert) expect(advert.expired).toBe(false);
    }
  });

  const seloger = 'https://www.seloger.com/annonces/achat/appartement/nice-06/250123456.htm';
  const bienici = 'https://www.bienici.com/annonce/vente/nice/appartement/4pieces/ag-1';
  const one = (adverts: { url: string; expired?: boolean; lastCrawledAt?: string | null }[]) =>
    parseStreamEstateResponse(
      { 'hydra:member': [{ ...fixture['hydra:member'][1], uuid: 'x', adverts }] },
      NOW,
    )!;

  it('borne : revue il y a 7 jours pile → gardée ; une seconde de plus → écartée', () => {
    const exactly = new Date(NOW.getTime() - 7 * 86_400_000).toISOString();
    const tooOld = new Date(NOW.getTime() - 7 * 86_400_000 - 1000).toISOString();
    expect(one([{ url: seloger, expired: false, lastCrawledAt: exactly }]).candidates).toHaveLength(
      1,
    );
    expect(one([{ url: seloger, expired: false, lastCrawledAt: tooOld }])).toMatchObject({
      expiredOrigin: 1,
      candidates: [],
    });
  });

  it('sans date de passage du robot, l’annonce n’est pas utilisable', () => {
    expect(one([{ url: seloger, expired: false, lastCrawledAt: null }])).toMatchObject({
      expiredOrigin: 1,
      outsideWhitelist: 0,
      candidates: [],
    });
  });

  it('une annonce expirée cède la place à une autre annonce relisible encore vivante', () => {
    const result = one([
      { url: seloger, expired: true, lastCrawledAt: '2026-10-05T10:00:00+02:00' },
      { url: bienici, expired: false, lastCrawledAt: '2026-10-02T10:00:00+02:00' },
    ]);
    expect(result.candidates.map((c) => c.url)).toEqual([bienici]);
  });

  it('une annonce Leboncoin fraîche ne sauve pas une origine morte', () => {
    expect(
      one([
        {
          url: 'https://www.leboncoin.fr/ad/ventes_immobilieres/1',
          expired: false,
          lastCrawledAt: '2026-10-05T10:00:00+02:00',
        },
        { url: seloger, expired: true, lastCrawledAt: '2026-10-04T10:00:00+02:00' },
      ]),
    ).toMatchObject({ expiredOrigin: 1, outsideWhitelist: 0, candidates: [] });
  });
});

describe('les biens Stream Estate passent par rankCandidates', () => {
  const parsed = parseStreamEstateResponse(fixture, NOW)!;
  const portal: PortalSearchResult = {
    portal: STREAM_ESTATE_SOURCE,
    label: STREAM_ESTATE_LABEL,
    searchUrl: '',
    status: 'ok',
    message: null,
    candidates: parsed.candidates,
  };

  it('mêmes filtres que les portails : les 4 biens importables de la fixture sont admis', () => {
    const search = rankCandidates(NICE_4P, [portal], PREFS);
    expect(search.ranked).toHaveLength(4);
    expect(search.ranked.every((entry) => entry.portal === STREAM_ESTATE_SOURCE)).toBe(true);
    expect(search.ranked[0].portalLabel).toBe(STREAM_ESTATE_LABEL);
  });

  it('mêmes filtres : un bien hors fourchette n’entre pas', () => {
    const search = rankCandidates({ ...NICE_4P, advisorPriceMax: 440000 }, [portal], PREFS);
    // 429 000 et 428 000 restent ; 475 000 et 450 000 sortent (457 000, ParuVendu, n'est pas là).
    expect(search.ranked.map((entry) => entry.candidate.price).sort()).toEqual([428000, 429000]);
  });

  it('mêmes mentions : un bien admis grâce à l’élargissement de la surface le dit', () => {
    // Bien vendeur de 77 m² : ±5 % = 73,15–80,85 m², seul 79 m² entre. Moins de 6 à
    // chaque cran → dernier cran ; 72, 73 et 83,1 m² n'entrent que grâce à l'élargissement.
    const search = rankCandidates({ ...NICE_4P, surfaceArea: 77 }, [portal], PREFS);
    expect(search.loosening.surfaceLoosened).toBe(true);
    const loosened = search.ranked.filter((entry) => entry.loosenedSurface);
    expect(loosened.map((entry) => entry.candidate.surfaceArea).sort()).toEqual([72, 73, 83.1]);
  });
});

describe('IMPORTABLE_HOST_SUFFIXES', () => {
  it('reste la liste des sites que l’extension sait relire', () => {
    const source = readFileSync(path.resolve('extension/page-readiness.js'), 'utf8');
    const block = source.match(/export const ALLOWED_HOST_SUFFIXES = \[([^\]]*)\]/)![1];
    const extensionHosts = [...block.matchAll(/'([^']+)'/g)].map((match) => match[1]);
    expect(IMPORTABLE_HOST_SUFFIXES).toEqual(extensionHosts);
  });
});
