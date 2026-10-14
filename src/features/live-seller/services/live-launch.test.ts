import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// Le bouton est isolé de l'action serveur du dossier d'exemple (chaîne server-only).
vi.mock('@/features/welcome/actions/open-example-dossier', () => ({
  openExampleDossier: async () => undefined,
}));

import { LiveLaunchActions } from '@/features/live-seller/components/live-launch-actions';
import {
  FEW_COMPETITORS_WARNING,
  NO_COMPETITOR_REASON,
  REAL_DOSSIER_CONFIRMATION,
  liveLaunchCheck,
} from '@/features/live-seller/services/live-launch';
import {
  competitorsWithPriceOrSurfaceToVerify,
  priceOrSurfaceToVerifyLabel,
} from '@/features/imported-fields/services/fields-to-verify';

const NOT_STARTED = { started: false, index: 0, total: 20 };

// Mission 104 — « Lancer le Live » vérifie avant d'ouvrir, partout où il est proposé.
describe('liveLaunchCheck — avant d’ouvrir le Live', () => {
  it('0 concurrent retenu : on ne lance pas, et on dit pourquoi', () => {
    expect(liveLaunchCheck({ competitorCount: 0, isExample: false, toVerifyCount: 0 })).toEqual({
      status: 'blocked',
      reason: NO_COMPETITOR_REASON,
    });
    expect(NO_COMPETITOR_REASON).toBe('Retenez au moins un concurrent pour lancer le Live');
  });

  it('1 ou 2 concurrents : le Live s’ouvre, après l’avertissement', () => {
    for (const competitorCount of [1, 2]) {
      expect(liveLaunchCheck({ competitorCount, isExample: true, toVerifyCount: 0 })).toEqual({
        status: 'ask',
        confirm: false,
        notices: [FEW_COMPETITORS_WARNING],
      });
    }
    expect(FEW_COMPETITORS_WARNING).toBe('Peu de concurrents : la lecture du marché sera fragile.');
  });

  it('3 concurrents, dossier d’exemple, rien à vérifier : aucune question', () => {
    expect(liveLaunchCheck({ competitorCount: 3, isExample: true, toVerifyCount: 0 })).toEqual({
      status: 'go',
    });
  });

  it('un vrai dossier demande toujours la confirmation « devant le vendeur »', () => {
    expect(liveLaunchCheck({ competitorCount: 3, isExample: false, toVerifyCount: 0 })).toEqual({
      status: 'ask',
      confirm: true,
      notices: [],
    });
  });

  it('des prix ou surfaces à vérifier sont rappelés, sans rien bloquer', () => {
    const check = liveLaunchCheck({ competitorCount: 5, isExample: true, toVerifyCount: 2 });
    expect(check).toEqual({
      status: 'ask',
      confirm: false,
      notices: [
        '2 concurrents retenus ont un prix ou une surface à vérifier : ils entrent tels quels dans le prix des concurrents.',
      ],
    });
  });
});

describe('la ligne « prix ou surface à vérifier »', () => {
  it('ne compte que les concurrents retenus dont le prix ou la surface reste à vérifier', () => {
    const competitors = [
      { id: 'a', is_selected: true, fields_to_verify: ['price', 'city'] },
      { id: 'b', is_selected: true, fields_to_verify: ['surface_area'] },
      { id: 'c', is_selected: true, fields_to_verify: ['city', 'sold_by'] },
      { id: 'd', is_selected: false, fields_to_verify: ['price'] },
      { id: 'e', is_selected: true, fields_to_verify: ['inventé'] },
      { id: 'f', is_selected: true, fields_to_verify: null },
    ];
    expect(competitorsWithPriceOrSurfaceToVerify(competitors).map((c) => c.id)).toEqual(['a', 'b']);
    expect(priceOrSurfaceToVerifyLabel(2)).toBe(
      '2 concurrents retenus ont un prix ou une surface à vérifier',
    );
    expect(priceOrSurfaceToVerifyLabel(1)).toBe(
      '1 concurrent retenu a un prix ou une surface à vérifier',
    );
    expect(priceOrSurfaceToVerifyLabel(0)).toBeNull();
  });
});

describe('le bouton « Lancer le Live »', () => {
  const render = (props: { competitorCount: number; isExample: boolean; started?: boolean }) =>
    renderToStaticMarkup(
      createElement(LiveLaunchActions, {
        projectId: 'p1',
        competitorCount: props.competitorCount,
        resume: props.started ? { started: true, index: 7, total: 20 } : NOT_STARTED,
        isExample: props.isExample,
        toVerifyCount: 0,
      }),
    );

  it('0 concurrent : désactivé, avec la raison et le lien vers les concurrents', () => {
    const html = render({ competitorCount: 0, isExample: false });
    expect(html).toMatch(/<button type="button" disabled=""/);
    expect(html).toContain(NO_COMPETITOR_REASON);
    expect(html).toContain('href="/builder/p1/comparables"');
    expect(html).not.toContain('href="/live/p1"');
  });

  it('un vrai dossier : un bouton qui demande d’abord, jamais un lien direct vers la scène', () => {
    const html = render({ competitorCount: 3, isExample: false });
    expect(html).toMatch(/<button type="button"[^>]*>Lancer le Live →<\/button>/);
    expect(html).not.toContain('href="/live/p1"');
  });

  it('le dossier d’exemple, avec assez de concurrents : pas de confirmation', () => {
    const html = render({ competitorCount: 3, isExample: true });
    expect(html).toContain('href="/live/p1"');
    expect(html).not.toContain(REAL_DOSSIER_CONFIRMATION);
  });

  it('un Live déjà commencé se reprend sans nouvelle confirmation', () => {
    const html = render({ competitorCount: 3, isExample: false, started: true });
    expect(html).toContain('Reprendre (écran 8 sur 20)');
    expect(html).toContain('href="/live/p1?fiche=7"');
  });

  it('la confirmation dit ce qui arrive aux réponses, et propose le dossier d’exemple', () => {
    expect(REAL_DOSSIER_CONFIRMATION).toBe(
      'Vous êtes devant le vendeur ? Ses réponses seront enregistrées pour de bon. Pour vous entraîner, ouvrez le dossier d’exemple.',
    );
  });
});
