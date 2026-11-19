import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { parsePropertyView } from '@/features/academia/services/property-view';
import {
  isShowableBlock,
  parseNeighbourhoodBlocks,
  pickNeighbourhoodBlocks,
  readStoredNeighbourhood,
} from '@/features/neighbourhood-link/services/neighbourhood-blocks';
import { neighbourhoodView } from '@/features/neighbourhood-link/services/neighbourhood-view';
import { CLIENT_TEXTS } from '@/lib/client-texts';
import exempleBienClient from '@/test-fixtures/academia-exemple-bien-client.json';
import exempleBien from '@/test-fixtures/academia-exemple-bien.json';
import advisorView from '@/test-fixtures/academia-vue-bien.json';
import clientView from '@/test-fixtures/academia-vue-bien-client.json';
import { schemaErrors } from '@/test-fixtures/json-schema-check';

// Correctifs 161 — les fichiers de Laurent du 19/11 (`missions/academia-api-laurent/` : le README,
// les deux exemples, réponses exactes du dossier de démonstration, et les deux schémas) : les réponses
// simulées des tests leur sont conformes, le lecteur les suit (la fourchette de surface des ventes,
// rien d'autre de nouveau), la rue inventée du dossier de démonstration ne s'écrit nulle part, et
// l'« anneau » vide est dit tel qu'ACM l'affiche aujourd'hui.

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => undefined }) }));
vi.mock('@/features/subject-property/actions/save-advisor-range', () => ({
  saveAdvisorRange: async () => ({ ok: true }),
}));
const { AddressViewPanel } = await import('@/features/academia/components/address-view-panel');

const NB = ' ';
const schema = (name: string) =>
  JSON.parse(readFileSync(`missions/academia-api-laurent/${name}`, 'utf8')) as Record<
    string,
    unknown
  >;
const SCHEMA_BIEN = schema('schema-bien.json');
const SCHEMA_CLIENT = schema('schema-bien-client.json');

describe('les réponses simulées suivent les schémas de Laurent', () => {
  it('ses deux exemples, et nos réponses simulées des deux vues', () => {
    expect(schemaErrors(SCHEMA_BIEN, exempleBien)).toEqual([]);
    expect(schemaErrors(SCHEMA_CLIENT, exempleBienClient)).toEqual([]);
    expect(schemaErrors(SCHEMA_BIEN, advisorView)).toEqual([]);
    expect(schemaErrors(SCHEMA_CLIENT, clientView)).toEqual([]);
  });

  it('le contrôle voit un champ en trop, un type faux, une valeur hors liste', () => {
    const extra = structuredClone(exempleBienClient) as {
      blocs: { ventes: Record<string, unknown> };
    };
    extra.blocs.ventes.moyenne = 712_000;
    expect(schemaErrors(SCHEMA_CLIENT, extra)).toContain('$.blocs.ventes.moyenne : champ en trop');
    const wrong = structuredClone(exempleBienClient) as {
      blocs: { ventes: Record<string, unknown> };
    };
    wrong.blocs.ventes.surfaceMin = '60';
    wrong.blocs.ventes.type = 'villa';
    const errors = schemaErrors(SCHEMA_CLIENT, wrong);
    expect(errors).toContain('$.blocs.ventes.surfaceMin : string au lieu de number');
    expect(errors).toContain('$.blocs.ventes.type : « villa » hors liste');
  });

  it('la vue « bien-client » ne donne ni le terrain, ni le début de la période, ni le jour', () => {
    const ventes = (SCHEMA_CLIENT.properties as Record<string, Record<string, unknown>>).blocs!
      .properties as Record<
      string,
      { properties: Record<string, { items?: { properties: object } }> }
    >;
    expect(Object.keys(ventes.ventes!.properties)).not.toContain('depuis');
    expect(Object.keys(ventes.ventes!.properties.liste!.items!.properties)).toEqual(
      expect.not.arrayContaining(['terrain', 'date']),
    );
  });
});

describe('le lecteur suit les nouveaux schémas', () => {
  it('le conseiller : la fourchette de surface, l’anneau, chaque vente avec ses pièces', () => {
    const sales = parsePropertyView(exempleBien)!.sales!;
    expect(sales).toMatchObject({
      type: 'appartement',
      surfaceMin: 60,
      surfaceMax: 100,
      listRadius: 50,
      since: 2021,
    });
    expect(sales.list).toHaveLength(8);
    expect(sales.list.map((sale) => sale.rooms)).toEqual([2, 3, 3, 3, 2, 3, 3, 4]);
  });

  it('le vendeur : 37 ventes au mois, la fourchette de surface, « depuis 2021 » écrit par ACM', () => {
    const blocks = parseNeighbourhoodBlocks(exempleBienClient)!;
    expect(blocks.ventes).toMatchObject({
      type: 'appartement',
      surfaceMin: 60,
      surfaceMax: 100,
      listRadius: 250,
      since: null,
    });
    expect(blocks.ventes!.list).toHaveLength(37);
    expect(blocks.ventes!.list.every((sale) => /^\d{4}-\d{2}$/.test(sale.month))).toBe(true);
    expect(neighbourhoodView(blocks, 'ventes', CLIENT_TEXTS.fr, 'fr')).toMatchObject({
      headline: `37 appartements de 60 à 100${NB}m² vendus autour de chez vous depuis 2021`,
      scale: `À moins de 250${NB}m de votre bien`,
    });
    expect(neighbourhoodView(blocks, 'ventes', CLIENT_TEXTS.en, 'en')).toMatchObject({
      headline: `37 flats from 60 to 100${NB}m² sold around you since 2021`,
    });
  });
});

describe('la rue inventée du dossier de démonstration ne s’écrit nulle part (M114)', () => {
  it('ni chez le conseiller, ni chez le vendeur : la vente reste, sans sa rue', () => {
    expect(JSON.stringify(exempleBien)).toMatch(/Avenue de la Demonstration/);
    const advisor = parsePropertyView(exempleBien)!;
    expect(JSON.stringify(advisor.sales)).not.toMatch(/d[eé]monstration/i);
    expect(advisor.sales!.list).toHaveLength(8);
    const blocks = parseNeighbourhoodBlocks(exempleBienClient)!;
    expect(JSON.stringify(blocks.ventes)).not.toMatch(/d[eé]monstration/i);
    expect(JSON.stringify(blocks.permis)).not.toMatch(/d[eé]monstration/i);
    expect(blocks.ventes!.list).toHaveLength(37);
    // Les autres rues restent.
    expect(blocks.ventes!.list.some((sale) => sale.street === 'Boulevard Marechal Juin')).toBe(
      true,
    );
  });

  it('un quartier déjà enregistré avec cette rue la perd à la relecture', () => {
    const kept = pickNeighbourhoodBlocks(parseNeighbourhoodBlocks(clientView)!, ['ventes']);
    const stored = structuredClone(kept) as { ventes: { list: { street: string | null }[] } };
    stored.ventes.list[0]!.street = 'Avenue de la Démonstration';
    expect(JSON.stringify(readStoredNeighbourhood(stored).ventes)).not.toMatch(/démonstration/i);
  });

  it('le panneau du conseiller, rendu dans la démo, ne l’écrit pas', () => {
    const html = renderToStaticMarkup(
      createElement(AddressViewPanel, {
        projectId: 'p1',
        state: {
          kind: 'ready',
          view: parsePropertyView(exempleBien)!,
          facts: { type: 'appartement', rooms: 4, surface: 80 },
        },
        savedRange: { min: null, max: null },
        demo: true,
      }),
    );
    expect(html).not.toMatch(/d[eé]monstration/i);
  });
});

// L'« anneau » vide : aucun cercle ne réunit 5 ventes (README de Laurent). Ce qu'ACM affiche au
// 19/11, avant la décision de Jean-Guy.
describe('l’anneau vide : ce qu’ACM affiche aujourd’hui', () => {
  const withoutRing = (json: unknown, emptyList: boolean) => {
    const copy = structuredClone(json) as { blocs: { ventes: Record<string, unknown> } };
    copy.blocs.ventes.anneau = null;
    if (emptyList) copy.blocs.ventes.liste = [];
    if ('anneaux' in copy.blocs.ventes) {
      copy.blocs.ventes.anneaux = [
        { rayon: 50, ventes: 0 },
        { rayon: 100, ventes: 1 },
        { rayon: 250, ventes: 2 },
        { rayon: 300, ventes: 2 },
        { rayon: 500, ventes: 3 },
        { rayon: 800, ventes: 4 },
      ];
    }
    return copy;
  };

  it('le schéma l’admet', () => {
    expect(schemaErrors(SCHEMA_BIEN, withoutRing(exempleBien, true))).toEqual([]);
    expect(schemaErrors(SCHEMA_CLIENT, withoutRing(exempleBienClient, true))).toEqual([]);
  });

  it('le conseiller : les anneaux comptés, aucun en avant, « Aucune vente comparable relevée »', () => {
    const view = parsePropertyView(withoutRing(exempleBien, true))!;
    expect(view.sales).toMatchObject({ listRadius: null, list: [] });
    const html = renderToStaticMarkup(
      createElement(AddressViewPanel, {
        projectId: 'p1',
        state: { kind: 'ready', view, facts: { type: 'appartement', rooms: 4, surface: 80 } },
        savedRange: { min: null, max: null },
        demo: false,
      }),
    );
    expect(html).toContain('data-testid="address-view-rings"');
    expect(html).not.toContain('la liste ci-dessous');
    expect(html).toContain('Aucune vente comparable relevée autour du bien.');
  });

  it('le vendeur : le bloc reste proposé, « Aucune vente relevée autour de chez vous. », sans échelle', () => {
    const blocks = parseNeighbourhoodBlocks(withoutRing(exempleBienClient, true))!;
    expect(isShowableBlock(blocks, 'ventes')).toBe(true);
    expect(neighbourhoodView(blocks, 'ventes', CLIENT_TEXTS.fr, 'fr')).toMatchObject({
      headline: 'Aucune vente relevée autour de chez vous.',
      scale: null,
      timeline: [],
    });
  });

  it('le vendeur, si une liste arrivait quand même : le titre, sans « À moins de »', () => {
    const blocks = parseNeighbourhoodBlocks(withoutRing(exempleBienClient, false))!;
    expect(neighbourhoodView(blocks, 'ventes', CLIENT_TEXTS.fr, 'fr')).toMatchObject({
      headline: `37 appartements de 60 à 100${NB}m² vendus autour de chez vous depuis 2021`,
      scale: null,
    });
  });
});
