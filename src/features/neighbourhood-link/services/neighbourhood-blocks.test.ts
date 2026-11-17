import { describe, expect, it } from 'vitest';

import {
  parseNeighbourhoodBlocks,
  pickNeighbourhoodBlocks,
  readStoredNeighbourhood,
} from '@/features/neighbourhood-link/services/neighbourhood-blocks';
import clientView from '@/test-fixtures/academia-vue-bien-client.json';
import advisorView from '@/test-fixtures/academia-vue-bien.json';

// Mission 159 — test 2 (validé par Jean-Guy le 17/11) : le lecteur de la vue « bien-client », la
// seule qui peut aller au vendeur, est une liste d'autorisation champ par champ. Une réponse piège
// qui contient l'estimation et le DPE n'en laisse rien sortir ; une réponse de la vue « bien »
// (celle du conseiller) passée par erreur n'en laisse sortir ni l'estimation, ni le DPE, ni la
// parcelle, ni le prix au m², ni le numéro d'un permis, ni le terrain, ni la vente à l'adresse.

const FORBIDDEN =
  /estimation|980000|955000|1060000|7263|dpe|etiquette|2600E0000001X|06027000BA0100|"parcelle"|prixM2|pricePerSquareMeter|terrain|"land"|venteALAdresse|atAddress|17 Chemin du Val Fleuri|12 Rue des Oliviers|immatriculation|AC1|Démonstration|fiabilite|anneaux|Rien de relevé|Voirie|V37|UFb4|pavillonnaire|Exposition|MOYENNE|TRI |Inondations|Permis de démolir|secret statistique|PC"/;

describe('parseNeighbourhoodBlocks (la vue « bien-client »)', () => {
  const blocks = parseNeighbourhoodBlocks(clientView);

  it('lit les ventes : le mois, le type, les pièces, la surface, le prix, la distance, la rue', () => {
    expect(blocks?.ventes).toMatchObject({
      source: 'DVF (DGFiP), ventes de logements anciens',
      date: '2026-10-07',
      type: 'maison',
      rooms: 5,
      listRadius: 250,
    });
    expect(blocks?.ventes?.list).toHaveLength(11);
    expect(blocks?.ventes?.list[0]).toEqual({
      month: '2025-11',
      type: 'maison',
      rooms: 5,
      surface: 118,
      price: 876800,
      distance: 100,
      street: 'Boulevard Marechal Juin',
    });
  });

  it('lit l’urbanisme en nombres par niveau et par catégorie, sans phrase, code ni zonage', () => {
    expect(blocks?.urbanisme?.parcel).toEqual({
      counts: {
        voirie: 0,
        alignement: 0,
        equipement: 0,
        logements: 0,
        attente: 0,
        oap: 0,
        perimetre: 0,
      },
      nearest: null,
    });
    expect(blocks?.urbanisme?.within40.nearest).toBeNull();
    expect(blocks?.urbanisme?.within300).toMatchObject({ counts: { voirie: 3 }, nearest: 153 });
  });

  it('lit les permis par la rue, sans adresse numérotée ni numéro de permis', () => {
    expect(blocks?.permis?.build).toEqual([
      {
        authorizedOn: '2025-08-17',
        state: 'termine',
        dwellings: 2,
        surface: 124,
        distance: 234,
        street: 'Chemin du Val Fleuri',
      },
      {
        authorizedOn: '2024-03-12',
        state: 'autorise',
        dwellings: 1,
        surface: 62,
        distance: 128,
        street: 'Rue des Oliviers',
      },
    ]);
  });

  it('lit les risques, la population et la copropriété, sans son nom ni son immatriculation', () => {
    // Les niveaux des échelles officielles, jamais les mots de la source.
    expect(blocks?.risques).toMatchObject({
      clay: 2,
      earthquake: 4,
      radon: 1,
      floodArea: 'Nice Cannes Mandelieu',
      disasters: { count: 2, latest: '2023-03-31' },
    });
    expect(blocks?.population).toMatchObject({
      radius: 300,
      inhabitants: 1120,
      households: 500,
      peoplePerHousehold: 2.2,
    });
    expect(blocks?.copropriete).toMatchObject({
      dwellingLots: 6,
      builtFrom: 1975,
      builtTo: 1993,
      syndicMandateEnded: '2026-01-17',
    });
  });

  it('piège : une réponse « bien-client » qui contient l’estimation et le DPE n’en laisse rien sortir', () => {
    const trap = structuredClone(clientView) as { blocs: Record<string, unknown> };
    trap.blocs.estimation = (advisorView as { blocs: Record<string, unknown> }).blocs.estimation;
    trap.blocs.dpe = (advisorView as { blocs: Record<string, unknown> }).blocs.dpe;
    const parsed = parseNeighbourhoodBlocks(trap);
    expect(parsed?.ventes?.list).toHaveLength(11);
    expect(JSON.stringify(parsed)).not.toMatch(FORBIDDEN);
  });

  it('piège : la vue « bien » du conseiller passée par erreur ne laisse rien sortir de ce qu’elle seule porte', () => {
    const parsed = parseNeighbourhoodBlocks(advisorView);
    // Les ventes en sortent au mois, la distance arrondie à 50 m, sans terrain, sans prix au m²,
    // sans la vente à l'adresse.
    expect(parsed?.ventes?.list[0]).toEqual({
      month: '2025-11',
      type: null,
      rooms: 5,
      surface: 118,
      price: 876800,
      distance: 100,
      street: 'Boulevard Marechal Juin',
    });
    expect(JSON.stringify(parsed)).not.toMatch(FORBIDDEN);
  });

  it('une valeur douteuse vaut « absent » ; une réponse sans blocs n’est pas une vue', () => {
    const trap = structuredClone(clientView) as {
      blocs: Record<string, Record<string, unknown>>;
    };
    trap.blocs.ventes.liste = [
      { mois: '2025-01', prix: 'cher' },
      { mois: 'hier', prix: 700000 },
    ];
    trap.blocs.population.etat = 'erreur';
    const parsed = parseNeighbourhoodBlocks(trap);
    expect(parsed?.ventes?.list).toEqual([]);
    expect(parsed?.population).toBeNull();
    expect(parseNeighbourhoodBlocks(clientView)).not.toBeNull();
    expect(parseNeighbourhoodBlocks(null)).toBeNull();
    expect(parseNeighbourhoodBlocks({ dossier: {} })).toBeNull();
  });

  it('aucun texte de la source ne passe : chaque chaîne gardée est une source, une date, une rue ou un nom de territoire', () => {
    const strings: string[] = [];
    const walk = (value: unknown, key: string) => {
      if (typeof value === 'string') strings.push(`${key}=${value}`);
      else if (value && typeof value === 'object')
        for (const [k, v] of Object.entries(value)) walk(v, k);
    };
    walk(blocks, 'racine');
    for (const entry of strings) {
      expect(entry).toMatch(
        /^(source|date|month|authorizedOn|latest|syndicMandateEnded|street|floodArea|type|state)=/,
      );
    }
  });

  it('l’instantané gardé ne porte que les blocs cochés, et se relit de nouveau champ par champ', () => {
    const kept = pickNeighbourhoodBlocks(blocks!, ['risques', 'ventes']);
    expect(Object.keys(kept)).toEqual(['risques', 'ventes']);
    const trap = JSON.parse(JSON.stringify(kept)) as Record<string, Record<string, unknown>>;
    trap.risques.note = 'Une phrase piège';
    trap.ventes.list = [{ month: '2025-11', price: 876800, street: '12 Rue des Oliviers' }];
    trap.estimation = { middle: 980000 };
    const stored = readStoredNeighbourhood(trap);
    expect(stored.urbanisme).toBeNull();
    expect(stored.risques?.earthquake).toBe(4);
    expect(stored.ventes?.list).toEqual([
      {
        month: '2025-11',
        type: null,
        rooms: null,
        surface: null,
        price: 876800,
        distance: null,
        street: null,
      },
    ]);
    expect(JSON.stringify(stored)).not.toMatch(/piège|980000|estimation/);
  });
});
