import { describe, expect, it } from 'vitest';

import fixture from '@/features/competitor-search/__fixtures__/stream-estate-saint-laurent-du-var.json';
import { showBatchImport } from '@/features/competitor-search/services/batch-import-visibility';
import { learnFromDecisions } from '@/features/competitor-search/services/learn-from-decisions';
import { rankCandidates } from '@/features/competitor-search/services/rank-candidates';
import { parseStreamEstateResponse } from '@/features/competitor-search/services/stream-estate';
import {
  STREAM_ESTATE_SOURCE,
  STREAM_ESTATE_LABEL,
  type CompetitorSearchCriteria,
  type PortalSearchResult,
  type StreamEstateTier,
} from '@/features/competitor-search/types';
import { communeKey } from '@/features/competitor-search/utils/commune-name';
import {
  describeStreamEstateSearch,
  type StreamEstateSearchNote,
} from '@/features/competitor-search/services/stream-estate-summary';

// Mission 71 §1 — LA DISPARITION DU BOUTON D'IMPORT GROUPÉ (essai de Laurent à
// Saint-Laurent-du-Var). Fixture : vraie réponse de l'API du 06/10 (appartements, commune 06123),
// réduite aux champs lus. La cause : le bien vendeur écrit « St Laurent du Var », l'API
// « Saint-Laurent-du-Var » ; le garde-fou « commune » du classement comparait les noms à la casse
// près et écartait TOUS les biens. Les cartes restaient dans le bloc Stream Estate, la liste
// classée était vide, et le bouton (qui ne vivait que dans la liste classée) disparaissait.

const NOW = new Date('2026-10-06T18:00:00Z');
const PREFS = learnFromDecisions([]);

const SLV: CompetitorSearchCriteria = {
  city: 'St Laurent du Var',
  postalCode: '06700',
  propertyType: 'Appartement',
  district: null,
  surfaceArea: 63,
  roomsCount: 3,
  advisorPriceMin: 370000,
  advisorPriceMax: 450000,
};

const parsed = parseStreamEstateResponse(fixture, NOW)!;
const portal = (
  tiers: StreamEstateTier[] = [],
  options: { asOld?: boolean } = {},
): PortalSearchResult => ({
  portal: STREAM_ESTATE_SOURCE,
  label: STREAM_ESTATE_LABEL,
  searchUrl: '',
  status: 'ok',
  message: null,
  candidates: parsed.candidates.map((candidate, index) => ({
    ...candidate,
    isNewBuild: options.asOld ? false : candidate.isNewBuild,
    streamEstate: { ...candidate.streamEstate!, tier: tiers[index] ?? 1 },
  })),
});

describe('le bouton d’import groupé ne disparaît plus (Saint-Laurent-du-Var)', () => {
  it('« St Laurent du Var » et « Saint-Laurent-du-Var » sont la même commune', () => {
    expect(communeKey('St Laurent du Var')).toBe(communeKey('Saint-Laurent-du-Var'));
    expect(communeKey('ST-LAURENT-DU-VAR')).toBe(communeKey('Saint-Laurent-du-Var'));
    expect(communeKey('Ste Maxime')).toBe(communeKey('Sainte-Maxime'));
    expect(communeKey('Saint-Laurent-du-Var')).not.toBe(communeKey('Saint-Laurent'));
  });

  it('les biens de la commune sont classés, par le code INSEE comme par le nom', () => {
    const byInsee = rankCandidates(SLV, [portal()], PREFS, { subjectInseeCode: '06123' });
    const byName = rankCandidates(SLV, [portal()], PREFS);
    const keys = (search: typeof byInsee) =>
      search.ranked.map((entry) => entry.candidate.price).sort();
    // 3 pièces de 62 à 65 m², de 375 000 à 440 000 € ; les autres sont hors bornes ou pas
    // importables (superimmo, vizzit). Ces trois-là sont NEUFS (titre SeLoger « Appartement neuf
    // à vendre », livraison 2028) : ils n'entrent qu'en complément, faute de 3 dans l'ancien.
    expect(keys(byInsee)).toEqual([375000, 378000, 440000]);
    expect(keys(byName)).toEqual(keys(byInsee));
  });

  it('le bouton est visible dès qu’un candidat est affiché', () => {
    const search = rankCandidates(SLV, [portal()], PREFS, { subjectInseeCode: '06123' });
    expect(showBatchImport(search.ranked, [portal()])).toBe(true);
  });

  it('même si le classement n’en garde aucun : les cartes du bloc suffisent', () => {
    expect(showBatchImport([], [portal()])).toBe(true);
  });

  it('rien d’affiché : pas de bouton', () => {
    expect(showBatchImport([], null)).toBe(false);
    expect(showBatchImport([], [{ ...portal(), status: 'empty', candidates: [] }])).toBe(false);
  });

  it('un code INSEE différent n’est pas la même commune, même au même nom', () => {
    const elsewhere = rankCandidates(SLV, [portal()], PREFS, { subjectInseeCode: '06088' });
    expect(elsewhere.ranked).toEqual([]);
  });
});

describe('la ligne de bilan', () => {
  const note: StreamEstateSearchNote = {
    billed: 37,
    stop: 'exhausted',
    tiers: [
      { tier: 1, billed: 10, kept: 1, fallback: false },
      { tier: 6, billed: 27, kept: 2, fallback: false },
    ],
    counts: {
      unreadable: 0,
      outsideWhitelist: 2,
      expiredOrigin: 0,
      otherCommune: 1,
      unverifiedPosition: 0,
    },
    newBuild: 0,
    located: true,
    communeName: 'Saint-Laurent-du-Var',
    inseeCode: '06123',
  };

  it('compte les comparables proposés par cran, et le coût', () => {
    // Parmi les candidats lus, les 3 admis sont aux places 1, 2 et 5 ; on les traite en ancien
    // (le neuf en complément n'est pas compté, test suivant) et on leur donne trois crans.
    const tiers: StreamEstateTier[] = [1, 1, 2, 1, 1, 6, 1, 1];
    const search = rankCandidates(SLV, [portal(tiers, { asOld: true })], PREFS, {
      subjectInseeCode: '06123',
    });
    const summary = describeStreamEstateSearch(search.ranked, note);
    expect(summary.headline).toBe(
      '3 comparables : 1 identique, 1 plus grand, 1 à moins de 10 km — 37 annonces facturées (0,37 €)',
    );
    expect(summary.details[0]).toBe(
      'Moins de 10 : plus aucun bien après le dernier cran (rayon de 10 km).',
    );
    expect(summary.details).toContain(
      'Écartés, mais facturés : 1 bien hors de Saint-Laurent-du-Var à un cran « même ville » · 2 biens sans annonce sur un site que l’extension relit.',
    );
  });

  it('le neuf ajouté en complément n’est pas compté comme comparable', () => {
    const search = rankCandidates(SLV, [portal()], PREFS, { subjectInseeCode: '06123' });
    expect(search.ranked.every((entry) => entry.newBuildComplement)).toBe(true);
    expect(describeStreamEstateSearch(search.ranked, note).headline).toMatch(/^0 comparable —/);
  });

  it('au plafond, il le dit ; sans adresse localisée, aussi', () => {
    const summary = describeStreamEstateSearch([], {
      ...note,
      billed: 60,
      stop: 'cap',
      located: false,
      tiers: [{ tier: 1, billed: 60, kept: 0, fallback: true }],
    });
    expect(summary.headline).toBe('0 comparable — 60 annonces facturées (0,60 €)');
    expect(summary.details[0]).toBe(
      'Moins de 10 : plafond de 60 annonces facturées atteint, la recherche s’arrête là.',
    );
    expect(summary.details[1]).toMatch(/^Adresse du bien non localisée/);
    expect(summary.details[2]).toMatch(/^Cran 1 : communes voisines non exclues/);
  });
});
