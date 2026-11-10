import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  checkDemoSetup,
  demoSetupSteps,
  readSetupMoment,
} from '@/features/demo/services/demo-setup';

// Mission 147 (partie B) — la remise à zéro en étapes, et « prête » seulement sur preuve.

const SIX = ['to_prepare', 'ready', 'direct', 'signed', 'signed', 'follow_up'];

describe('les étapes de la remise à zéro', () => {
  it('supprimer, six dossiers nommés, les acquéreurs, vérifier', () => {
    const steps = demoSetupSteps();
    expect(steps.map((step) => step.key)).toEqual([
      'delete',
      'to_prepare',
      'ready',
      'direct',
      'signed',
      'signed_vence',
      'follow_up',
      'buyers',
      'verify',
    ]);
    expect(steps[4]!.label).toBe('M. Lefebvre, conclu, mandat signé');
  });

  it('rien ne dit « démonstration » dans la barre ni dans les messages (M114) ; « Ma démo » garde son mot', () => {
    const shown = [
      ...demoSetupSteps().map((step) => step.label),
      readFileSync(join(process.cwd(), 'src/features/demo/components/demo-setup.tsx'), 'utf8'),
      readFileSync(join(process.cwd(), 'src/features/demo/actions/demo-setup.ts'), 'utf8'),
    ];
    for (const text of shown) expect(text).not.toMatch(/d[ée]monstration|fictif|fictive|simulat/i);
  });
});

describe('la vérification', () => {
  it('six dossiers, un par étape attendue, neuf acquéreurs : prête', () => {
    expect(checkDemoSetup(SIX, 9)).toEqual({ ok: true });
  });

  it('six dossiers mais une étape en double : ni « prête », ni silence', () => {
    const check = checkDemoSetup(
      ['to_prepare', 'ready', 'ready', 'signed', 'signed', 'follow_up'],
      9,
    );
    expect(check).toEqual({
      ok: false,
      message:
        'La remise à zéro n’a pas abouti : 6 dossiers sur 6 (il manque « Prêt, en présentation directe » ; en double : « Prêt pour le Live »). Rien n’est prêt.',
    });
  });

  it('un seul mandat signé : il en manque un', () => {
    const check = checkDemoSetup(
      SIX.filter((_, index) => index !== 4),
      9,
    );
    expect(!check.ok && check.message).toContain(
      '5 dossiers sur 6 (il manque « Conclu, mandat signé »)',
    );
  });

  it('les acquéreurs manquants se disent aussi', () => {
    const check = checkDemoSetup(SIX, 8);
    expect(!check.ok && check.message).toBe(
      'La remise à zéro n’a pas abouti : 8 acquéreurs sur 9. Rien n’est prêt.',
    );
  });

  it('en « Préparer », l’échec dit « La préparation de la démo » (Jean-Guy, 10/11)', () => {
    const check = checkDemoSetup(SIX, 8, 'prepare');
    expect(!check.ok && check.message).toBe(
      'La préparation de la démo n’a pas abouti : 8 acquéreurs sur 9. Rien n’est prêt.',
    );
  });

  it('aucun dossier : jamais « prête »', () => {
    expect(checkDemoSetup([], 0).ok).toBe(false);
  });
});

describe('le « maintenant » de la remise à zéro', () => {
  const server = new Date('2026-11-10T10:00:00Z');
  it('accepté s’il a moins de 15 minutes', () => {
    expect(readSetupMoment('2026-11-10T09:50:00.000Z', server)?.toISOString()).toBe(
      '2026-11-10T09:50:00.000Z',
    );
  });
  it('refusé s’il est illisible, futur ou trop vieux', () => {
    expect(readSetupMoment('hier', server)).toBeNull();
    expect(readSetupMoment(42, server)).toBeNull();
    expect(readSetupMoment('2026-11-10T10:05:00.000Z', server)).toBeNull();
    expect(readSetupMoment('2026-11-10T09:40:00.000Z', server)).toBeNull();
  });
});
