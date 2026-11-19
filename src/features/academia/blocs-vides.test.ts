import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { parsePropertyView } from '@/features/academia/services/property-view';
import {
  neighbourhoodBlockStatuses,
  parseNeighbourhoodBlocks,
} from '@/features/neighbourhood-link/services/neighbourhood-blocks';
import { neighbourhoodView } from '@/features/neighbourhood-link/services/neighbourhood-view';
import { CLIENT_TEXTS } from '@/lib/client-texts';
import advisorView from '@/test-fixtures/academia-vue-bien.json';
import clientView from '@/test-fixtures/academia-vue-bien-client.json';

// Mission 161 — les blocs ne sont pas toujours remplis (Laurent, 18/11) : « aucun », la source a été
// lue et n'a rien trouvé ; « non_verifie », elle n'a pas été vérifiée (vide dans « bien-client »,
// jamais montré au vendeur). Réponses simulées, aucune API réelle.
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => undefined }) }));
vi.mock('@/features/subject-property/actions/save-advisor-range', () => ({
  saveAdvisorRange: async () => ({ ok: true }),
}));
const { AddressViewPanel } = await import('@/features/academia/components/address-view-panel');

type Blocs = { blocs: Record<string, Record<string, unknown>> };
const empty = (json: unknown, keys: string[], etat: string) => {
  const copy = structuredClone(json) as Blocs;
  for (const key of keys)
    copy.blocs[key] = { etat, source: copy.blocs[key]?.source, date: '2026-10-07' };
  return copy;
};

describe('les blocs vides et non vérifiés', () => {
  it('chez le conseiller : « aucun » dit avec son échelle, « non vérifié » dit, jamais « pas pu être lue »', () => {
    const view = parsePropertyView(
      empty(empty(advisorView, ['permis', 'copropriete'], 'aucun'), ['population'], 'non_verifie'),
    )!;
    const html = renderToStaticMarkup(
      createElement(AddressViewPanel, {
        projectId: 'p1',
        state: { kind: 'ready', view, facts: { type: 'maison', rooms: 5, surface: 135 } },
        savedRange: { min: null, max: null },
        demo: false,
      }),
    );
    expect(html).toContain('Aucun permis de construire relevé');
    expect(html).toContain('Aucune copropriété enregistrée à cette adresse.');
    expect(html).toContain('Non vérifié pour cette adresse.');
    expect(html).toContain('Pas montré au vendeur.');
    expect(html).not.toContain('La source n’a pas pu être lue');
  });

  it('côté vendeur : « aucun » est une information pour l’urbanisme et les permis, jamais pour le reste', () => {
    const json = empty(
      empty(clientView, ['permis', 'ventes', 'urbanisme', 'copropriete', 'population'], 'aucun'),
      ['risques'],
      'non_verifie',
    );
    const blocks = parseNeighbourhoodBlocks(json)!;
    expect(blocks.copropriete).toBeNull();
    expect(blocks.population).toBeNull();
    expect(blocks.risques).toBeNull();
    const say = (key: 'permis' | 'ventes' | 'urbanisme') =>
      neighbourhoodView(blocks, key, CLIENT_TEXTS.fr, 'fr')?.headline;
    expect(say('permis')).toBe('Aucun permis de construire relevé à moins de 300 m.');
    // Correctifs 161 — sans vente, pas d'« anneau » : le bloc des ventes n'est pas proposé
    // (décision de Jean-Guy, 19/11 ; remplace M161, « aucun » proposé pour les ventes).
    expect(say('ventes')).toBeUndefined();
    // Rien jusqu'à 300 m : la même échelle que chez le conseiller.
    expect(say('urbanisme')).toBe('Rien de relevé sur votre parcelle, ni à moins de 300 m.');
    expect(neighbourhoodBlockStatuses(json)).toEqual({
      urbanisme: 'empty',
      risques: 'unchecked',
      population: 'empty',
      copropriete: 'empty',
      permis: 'empty',
      ventes: 'empty',
    });
  });

  it('« non_verifie » ne passe jamais au vendeur, même pour les permis ou les ventes', () => {
    const blocks = parseNeighbourhoodBlocks(
      empty(clientView, ['permis', 'ventes'], 'non_verifie'),
    )!;
    expect(blocks.permis).toBeNull();
    expect(blocks.ventes).toBeNull();
  });
});
