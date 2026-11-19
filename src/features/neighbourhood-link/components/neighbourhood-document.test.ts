import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { NeighbourhoodDocumentBlocks } from '@/features/neighbourhood-link/components/neighbourhood-document';
import {
  NEIGHBOURHOOD_BLOCK_KEYS,
  parseNeighbourhoodBlocks,
} from '@/features/neighbourhood-link/services/neighbourhood-blocks';
import advisorView from '@/test-fixtures/academia-vue-bien.json';
import clientView from '@/test-fixtures/academia-vue-bien-client.json';

// Mission 159 — le quartier imprimé dans la synthèse et l'Étude de marché (planche M159-3) : les
// seuls blocs demandés, leur source et leur date, « telles qu'au … », jamais le nom du service, ni
// la valeur indicative ni le DPE, même tirés d'une réponse piège ; en français et en anglais.
const trap = structuredClone(clientView) as { blocs: Record<string, unknown> };
trap.blocs.estimation = (advisorView as { blocs: Record<string, unknown> }).blocs.estimation;
trap.blocs.dpe = (advisorView as { blocs: Record<string, unknown> }).blocs.dpe;
const content = {
  blocks: parseNeighbourhoodBlocks(trap)!,
  keys: [...NEIGHBOURHOOD_BLOCK_KEYS],
  takenAt: '2026-11-17T18:00:00Z',
};
const render = (only: string[], language: 'fr' | 'en' = 'fr') =>
  renderToStaticMarkup(
    createElement(NeighbourhoodDocumentBlocks, {
      content,
      only: only as never,
      language,
    }),
  );

describe('le quartier dans les documents du vendeur', () => {
  it('les blocs demandés, leur source, la date du choix ; jamais Academia ni la valeur indicative', () => {
    const html = render(['urbanisme', 'risques', 'population', 'copropriete', 'permis']);
    expect(html).toContain('Rien de relevé sur votre parcelle');
    expect(html).toContain('Séisme et argiles : un niveau moyen.');
    expect(html).toContain('Source : Géorisques');
    expect(html).toContain('Informations publiques telles qu’au 17 novembre 2026');
    expect(html).not.toContain('11 maisons');
    expect(html).not.toMatch(/[Aa]cademia|estimation|980|955|1[  ]?060|DPE|Démonstration|AC1|UFb4/);
  });

  it('les ventes réelles, à part, et en anglais', () => {
    const html = render(['ventes'], 'en');
    expect(html).toContain('11 houses from 101 to 169\u00a0m² sold around you');
    expect(html).toContain('Public information as of 17 November 2026');
    expect(html).not.toContain('Planning');
  });

  it('aucun bloc demandé ou choisi : rien', () => {
    expect(render([])).toBe('');
  });
});
