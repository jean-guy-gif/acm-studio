import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { parseNeighbourhoodBlocks } from '@/features/neighbourhood-link/services/neighbourhood-blocks';
import clientView from '@/test-fixtures/academia-vue-bien-client.json';

// Mission 161 — les états nouveaux à l'écran (maquette M161-1) et leurs cadences, sans DOM : la
// relecture toutes les 5 s, deux minutes au plus ; l'adresse introuvable ; le renouvellement du lien
// à l'ouverture ; le panneau du quartier qui dit pourquoi un bloc n'est pas proposé.
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => undefined }) }));
vi.mock('@/features/academia/actions/living-here-link', () => ({
  createLivingHereLink: async () => ({ state: 'idle' }),
  refreshLivingHereLink: async () => ({ state: 'idle' }),
}));
vi.mock('@/features/projects/actions/set-academia-link', () => ({
  setAcademiaLivingHereLink: async () => ({ ok: true }),
}));
vi.mock('@/features/academia/actions/save-neighbourhood-choice', () => ({
  saveNeighbourhoodChoice: async () => ({ ok: true, keys: [] }),
}));
const { startAcademiaRefresh, ACADEMIA_REFRESH_EVERY_MS, ACADEMIA_REFRESH_MAX } =
  await import('@/features/academia/components/academia-auto-refresh');
const { fromState, shouldRenewOnOpen } =
  await import('@/features/academia/components/living-here-api-panel');
const { NeighbourhoodChoicePanel } =
  await import('@/features/academia/components/neighbourhood-choice-panel');

afterEach(() => vi.useRealTimers());

describe('la relecture du dossier en préparation', () => {
  it('toutes les 5 s, 24 fois au plus (deux minutes), puis « Vérifier maintenant »', () => {
    vi.useFakeTimers();
    expect(ACADEMIA_REFRESH_EVERY_MS).toBe(5_000);
    expect(ACADEMIA_REFRESH_MAX).toBe(24);
    const refresh = vi.fn();
    const onGiveUp = vi.fn();
    const stop = startAcademiaRefresh({ refresh, onGiveUp });
    vi.advanceTimersByTime(4_999);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(23 * 5_000);
    expect(refresh).toHaveBeenCalledTimes(24);
    expect(onGiveUp).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5_000);
    expect(onGiveUp).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000);
    expect(refresh).toHaveBeenCalledTimes(24);
    stop();
  });
});

describe('la carte « Le bien dans Academia »', () => {
  it('l’adresse introuvable devient son état à l’écran', () => {
    expect(fromState({ state: 'address_not_found' }, { kind: 'idle', stale: false })).toEqual({
      kind: 'address_not_found',
    });
  });

  it('à l’ouverture, un lien de 7 jours ou plus se renouvelle ; plus récent, non', () => {
    const now = new Date('2026-11-18T10:00:00Z');
    const ready = (daysLeft: number) => ({
      kind: 'ready' as const,
      url: 'https://app.myacademia.ai/l/x0123',
      expiresAt: new Date(now.getTime() + daysLeft * 86_400_000).toISOString(),
      expiry: null,
    });
    expect(shouldRenewOnOpen(ready(28), now)).toBe(false);
    expect(shouldRenewOnOpen(ready(20), now)).toBe(true);
    expect(shouldRenewOnOpen({ kind: 'waiting', gaveUp: false }, now)).toBe(false);
  });
});

describe('le panneau du quartier dit pourquoi un bloc n’est pas proposé', () => {
  it('« aucun », « non vérifié », « pas pu être lu »', () => {
    const json = structuredClone(clientView) as { blocs: Record<string, Record<string, unknown>> };
    json.blocs.copropriete = { etat: 'aucun' };
    json.blocs.risques = { etat: 'non_verifie' };
    json.blocs.population = { etat: 'erreur' };
    const html = renderToStaticMarkup(
      createElement(NeighbourhoodChoicePanel, {
        projectId: 'p1',
        blocks: parseNeighbourhoodBlocks(json)!,
        statuses: {
          urbanisme: 'ok',
          risques: 'unchecked',
          population: 'unread',
          copropriete: 'empty',
          permis: 'ok',
          ventes: 'ok',
        },
        savedKeys: [],
        stale: false,
        locked: false,
      }),
    );
    expect(html).toContain('data-testid="neighbourhood-choice-unavailable"');
    expect(html).toMatch(
      /Risques<\/span> —\s*(<!-- -->)?non vérifié par la source : jamais proposé au vendeur/,
    );
    expect(html).toMatch(
      /Population<\/span> —\s*(<!-- -->)?la source n’a pas pu être lue pour cette adresse/,
    );
    expect(html).toMatch(/Copropriété<\/span> —\s*(<!-- -->)?rien à montrer pour cette adresse/);
    expect(html).not.toContain('data-testid="neighbourhood-choice-risques"');
  });
});
