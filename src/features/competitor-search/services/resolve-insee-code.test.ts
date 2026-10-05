import { describe, expect, it } from 'vitest';

import {
  geoCommunesUrl,
  pickInseeCode,
  type GeoCommune,
} from '@/features/competitor-search/services/resolve-insee-code';

// Réponses de geo.api.gouv.fr telles que relevées le 05/10/2026 (données publiques).
const NICE: GeoCommune = {
  nom: 'Nice',
  code: '06088',
  codesPostaux: ['06000', '06100', '06200', '06300'],
};
const NICEY: GeoCommune = { nom: 'Nicey', code: '21454', codesPostaux: ['21330'] };
const PARIS: GeoCommune = { nom: 'Paris', code: '75056', codesPostaux: ['75011', '75018'] };

describe('pickInseeCode', () => {
  it('trouve la commune au nom exact et au code postal', () => {
    expect(pickInseeCode([NICE], 'Nice', '06000')).toEqual({
      ok: true,
      code: '06088',
      name: 'Nice',
    });
  });

  it('écarte les communes au nom seulement voisin (recherche approchée de l’API)', () => {
    expect(pickInseeCode([NICE, NICEY], 'Nice', null)).toMatchObject({ ok: true, code: '06088' });
  });

  it('ne retient pas une commune dont le code postal ne correspond pas', () => {
    expect(pickInseeCode([NICE], 'Nice', '21330')).toEqual({ ok: false, reason: 'not_found' });
  });

  it('refuse de choisir entre deux homonymes sans code postal', () => {
    const homonyms: GeoCommune[] = [
      { nom: 'Saint-Martin', code: '32389', codesPostaux: ['32300'] },
      { nom: 'Saint-Martin', code: '54480', codesPostaux: ['54450'] },
    ];
    expect(pickInseeCode(homonyms, 'Saint-Martin', null)).toEqual({
      ok: false,
      reason: 'ambiguous',
    });
    expect(pickInseeCode(homonyms, 'Saint-Martin', '54450')).toMatchObject({ code: '54480' });
  });

  it('tolère accents, tirets et « St » dans le nom saisi', () => {
    const commune: GeoCommune = {
      nom: 'Saint-Étienne',
      code: '42218',
      codesPostaux: ['42000', '42100', '42230'],
    };
    expect(pickInseeCode([commune], 'st etienne', '42000')).toMatchObject({
      ok: true,
      code: '42218',
    });
  });

  it('ne cherche pas à Paris, Lyon ou Marseille sans arrondissement', () => {
    expect(pickInseeCode([PARIS], 'Paris', '75011')).toEqual({
      ok: false,
      reason: 'arrondissements',
    });
  });

  it('ne trouve rien dans une réponse vide', () => {
    expect(pickInseeCode([], 'Nice', '06000')).toEqual({ ok: false, reason: 'not_found' });
  });
});

describe('geoCommunesUrl', () => {
  it('interroge par nom et code postal', () => {
    const url = new URL(geoCommunesUrl('Nice', '06000'));
    expect(url.origin + url.pathname).toBe('https://geo.api.gouv.fr/communes');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      nom: 'Nice',
      codePostal: '06000',
      fields: 'nom,code,codesPostaux',
      format: 'json',
    });
  });

  it('sans code postal, par le nom seul', () => {
    expect(new URL(geoCommunesUrl('Nice', null)).searchParams.has('codePostal')).toBe(false);
  });
});
