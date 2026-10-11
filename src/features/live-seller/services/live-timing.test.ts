import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { liveRhythm } from '@/features/live-seller/services/build-live-pages';
import {
  canChangeLiveRhythm,
  liveDurationLabel,
  liveDurationMinutes,
} from '@/features/live-seller/services/live-timing';

const plain = (text: string | null) => text?.replace(/[\u00a0\u202f]/g, ' ') ?? null;

describe('la durée réelle du Live (mission 95)', () => {
  it('se mesure du début au « Terminer », à la minute', () => {
    expect(liveDurationMinutes('2026-10-15T10:00:00Z', '2026-10-15T10:41:20Z')).toBe(41);
    expect(plain(liveDurationLabel('2026-10-15T10:00:00Z', '2026-10-15T10:41:20Z'))).toBe(
      'Durée du Live : 41 min',
    );
  });

  it('une pause en cours de rendez-vous compte : seuls le premier début et la fin comptent', () => {
    // Début 10:00, pause, reprise 10:25 (le début n'est pas remis à zéro), fin 10:52.
    expect(liveDurationMinutes('2026-10-15T10:00:00Z', '2026-10-15T10:52:00Z')).toBe(52);
  });

  it('n’invente rien quand une heure manque, ou qu’elles se contredisent', () => {
    expect(liveDurationLabel(null, '2026-10-15T10:41:00Z')).toBeNull();
    expect(liveDurationLabel('2026-10-15T10:00:00Z', null)).toBeNull();
    expect(liveDurationLabel('2026-10-15T10:00:00Z', '2026-10-15T09:00:00Z')).toBeNull();
    expect(liveDurationLabel('pas une date', '2026-10-15T09:00:00Z')).toBeNull();
  });

  it('le début ne s’écrit que s’il n’existe pas : une reprise ne le remet pas à zéro', () => {
    const actions = readFileSync(
      join(process.cwd(), 'src', 'features', 'live-seller', 'actions', 'live-timing-actions.ts'),
      'utf8',
    );
    const start = actions.slice(
      actions.indexOf('export async function markLiveStarted'),
      actions.indexOf('export async function markLiveEnded'),
    );
    expect(start).toContain(".is('live_started_at', null)");
    expect(start).toContain(".eq('agency_id', profile.agency_id)");
  });
});

describe('le rythme du Live', () => {
  it('accéléré par défaut ; « complete » seulement s’il est écrit tel quel', () => {
    expect(liveRhythm('complete')).toBe('complete');
    expect(liveRhythm('accelerated')).toBe('accelerated');
    expect(liveRhythm(null)).toBe('accelerated');
    expect(liveRhythm('n’importe quoi')).toBe('accelerated');
  });

  it('ne se modifie plus une fois le Live commencé', () => {
    expect(canChangeLiveRhythm({ liveStartedAt: null, hasSellerAnswers: false })).toBe(true);
    expect(
      canChangeLiveRhythm({ liveStartedAt: '2026-10-15T10:00:00Z', hasSellerAnswers: false }),
    ).toBe(false);
    // Un Live commencé avant la mission n'a pas d'heure de début : ses réponses le disent.
    expect(canChangeLiveRhythm({ liveStartedAt: null, hasSellerAnswers: true })).toBe(false);
  });
});
