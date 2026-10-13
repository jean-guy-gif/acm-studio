import { describe, expect, it } from 'vitest';

import {
  geoCommuneLookupUrl,
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
      centre: null,
      departement: null,
      display: 'Nice',
      arrondissement: null,
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
    expect(pickInseeCode([PARIS], 'Paris', null)).toEqual({
      ok: false,
      reason: 'arrondissements',
    });
  });

  // Mission 99 — réponses de geo.api.gouv.fr relevées le 12/10/2026, communes et arrondissements
  // municipaux dans la même réponse.
  const centre = (lon: number, lat: number) => ({ coordinates: [lon, lat] as [number, number] });
  const PARIS_15 = [
    {
      nom: 'Paris',
      code: '75056',
      codesPostaux: ['75014', '75015', '75016', '75116'],
      centre: centre(2.347, 48.8589),
      codeDepartement: '75',
    },
    {
      nom: 'Paris 15e Arrondissement',
      code: '75115',
      codesPostaux: ['75015'],
      centre: centre(2.2937, 48.8417),
      codeDepartement: '75',
    },
  ];
  const LYON_3 = [
    { nom: 'Lyon', code: '69123', codesPostaux: ['69003'], codeDepartement: '69' },
    {
      nom: 'Lyon 3e Arrondissement',
      code: '69383',
      codesPostaux: ['69003'],
      centre: centre(4.8685, 45.7514),
      codeDepartement: '69',
    },
  ];
  const MARSEILLE_8 = [
    {
      nom: 'Marseille',
      code: '13055',
      codesPostaux: ['13008'],
      centre: centre(5.3806, 43.2803),
      codeDepartement: '13',
    },
  ];

  it('rattache un bien à son arrondissement par le code postal', () => {
    expect(pickInseeCode(PARIS_15, 'Paris', '75015')).toEqual({
      ok: true,
      code: '75115',
      name: 'Paris',
      centre: { lat: 48.8417, lon: 2.2937 },
      departement: '75',
      display: 'Paris 15e',
      arrondissement: { city: 'paris', number: 15 },
    });
    expect(pickInseeCode(LYON_3, 'Lyon', '69003')).toMatchObject({
      code: '69383',
      name: 'Lyon',
      display: 'Lyon 3e',
      centre: { lat: 45.7514, lon: 4.8685 },
    });
    // Sans l'arrondissement dans la réponse : le centre de la ville, faute de mieux.
    expect(pickInseeCode(MARSEILLE_8, 'Marseille', '13008')).toMatchObject({
      code: '13208',
      name: 'Marseille',
      display: 'Marseille 8e',
      centre: { lat: 43.2803, lon: 5.3806 },
    });
  });

  it('rattache un bien dont la ville est écrite avec son arrondissement', () => {
    for (const city of ['Paris 15e', 'Paris 15ème', 'PARIS 15E ARRONDISSEMENT', 'Paris 15']) {
      expect(pickInseeCode(PARIS_15, city, '75015')).toMatchObject({ ok: true, code: '75115' });
      expect(pickInseeCode(PARIS_15, city, null)).toMatchObject({ ok: true, code: '75115' });
    }
    // 75116 est aussi le 16e.
    expect(pickInseeCode(PARIS_15, 'Paris', '75116')).toMatchObject({ code: '75116' });
  });

  it('ne devine pas quand la ville et le code postal ne disent pas le même arrondissement', () => {
    expect(pickInseeCode(PARIS_15, 'Paris 14e', '75015')).toEqual({
      ok: false,
      reason: 'arrondissements',
    });
  });

  it('une commune ordinaire dit son nom, sans arrondissement', () => {
    expect(pickInseeCode([NICE], 'Nice', '06000')).toMatchObject({
      display: 'Nice',
      arrondissement: null,
    });
  });

  it('ne trouve rien dans une réponse vide', () => {
    expect(pickInseeCode([], 'Nice', '06000')).toEqual({ ok: false, reason: 'not_found' });
  });
});

// Mission 103 — reconnaître la commune d'une adresse tapée : par le code postal, ou par le nom.
describe('geoCommuneLookupUrl', () => {
  it('interroge les communes seules, par le code postal ou par le nom', () => {
    const byPostal = new URL(geoCommuneLookupUrl({ postalCode: '06530' }));
    expect(byPostal.origin + byPostal.pathname).toBe('https://geo.api.gouv.fr/communes');
    expect(Object.fromEntries(byPostal.searchParams)).toEqual({
      codePostal: '06530',
      type: 'commune-actuelle',
      fields: 'nom,code,codesPostaux',
      format: 'json',
    });
    const byName = new URL(geoCommuneLookupUrl({ name: 'saint laurent du var' })).searchParams;
    expect(byName.get('nom')).toBe('saint laurent du var');
    expect(byName.has('codePostal')).toBe(false);
  });
});

describe('geoCommunesUrl', () => {
  it('avec un code postal, interroge par le code postal seul (le nom est comparé ici)', () => {
    const url = new URL(geoCommunesUrl('St Laurent du Var', '06700'));
    expect(url.origin + url.pathname).toBe('https://geo.api.gouv.fr/communes');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      codePostal: '06700',
      type: 'commune-actuelle,arrondissement-municipal',
      fields: 'nom,code,codesPostaux,centre,codeDepartement',
      format: 'json',
    });
  });

  it('« Paris 15e » sans code postal se cherche sous « Paris »', () => {
    expect(new URL(geoCommunesUrl('Paris 15e', null)).searchParams.get('nom')).toBe('Paris');
  });

  it('sans code postal, par le nom seul', () => {
    const params = new URL(geoCommunesUrl('Nice', null)).searchParams;
    expect(params.has('codePostal')).toBe(false);
    expect(params.get('nom')).toBe('Nice');
  });

  it('« St Laurent du Var » retrouve Saint-Laurent-du-Var parmi les communes du code postal', () => {
    const slv: GeoCommune = { nom: 'Saint-Laurent-du-Var', code: '06123', codesPostaux: ['06700'] };
    expect(pickInseeCode([slv], 'St Laurent du Var', '06700')).toMatchObject({ code: '06123' });
  });
});
