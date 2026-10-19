import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { makeComparable } from '@/features/comparable-analysis/services/test-helpers';
import {
  buildComparisonCsv,
  COMPARISON_COLUMNS,
  csvCell,
} from '@/features/expert-mode/services/comparison-csv';

// Le titre piège de la M107 : un nom d'agence et une adresse dans le titre de l'annonce.
const TRAP_TITLE = 'EXCLUSIVITÉ Agence Dupont 12 rue des Lilas';

const lines = (csv: string): string[][] =>
  csv
    .replace(/^﻿/, '')
    .trim()
    .split('\r\n')
    .map((line) => line.split(';'));

describe('« Exporter le comparatif » (mission 110)', () => {
  const confirmed = makeComparable({
    id: 'a',
    display_order: 2,
    title: TRAP_TITLE,
    listing_description: 'Description de l’annonce',
    advisor_notes: 'Note privée',
    sold_by: 'agency',
    exclusivity: 'yes',
    listing_url: 'https://www.seloger.com/annonces/achat/appartement/nice/123.htm',
    locator_address: '8 avenue Docteur Hochet, 06160 Antibes',
    locator_confirmed: true,
    locator_source: 'dpe',
    locator_label_key: 'vous',
    price: 400_000,
    surface_area: 80,
  });
  const proposedOnly = makeComparable({
    id: 'b',
    display_order: 1,
    locator_address: '3 rue Proposée, Nice',
    locator_confirmed: true,
    locator_source: 'dpe',
    locator_label_key: 'confirmee',
    excluded_from_live: true,
  });
  const rejected = makeComparable({ id: 'c', display_order: 3, is_selected: false });

  const csv = buildComparisonCsv(
    {
      property_type: 'Appartement',
      rooms_count: 4,
      surface_area: 82.4,
      land_area: null,
      city: 'Antibes',
      energy_rating: 'D',
    },
    [confirmed, proposedOnly, rejected],
  );
  const table = lines(csv);

  it('les concurrents retenus, dans l’ordre du Live, après le bien vendeur', () => {
    expect(table[0]).toEqual([...COMPARISON_COLUMNS]);
    expect(table[1][0]).toBe('Votre bien');
    expect(table.slice(2).map((row) => row[0])).toEqual(['1', '2']);
    expect(table).toHaveLength(4);
    expect(table[2][1]).toBe('non'); // hors Live
    expect(table[3][1]).toBe('oui');
  });

  it('une adresse seulement si le conseiller l’a confirmée ou saisie', () => {
    expect(csv).toContain('8 avenue Docteur Hochet, 06160 Antibes');
    expect(csv).not.toContain('3 rue Proposée');
  });

  it('ni titre, ni description, ni note, ni « Vendu par », ni exclusivité, ni prix du bien vendeur', () => {
    expect(csv).not.toContain('Agence Dupont');
    expect(csv).not.toContain('Description de l’annonce');
    expect(csv).not.toContain('Note privée');
    expect(csv).not.toMatch(/Vendu par|Exclusivit/i);
    expect(table[1].slice(9).every((cell) => cell === '')).toBe(true);
  });

  it('les nombres en français, le prix au m² calculé, le portail nommé', () => {
    expect(table[3][9]).toBe('400000');
    expect(table[3][10]).toBe('5000');
    expect(table[3][14]).toBe('SeLoger');
    expect(table[1][5]).toBe('82');
  });

  it('une cellule ne s’exécute jamais comme une formule', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('-3')).toBe("'-3");
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell(12.5)).toBe('12,5');
  });

  it('la route n’exporte qu’en mode expert, pour l’agence de l’appelant, sans cache', () => {
    const route = readFileSync(
      'src/app/(protected)/builder/[projectId]/export-comparatif/route.ts',
      'utf8',
    );
    expect(route).toContain('!profile.expert_mode');
    expect(route).toContain('project.agency_id !== profile.agency_id');
    expect(route).toContain("'private, no-store'");
  });
});
