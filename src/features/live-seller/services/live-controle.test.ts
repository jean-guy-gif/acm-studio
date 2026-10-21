import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/welcome/actions/open-example-dossier', () => ({
  openExampleDossier: async () => undefined,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: () => undefined }) }));
vi.mock('@/features/live-seller/actions/confirm-live-launch', () => ({
  confirmLiveLaunch: async () => undefined,
}));

import { LiveLaunchActions } from '@/features/live-seller/components/live-launch-actions';
import { invalidatesAnalysis } from '@/features/live-seller/services/analysis-invalidation';
import {
  liveEntryGate,
  liveLaunchCheck,
  pendingImportsNotice,
} from '@/features/live-seller/services/live-launch';
import { competitorPriceBasisLabel } from '@/features/live-seller/services/market-reading';

// Mission 112, partie A — le Live ne s'ouvre jamais sans ses contrôles.
describe('l’adresse du Live', () => {
  const gate = (patch: Partial<Parameters<typeof liveEntryGate>[0]>) =>
    liveEntryGate({
      isExample: false,
      started: false,
      confirmedAt: null,
      shortlistPending: false,
      ...patch,
    });

  it('un vrai dossier jamais lancé, sans confirmation enregistrée : vers la confirmation', () => {
    expect(gate({})).toBe('confirm');
    expect(gate({ confirmedAt: '2026-10-21T10:00:00Z' })).toBe('open');
  });

  it('au-delà de 6 concurrents sans choix daté : vers le choix, même confirmé ou exemple', () => {
    expect(gate({ confirmedAt: '2026-10-21T10:00:00Z', shortlistPending: true })).toBe('confirm');
    expect(gate({ isExample: true, shortlistPending: true })).toBe('confirm');
  });

  it('un Live commencé se reprend sans rien demander ; le dossier d’exemple n’a pas de confirmation', () => {
    expect(gate({ started: true, shortlistPending: true })).toBe('open');
    expect(gate({ isExample: true })).toBe('open');
  });

  it('« Lancer devant le vendeur » enregistre la confirmation au serveur, jamais un lien direct', () => {
    const html = renderToStaticMarkup(
      createElement(LiveLaunchActions, {
        projectId: 'p1',
        competitorCount: 3,
        resume: { started: false, index: 0, total: 20 },
        isExample: false,
        toVerifyCount: 0,
        proceed: true,
      }),
    );
    expect(html).toContain('data-testid="launch-for-real"');
    expect(html).toMatch(/<button type="submit"[^>]*data-testid="launch-for-real"/);
    expect(html).not.toContain('href="/live/p1"');
  });
});

describe('les imports en attente, rappelés sans bloquer (M52)', () => {
  it('au lancement du Live, avec un lien vers les concurrents', () => {
    const check = liveLaunchCheck({
      competitorCount: 4,
      isExample: true,
      toVerifyCount: 0,
      pendingImportCount: 2,
    });
    expect(check).toEqual({
      status: 'ask',
      confirm: false,
      notices: ['2 concurrents retenus attendent leur import'],
    });
    const html = renderToStaticMarkup(
      createElement(LiveLaunchActions, {
        projectId: 'p1',
        competitorCount: 4,
        resume: { started: false, index: 0, total: 20 },
        isExample: true,
        toVerifyCount: 0,
        pendingImportCount: 2,
        proceed: true,
      }),
    );
    expect(html).toContain('2 concurrents retenus attendent leur import');
    expect(html).toContain('href="/builder/p1/comparables"');
    expect(html).toContain('href="/live/p1"'); // rien n'est bloqué
  });

  it('se dit au singulier, et se tait à zéro', () => {
    expect(pendingImportsNotice(1)).toBe('1 concurrent retenu attend son import');
    expect(pendingImportsNotice(0)).toBeNull();
  });
});

describe('la bande suit le vendeur', () => {
  it('un « Non » dit pendant la séance redemande la bande au serveur', () => {
    const answer = (serious: string) => {
      const form = new FormData();
      form.set('seller_serious_competitor', serious);
      return form;
    };
    expect(invalidatesAnalysis(answer('no'))).toBe(true);
    expect(invalidatesAnalysis(answer('yes'))).toBe(false);
    expect(invalidatesAnalysis(new FormData())).toBe(false);
  });
});

describe('« Calculé sur 8 concurrents, dont 6 vus ensemble »', () => {
  it('le dit quand des concurrents sont hors Live, sans changer le nombre', () => {
    expect(
      competitorPriceBasisLabel({
        calculationCount: 8,
        seenTogetherCount: 6,
        competitorPriceBasis: 'computed',
      }),
    ).toBe('Calculé sur 8 concurrents, dont 6 vus ensemble');
    expect(
      competitorPriceBasisLabel({
        calculationCount: 8,
        seenTogetherCount: 6,
        competitorPriceBasis: 'advisor',
      }),
    ).toBe('Prix retenu par votre conseiller à partir de 8 concurrents, dont 6 vus ensemble');
    expect(
      competitorPriceBasisLabel({
        calculationCount: 5,
        seenTogetherCount: null,
        competitorPriceBasis: 'computed',
      }),
    ).toBe('Calculé sur 5 concurrents');
  });
});
