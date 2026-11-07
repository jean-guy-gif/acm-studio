import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { readBlocks } from '@/features/address-dossier/services/blocks-schema';
import {
  addressFingerprint,
  buildBlocks,
  type AddressContext,
  type SourceReaders,
} from '@/features/address-dossier/services/build-blocks';
import { priceLine } from '@/features/address-dossier/services/dossier-texts';
import { parseCsv, salesFromCsv, salesYears } from '@/features/address-dossier/services/dvf-sales';
import {
  judgeCondo,
  judgeDpe,
  judgeParcel,
  judgeRisks,
  judgeUrbanism,
  repairMojibake,
} from '@/features/address-dossier/services/judges';
import {
  advisorPricePerM2,
  placement,
  salesData,
  salesRadius,
  salesStats,
} from '@/features/address-dossier/services/sales-stats';
import type { RealSale } from '@/features/address-dossier/types';

// Mission 141 — le dossier d'adresse : les chiffres des ventes réelles, l'élargissement à 1 km, la
// place de l'analyse de valeur, les ventes écartées, une source en panne, et jamais une estimation.

const sale = (pricePerM2: number, distanceM = 100, date = '2025-06-01'): RealSale => ({
  date,
  price: pricePerM2 * 100,
  surface: 100,
  pricePerM2,
  rooms: 4,
  distanceM,
});

describe('médiane et quartiles', () => {
  it('nombre impair : la valeur du milieu ; quartiles par interpolation', () => {
    expect(salesStats([1000, 2000, 3000, 4000, 5000].map((v) => sale(v)))).toEqual({
      count: 5,
      median: 3000,
      q1: 2000,
      q3: 4000,
    });
  });
  it('nombre pair : le milieu des deux valeurs centrales', () => {
    expect(salesStats([1000, 2000, 3000, 4000, 5000, 6000].map((v) => sale(v)))).toEqual({
      count: 6,
      median: 3500,
      q1: 2250,
      q3: 4750,
    });
  });
  it('sous 5 ventes, pas de médiane', () => {
    expect(salesStats([1000, 2000, 3000, 4000].map((v) => sale(v)))).toBeNull();
  });
});

describe('le rayon', () => {
  it('5 ventes à 500 m : 500 m ; 4 : élargi à 1 km', () => {
    const five = [100, 200, 300, 400, 500].map((d) => sale(5000, d));
    expect(salesRadius(five)).toBe(500);
    expect(salesRadius([...five.slice(0, 4), sale(5000, 800)])).toBe(1000);
  });
  it('le bloc compte tout le rayon et ne liste que les plus récentes', () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      sale(4000 + i * 10, 100 + i, `2025-${String((i % 12) + 1).padStart(2, '0')}-01`),
    );
    const data = salesData(many, 'house');
    expect(data.radiusM).toBe(500);
    expect(data.count).toBe(40);
    expect(data.stats?.count).toBe(40);
    expect(data.recent).toHaveLength(20);
    expect(data.latestSaleDate).toBe('2025-12-01');
  });
});

describe('la place de l’analyse de valeur', () => {
  const stats = { count: 14, median: 6850, q1: 6200, q3: 7400 };
  it('aux bornes exactes', () => {
    expect(placement(7401, stats)).toBe('top_quarter');
    expect(placement(7400, stats)).toBe('above_median');
    expect(placement(6850, stats)).toBe('at_median');
    expect(placement(6200, stats)).toBe('below_median');
    expect(placement(6199, stats)).toBe('lowest_quarter');
  });
  it('le prix au m² du conseiller : son analyse sur la surface de la fiche', () => {
    expect(advisorPricePerM2(730_000, 100)).toBe(7300);
    expect(advisorPricePerM2(null, 100)).toBeNull();
    expect(advisorPricePerM2(730_000, null)).toBeNull();
  });
  it('la ligne d’« Avant le rendez-vous »', () => {
    const summary = { radiusM: 500 as const, count: 14, stats, surface: 100 };
    expect(priceLine(summary, 730_000).replace(/[  ]/g, ' ')).toBe(
      'Ventes réelles à 500 m : médiane 6 850 €/m² (14 ventes) · votre analyse de valeur : 7 300 €/m², au-dessus de la médiane.',
    );
    expect(priceLine(summary, null)).toContain('saisissez votre analyse de valeur pour la situer');
    expect(priceLine({ radiusM: 1000, count: 3, stats: null, surface: 100 }, 730_000)).toBe(
      'Ventes réelles à 1 km : 3 ventes, trop peu pour une médiane.',
    );
  });
});

const HEADER =
  'id_mutation,date_mutation,numero_disposition,nature_mutation,valeur_fonciere,adresse_numero,adresse_suffixe,adresse_nom_voie,adresse_code_voie,code_postal,code_commune,nom_commune,code_departement,ancien_code_commune,ancien_nom_commune,id_parcelle,ancien_id_parcelle,numero_volume,lot1_numero,lot1_surface_carrez,lot2_numero,lot2_surface_carrez,lot3_numero,lot3_surface_carrez,lot4_numero,lot4_surface_carrez,lot5_numero,lot5_surface_carrez,nombre_lots,code_type_local,type_local,surface_reelle_bati,nombre_pieces_principales,code_nature_culture,nature_culture,code_nature_culture_speciale,nature_culture_speciale,surface_terrain,longitude,latitude';
const row = (o: {
  id: string;
  date?: string;
  nature?: string;
  price?: number;
  parcel?: string;
  lot?: string;
  type: string;
  surface?: number | '';
  rooms?: number | '';
  culture?: string;
  lon?: number;
  lat?: number;
}) =>
  [
    o.id,
    o.date ?? '2025-03-01',
    '000001',
    o.nature ?? 'Vente',
    o.price ?? 500000,
    '1',
    '',
    '"CHE DES ESSAIS, BAS"',
    '0001',
    '06140',
    '06157',
    'Vence',
    '06',
    '',
    '',
    o.parcel ?? '06157000AB0001',
    '',
    '',
    o.lot ?? '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '0',
    '1',
    o.type,
    o.surface ?? 100,
    o.rooms ?? 4,
    o.culture ?? 'S',
    '',
    '',
    '',
    '',
    o.lon ?? 7.1052,
    o.lat ?? 43.7268,
  ].join(',');

describe('les ventes DVF', () => {
  const point = { lat: 43.7268, lon: 7.1052 };
  const today = new Date('2026-11-07T12:00:00Z');
  it('un logement par vente, du type du bien, à 1 km au plus, sur trois ans', () => {
    const csv = [
      HEADER,
      // Une maison, répétée pour deux natures de culture, avec sa dépendance : une vente.
      row({ id: 'm1', type: 'Maison', culture: 'S' }),
      row({ id: 'm1', type: 'Maison', culture: 'J' }),
      row({ id: 'm1', type: 'Dépendance', surface: '', rooms: 0 }),
      // Deux maisons dans la même vente : pas de prix par logement.
      row({ id: 'm2', type: 'Maison', parcel: '06157000AB0002' }),
      row({ id: 'm2', type: 'Maison', parcel: '06157000AB0003' }),
      // Une maison et un local commercial.
      row({ id: 'm3', type: 'Maison' }),
      row({ id: 'm3', type: 'Local industriel. commercial ou assimilé', surface: 40, rooms: 0 }),
      // Le neuf, une adjudication, un appartement, trop loin, trop ancien, sans surface.
      row({ id: 'm4', type: 'Maison', nature: "Vente en l'état futur d'achèvement" }),
      row({ id: 'm5', type: 'Maison', nature: 'Adjudication' }),
      row({ id: 'm6', type: 'Appartement', lot: '12' }),
      row({ id: 'm7', type: 'Maison', lat: 43.7468 }),
      row({ id: 'm8', type: 'Maison', date: '2023-11-06' }),
      row({ id: 'm9', type: 'Maison', surface: '' }),
    ].join('\n');
    const sales = salesFromCsv([csv], { point, propertyType: 'house', today });
    expect(sales).toEqual([
      { date: '2025-03-01', price: 500000, surface: 100, pricePerM2: 5000, rooms: 4, distanceM: 0 },
    ]);
  });
  it('un nom de voie entre guillemets, virgule comprise', () => {
    expect(parseCsv('a,"b, c",d\n')[0]).toEqual(['a', 'b, c', 'd']);
  });
  it('les années lues : les trois dernières et l’année en cours', () => {
    expect(salesYears(today)).toEqual([2023, 2024, 2025, 2026]);
  });
});

describe('les réponses des sources', () => {
  it('la parcelle : une seule qui contient le point, sinon rien (on ne devine pas)', () => {
    const feature = (numero: string) => ({
      properties: { section: 'AB', numero, contenance: 900 },
    });
    expect(judgeParcel({ features: [feature('0498')] })).toEqual({
      section: 'AB',
      number: '0498',
      area: 900,
    });
    expect(judgeParcel({ features: [feature('0498'), feature('0499')] })).toBeNull();
    expect(judgeParcel({ features: [] })).toBeNull();
    expect(() => judgeParcel({ oops: true })).toThrow();
  });

  it('la copropriété : l’adresse exacte seulement ; un syndic bénévole sans nom', () => {
    const row = (street: string, kind: string, name = 'M. DUPONT JEAN') => ({
      numero_et_voie_adresse_de_reference: street,
      commune_adresse_de_reference: 'VENCE',
      nom_d_usage_de_la_copropriete: 'LES OLIVIERS',
      nombre_total_de_lots: 24,
      nombre_de_lots_a_usage_d_habitation: 12,
      periode_de_construction: 'DE_1961_A_1974',
      type_de_syndic_benevole_professionnel_non_connu: kind,
      raison_sociale_du_representant_legal: name,
      date_de_la_derniere_maj: '2025-08-23',
    });
    const volunteer = judgeCondo(
      {
        data: [
          row('195 PLACE DU GRAND JARDIN', 'bénévole'),
          row('197 PLACE DU GRAND JARDIN', 'professionnel'),
        ],
      },
      '195 place du Grand Jardin',
      'Vence',
    );
    expect(volunteer?.syndic).toEqual({ kind: 'volunteer' });
    expect(JSON.stringify(volunteer)).not.toContain('DUPONT');
    expect(volunteer?.period).toBe('de 1961 à 1974');
    const professional = judgeCondo(
      { data: [row('195 PLACE DU GRAND JARDIN', 'professionnel', 'FONCIA')] },
      '195 place du Grand Jardin',
      'Vence',
    );
    expect(professional?.syndic).toEqual({ kind: 'professional', name: 'FONCIA' });
    expect(
      judgeCondo(
        { data: [row('12 RUE DES LILAS', 'professionnel')] },
        '195 place du Grand Jardin',
        'Vence',
      ),
    ).toBeNull();
    // « r » pour « rue », comme l'écrit le registre (relevé à Paris 15e le 07/11) ; un autre numéro
    // ne correspond pas.
    expect(
      judgeCondo(
        { data: [row('32 r de la convention', 'professionnel', 'NEXITY')] },
        '32 rue de la Convention',
        'Vence',
      ),
    ).toMatchObject({ syndic: { kind: 'professional', name: 'NEXITY' } });
    expect(
      judgeCondo(
        { data: [row('34 r de la convention', 'professionnel')] },
        '32 rue de la Convention',
        'Vence',
      ),
    ).toBeNull();
  });

  it('le DPE : le plus récent à l’adresse, et combien', () => {
    expect(
      judgeDpe({
        total: 2,
        results: [
          {
            date_etablissement_dpe: '2026-09-22',
            etiquette_dpe: 'B',
            etiquette_ges: 'A',
            surface_habitable_logement: 49.3,
            type_batiment: 'maison',
          },
          { date_etablissement_dpe: '2024-07-29', etiquette_dpe: 'C' },
        ],
      }),
    ).toEqual({
      date: '2026-09-22',
      energy: 'B',
      ges: 'A',
      surface: 49.3,
      buildingType: 'maison',
      count: 2,
    });
    expect(judgeDpe({ total: 0, results: [] })).toBeNull();
  });

  it('les risques et l’urbanisme', () => {
    const risks = judgeRisks(
      {
        gaspar: {
          data: [
            {
              risques_detail: [
                { num_risque: '11', libelle_risque_long: 'Inondation' },
                { num_risque: '113', libelle_risque_long: 'Par une crue torrentielle' },
              ],
            },
          ],
        },
        seismic: {
          data: [
            { zone_sismicite: '3 - MODEREE', code_insee: '06161' },
            { zone_sismicite: '4 - MOYENNE', code_insee: '06157' },
          ],
        },
        radon: { data: [{ classe_potentiel: '2' }] },
        clay: { exposition: 'Exposition forte' },
        sites: { casias: { results: 3 }, instructions: { results: 1 } },
        movements: { results: 0 },
      },
      '06157',
    );
    expect(risks).toEqual({
      communeRisks: ['Inondation'],
      seismicZone: '4 - MOYENNE',
      radonClass: '2',
      clayExposure: 'Exposition forte',
      pollutedSites: 4,
      groundMovements: 0,
    });
    const urbanism = judgeUrbanism(
      {
        features: [
          {
            properties: { libelle: 'UAa', libelong: 'Zone UA : vieilles villes et vieux villages' },
          },
        ],
      },
      { features: [{ properties: { suptype: 'ac1', nomsuplitt: 'CathÃ©drale' } }] },
    );
    expect(urbanism?.zone).toEqual({
      code: 'UAa',
      label: 'Zone UA : vieilles villes et vieux villages',
    });
    expect(urbanism?.servitudes).toEqual([
      { code: 'AC1', label: 'Abords de monument historique', name: 'Cathédrale' },
    ]);
    expect(repairMojibake('Fontaine')).toBe('Fontaine');
    // Hors zone d'argiles, la réponse vide est lue comme un objet vide : pas d'exposition.
    expect(
      judgeRisks({
        gaspar: { data: [] },
        seismic: { data: [] },
        radon: { data: [] },
        clay: {},
        sites: {},
        movements: { results: 0 },
      }).clayExposure,
    ).toBeNull();
  });
});

const context: AddressContext = {
  point: { lat: 43.7268, lon: 7.1052 },
  precision: 'housenumber',
  banId: '06157_0600_00013',
  inseeCode: '06157',
  address: '4 chemin des Essais',
  city: 'Vence',
  propertyType: 'house',
};
const readers = (over: Partial<SourceReaders> = {}): SourceReaders => ({
  sales: async () => [100, 200, 300, 400, 450].map((d) => sale(5000, d)),
  dpe: async () => ({
    date: '2026-01-01',
    energy: 'D',
    ges: null,
    surface: null,
    buildingType: 'maison',
    count: 1,
  }),
  risks: async () => ({
    communeRisks: [],
    seismicZone: null,
    radonClass: null,
    clayExposure: null,
    pollutedSites: 0,
    groundMovements: 0,
  }),
  urbanism: async () => null,
  parcel: async () => null,
  condo: async () => null,
  ...over,
});
const NOW = new Date('2026-11-07T10:00:00Z');

describe('une source en panne', () => {
  it('n’empêche pas les autres, et se dit en panne', async () => {
    const { blocks, failures } = await buildBlocks({
      context,
      readers: readers({ risks: async () => Promise.reject(new Error('Géorisques 503')) }),
      previous: null,
      now: NOW,
    });
    expect(blocks.risks).toEqual({ state: 'unavailable', readAt: NOW.toISOString() });
    expect(blocks.sales.state).toBe('ok');
    expect(blocks.dpe.state).toBe('ok');
    expect(blocks.urbanism.state).toBe('empty');
    expect(blocks.parcel).toMatchObject({ state: 'empty', note: 'parcel_undetermined' });
    expect(failures.map((failure) => failure.source)).toEqual(['risks']);
  });
  it('à l’actualisation, garde sa dernière lecture datée', async () => {
    const first = await buildBlocks({ context, readers: readers(), previous: null, now: NOW });
    const later = new Date('2026-11-20T10:00:00Z');
    const { blocks } = await buildBlocks({
      context,
      readers: readers({ dpe: async () => Promise.reject(new Error('ADEME')) }),
      previous: first.blocks,
      now: later,
    });
    expect(blocks.dpe).toMatchObject({
      state: 'ok',
      readAt: NOW.toISOString(),
      failedAt: later.toISOString(),
    });
    expect(blocks.sales.readAt).toBe(later.toISOString());
  });
  it('une adresse à la rue seulement ne lit ni DPE, ni parcelle, ni copropriété ; un terrain, pas de ventes', async () => {
    const { blocks } = await buildBlocks({
      context: { ...context, precision: 'street', banId: null, propertyType: null },
      readers: readers(),
      previous: null,
      now: NOW,
    });
    expect(blocks.dpe).toMatchObject({ state: 'empty', note: 'street_only' });
    expect(blocks.parcel).toMatchObject({ state: 'empty', note: 'street_only' });
    expect(blocks.condo).toMatchObject({ state: 'empty', note: 'street_only' });
    expect(blocks.sales).toMatchObject({ state: 'empty', note: 'not_a_house_or_apartment' });
  });
});

describe('le contenu relu', () => {
  it('une source illisible se lit « en panne », un champ inconnu ne passe pas', async () => {
    const { blocks } = await buildBlocks({ context, readers: readers(), previous: null, now: NOW });
    const stored = JSON.parse(JSON.stringify(blocks));
    stored.sales.data.recent[0].address = '12 rue des Lilas';
    stored.dpe = { state: 'ok', readAt: 'x' };
    const read = readBlocks(stored, '2026-11-07T10:00:00.000Z');
    expect(JSON.stringify(read)).not.toContain('Lilas');
    expect(read.dpe).toEqual({ state: 'unavailable', readAt: '2026-11-07T10:00:00.000Z' });
    expect(read.sales.state).toBe('ok');
  });
  it('l’empreinte change avec l’adresse ou le type', () => {
    const base = {
      address: '4 chemin',
      postalCode: '06140',
      city: 'Vence',
      propertyType: 'Maison',
    };
    expect(addressFingerprint(base)).toBe(addressFingerprint({ ...base, address: ' 4 Chemin ' }));
    expect(addressFingerprint(base)).not.toBe(addressFingerprint({ ...base, address: '5 chemin' }));
    expect(addressFingerprint(base)).not.toBe(
      addressFingerprint({ ...base, propertyType: 'Appartement' }),
    );
  });
});

// Jamais d'estimation (CLAUDE.md, décision du 07/11) : aucun code du dossier d'adresse ne multiplie
// un prix au m² par une surface, et ses textes ne disent ni « estimation » ni « fourchette ».
function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}
describe('jamais une estimation', () => {
  const sources = filesUnder(join(process.cwd(), 'src/features/address-dossier')).filter(
    (path) => !path.endsWith('.test.ts'),
  );
  it('aucune multiplication d’un prix au m² ou d’une médiane par une surface', () => {
    for (const path of sources) {
      const code = readFileSync(path, 'utf8');
      expect(code, path).not.toMatch(
        /(median|q1|q3|pricePerM2|perM2)\s*\*|\*\s*(median|pricePerM2|perM2)|surface\w*\s*\*\s*\w*(median|perM2)/i,
      );
    }
  });
  it('ni « estimation » ni « fourchette » dans les textes', () => {
    for (const path of sources) {
      const strings = readFileSync(path, 'utf8')
        .split('\n')
        .filter((line) => !/^\s*\/\//.test(line))
        .join('\n');
      expect(strings, path).not.toMatch(/estimation|fourchette/i);
    }
  });
});
