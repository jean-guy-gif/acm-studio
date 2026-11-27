import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  checkDemoSetup,
  DEMO_SEED_GROUPS,
  demoSeedGroup,
  demoSetupSteps,
  readSetupMoment,
} from '@/features/demo/services/demo-setup';

// Mission 147 (partie B) — la remise à zéro en étapes, et « prête » seulement sur preuve.
// Mission 155 — douze dossiers, dont huit mandats signés.

const SIGNED = Array.from({ length: 8 }, () => 'signed');
const TWELVE = ['to_prepare', 'ready', 'direct', ...SIGNED, 'follow_up'];

describe('les étapes de la remise à zéro', () => {
  it('supprimer, douze dossiers nommés, les acquéreurs, vérifier', () => {
    const steps = demoSetupSteps();
    expect(steps.map((step) => step.key)).toEqual([
      'delete',
      'to_prepare',
      'ready',
      'direct',
      'signed',
      'signed_vence',
      'signed_antibes',
      'signed_juan',
      'signed_villeneuve',
      'signed_la_colle',
      'signed_saint_paul',
      'signed_valbonne',
      'follow_up',
      'buyers',
      'verify',
    ]);
    expect(steps[4]!.label).toBe('M. Lefebvre, conclu, mandat signé');
    expect(steps[6]!.label).toBe('Mme Ferrand, conclu, mandat signé');
    // Mission 155 — deux groupes créés d'un coup, chaque dossier dans un seul, dans l'ordre.
    expect(DEMO_SEED_GROUPS.flat()).toEqual(steps.slice(1, 13).map((step) => step.key));
    expect(steps.slice(1, 13).map((step) => step.group)).toEqual([
      0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1,
    ]);
    expect(demoSeedGroup(DEMO_SEED_GROUPS[0])).toHaveLength(6);
    expect(demoSeedGroup(['ready', 'to_prepare', 'direct', 'signed'])).toBeNull();
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
  it('douze dossiers, un par étape attendue (huit mandats signés), neuf acquéreurs : prête', () => {
    expect(checkDemoSetup(TWELVE, 9)).toEqual({ ok: true });
  });

  it('douze dossiers mais une étape en double : ni « prête », ni silence', () => {
    const check = checkDemoSetup(['to_prepare', 'ready', 'ready', ...SIGNED, 'follow_up'], 9);
    expect(check).toEqual({
      ok: false,
      message:
        'La remise à zéro n’a pas abouti\u00a0: 12 dossiers sur 12 (il manque «\u00a0Prêt, en présentation directe\u00a0»\u202f; en double\u00a0: «\u00a0Prêt pour le Live\u00a0»). Rien n’est prêt.',
    });
  });

  it('sept mandats signés : il en manque un', () => {
    const check = checkDemoSetup(
      TWELVE.filter((_, index) => index !== 4),
      9,
    );
    expect(!check.ok && check.message).toContain(
      '11 dossiers sur 12 (il manque «\u00a0Conclu, mandat signé\u00a0»)',
    );
  });

  it('les acquéreurs manquants se disent aussi', () => {
    const check = checkDemoSetup(TWELVE, 8);
    expect(!check.ok && check.message).toBe(
      'La remise à zéro n’a pas abouti\u00a0: 8 acquéreurs sur 9. Rien n’est prêt.',
    );
  });

  it('en « Préparer », l’échec dit « La préparation de la démo » (Jean-Guy, 10/11)', () => {
    const check = checkDemoSetup(TWELVE, 8, 'prepare');
    expect(!check.ok && check.message).toBe(
      'La préparation de la démo n’a pas abouti\u00a0: 8 acquéreurs sur 9. Rien n’est prêt.',
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
