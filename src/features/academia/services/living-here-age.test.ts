import { describe, expect, it } from 'vitest';

import {
  LIVING_HERE_OLD_DAYS,
  LIVING_HERE_SOON_DAYS,
  livingHereAge,
  livingHereAgeLine,
  livingHereExpiry,
  livingHereNeedsLink,
} from '@/features/academia/services/living-here-age';

// Mission 156 — un lien client d'Academia vaut 30 jours (Laurent, 15/11). ACM compte les jours de
// Paris depuis le collage ; il prévient du 25e au 29e jour, puis à 30 jours et au-delà, sans jamais
// cacher le lien (décisions de Jean-Guy, 15 et 16/11).
const NOW = new Date('2026-11-16T10:00:00Z');
const daysAgo = (days: number, hour = '10:00') =>
  new Date(Date.parse(`2026-11-16T${hour}:00Z`) - days * 86_400_000).toISOString();

describe('livingHereAge', () => {
  it('les deux seuils', () => {
    expect(LIVING_HERE_SOON_DAYS).toBe(25);
    expect(LIVING_HERE_OLD_DAYS).toBe(30);
  });

  it('sans date (un lien collé avant la mission), rien : rien n’est inventé', () => {
    expect(livingHereAge(null, NOW)).toBeNull();
    expect(livingHereAge('pas une date', NOW)).toBeNull();
  });

  it('frais jusqu’au 24e jour, bientôt du 25e au 29e, vieux à 30 et au-delà', () => {
    expect(livingHereAge(daysAgo(0), NOW)).toEqual({ level: 'fresh', days: 0 });
    expect(livingHereAge(daysAgo(24), NOW)).toEqual({ level: 'fresh', days: 24 });
    expect(livingHereAge(daysAgo(25), NOW)).toEqual({ level: 'soon', days: 25 });
    expect(livingHereAge(daysAgo(29), NOW)).toEqual({ level: 'soon', days: 29 });
    expect(livingHereAge(daysAgo(30), NOW)).toEqual({ level: 'old', days: 30 });
    expect(livingHereAge(daysAgo(400), NOW)).toEqual({ level: 'old', days: 400 });
  });

  it('les jours sont ceux de Paris : collé à 23 h 30 à Paris, c’est déjà la veille à minuit', () => {
    // 22:30 UTC le 22/10 = 0 h 30 le 23/10 à Paris : 24 jours le 16/11, pas 25.
    expect(livingHereAge('2026-10-22T22:30:00Z', NOW)).toEqual({ level: 'fresh', days: 24 });
    expect(livingHereAge('2026-10-22T21:30:00Z', NOW)).toEqual({ level: 'soon', days: 25 });
  });

  it('une date dans l’avenir compte comme aujourd’hui', () => {
    expect(livingHereAge('2026-11-20T10:00:00Z', NOW)).toEqual({ level: 'fresh', days: 0 });
  });
});

describe('livingHereAgeLine', () => {
  it('frais : l’indication en gris, en date relative', () => {
    expect(livingHereAgeLine(daysAgo(2), NOW)).toEqual({
      tone: 'hint',
      text: 'Collé il y a 2 jours',
    });
    expect(livingHereAgeLine(daysAgo(0), NOW)?.text).toBe('Collé aujourd’hui');
  });

  it('du 25e au 29e jour : l’avertissement orange de la maquette', () => {
    expect(livingHereAgeLine(daysAgo(26), NOW)).toEqual({
      tone: 'warn',
      text: 'Collé il y a 26 jours : un lien d’Academia vaut 30 jours. Collez bientôt un lien neuf.',
    });
  });

  it('à 30 jours et au-delà : « il ne s’ouvre peut-être plus »', () => {
    expect(livingHereAgeLine(daysAgo(34), NOW)).toEqual({
      tone: 'warn',
      text: 'Collé il y a 34 jours : un lien d’Academia vaut 30 jours, il ne s’ouvre peut-être plus. Collez un lien neuf.',
    });
    expect(livingHereAgeLine(daysAgo(30), NOW)?.text).toMatch(/^Collé il y a 30 jours : /);
  });

  it('sans date : aucune ligne', () => {
    expect(livingHereAgeLine(null, NOW)).toBeNull();
  });
});

describe('livingHereNeedsLink — le lien discret « Ajouter « Vivre ici » » de la fiche', () => {
  it('sans lien, ou un lien de 30 jours et au-delà ; jamais avant', () => {
    expect(livingHereNeedsLink(null, NOW)).toBe(true);
    expect(
      livingHereNeedsLink({ url: 'https://app.myacademia.ai/l/a', pastedAt: daysAgo(29) }, NOW),
    ).toBe(false);
    expect(
      livingHereNeedsLink({ url: 'https://app.myacademia.ai/l/a', pastedAt: daysAgo(30) }, NOW),
    ).toBe(true);
  });

  it('un lien sans date n’appelle pas le lien discret (son âge est inconnu)', () => {
    expect(livingHereNeedsLink({ url: 'https://app.myacademia.ai/l/a', pastedAt: null }, NOW)).toBe(
      false,
    );
  });
});

describe('livingHereExpiry — un lien créé par l’API, avec son expiration', () => {
  it('valable, bientôt (trois jours au plus), expiré', () => {
    expect(livingHereExpiry('2026-12-16T00:00:00Z', NOW)).toEqual({ level: 'ok', days: 30 });
    expect(livingHereExpiry('2026-11-19T12:00:00Z', NOW)).toEqual({ level: 'soon', days: 3 });
    expect(livingHereExpiry('2026-11-16T10:00:00Z', NOW)).toEqual({ level: 'expired', days: 0 });
    expect(livingHereExpiry('2026-11-14T00:00:00Z', NOW)).toEqual({ level: 'expired', days: 0 });
    expect(livingHereExpiry('jamais', NOW)).toBeNull();
  });
});
