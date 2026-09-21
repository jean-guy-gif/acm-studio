import { describe, expect, it } from 'vitest';

import { rankCandidates } from '@/features/competitor-search/services/rank-candidates';
import { EMPTY_PREFERENCES } from '@/features/competitor-search/services/learn-from-decisions';
import type {
  CompetitorCandidate,
  CompetitorSearchCriteria,
  PortalSearchResult,
} from '@/features/competitor-search/types';

const NO_LEARNING = EMPTY_PREFERENCES;

function candidate(over: Partial<CompetitorCandidate>): CompetitorCandidate {
  return {
    key: over.key ?? 'k',
    url: over.url ?? 'https://x/1',
    title: null,
    price: 400000,
    surfaceArea: 60,
    roomsCount: 3,
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
    searchUrl: 'https://x',
    status: 'ok',
    message: null,
    candidates,
  };
}

// Le bien vendeur porte un type en TEXTE LIBRE FRANÇAIS (comme le formulaire) : la
// garde doit le normaliser (« appartement » → apartment) pour comparer aux cartes.
const CRITERIA: CompetitorSearchCriteria = {
  city: 'Nice',
  postalCode: '06000',
  propertyType: 'appartement',
  district: null,
  surfaceArea: 60,
  roomsCount: 3,
  advisorPriceMin: 380000,
  advisorPriceMax: 450000,
};

// §5 point 8 — le type de bien n'est JAMAIS relâché : un type DIFFÉRENT du bien
// vendeur n'entre pas dans la liste, quel que soit son score.
describe('rankCandidates — garde de type de bien', () => {
  it('normalise le type FRANÇAIS du bien vendeur (« Maison 3 pièces ») et écarte les appartements', () => {
    const ranked = rankCandidates(
      { ...CRITERIA, propertyType: 'Maison 3 pièces' },
      [
        portal([
          candidate({ key: 'maison', url: 'https://x/maison', propertyType: 'house' }),
          candidate({
            key: 'appart',
            url: 'https://x/appart',
            surfaceArea: 75,
            propertyType: 'apartment',
          }),
        ]),
      ],
      NO_LEARNING,
    );
    expect(ranked.map((r) => r.candidate.key)).toEqual(['maison']);
  });

  it('écarte une maison d’une recherche d’appartement, même bien notée', () => {
    const ranked = rankCandidates(
      CRITERIA,
      [
        portal([
          candidate({ key: 'appart', url: 'https://x/appart', propertyType: 'apartment' }),
          candidate({ key: 'maison', url: 'https://x/maison', propertyType: 'house' }),
        ]),
      ],
      NO_LEARNING,
    );
    expect(ranked.map((r) => r.candidate.key)).toEqual(['appart']);
  });

  it('écarte un parking (box) d’une recherche d’appartement — jamais devant un vendeur', () => {
    const ranked = rankCandidates(
      CRITERIA,
      [
        portal([
          candidate({ key: 'appart', url: 'https://x/appart', propertyType: 'apartment' }),
          candidate({
            key: 'box',
            url: 'https://x/box',
            price: 30000,
            surfaceArea: 12,
            roomsCount: null,
            propertyType: 'parking',
          }),
        ]),
      ],
      NO_LEARNING,
    );
    expect(ranked.map((r) => r.candidate.key)).toEqual(['appart']);
  });

  it('garde une annonce dont le type est inconnu (on n’exclut pas pour une absence)', () => {
    const ranked = rankCandidates(
      CRITERIA,
      [
        portal([
          candidate({ key: 'connu', url: 'https://x/connu', propertyType: 'apartment' }),
          // Surface différente : sinon la même signature prix+surface+pièces+commune
          // les dédupliquerait, ce qui masquerait ce qu'on veut vérifier (la garde de
          // type ne s'applique pas à un type inconnu).
          candidate({
            key: 'inconnu',
            url: 'https://x/inconnu',
            surfaceArea: 75,
            propertyType: null,
          }),
        ]),
      ],
      NO_LEARNING,
    );
    expect(ranked.map((r) => r.candidate.key).sort()).toEqual(['connu', 'inconnu']);
  });
});
