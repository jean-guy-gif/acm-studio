import { describe, expect, it } from 'vitest';

import {
  LIVING_HERE_OLD_DAYS,
  LIVING_HERE_SOON_DAYS,
  livingHereAge,
  livingHereAgeLine,
  livingHereExpiry,
  pastedLinkStatus,
} from '@/features/academia/services/living-here-age';

// Mission 156 — un lien client d'Academia vaut 30 jours (Laurent, 15/11). ACM compte les jours de
// Paris depuis le collage ; il prévient du 25e au 29e jour. Mission 157 — un lien collé se comporte
// comme un lien créé en un clic (Jean-Guy, 17/11) : à 30 jours et au-delà, ou quand l'adresse du
// bien a changé depuis le collage, il n'est plus montré, ni au vendeur ni aux acquéreurs.
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

  it('à 30 jours et au-delà : il n’est plus montré, et la carte propose un lien neuf', () => {
    expect(livingHereAgeLine(daysAgo(34), NOW)).toEqual({
      tone: 'warn',
      text: 'Collé il y a 34 jours : un lien d’Academia vaut 30 jours. Il n’est plus montré, ni au vendeur ni aux acquéreurs. Collez un lien neuf.',
    });
    expect(livingHereAgeLine(daysAgo(30), NOW)?.text).toMatch(/^Collé il y a 30 jours : /);
    // Avec la création en un clic, la carte propose de créer le lien.
    expect(livingHereAgeLine(daysAgo(34), NOW, { canCreate: true })?.text).toMatch(
      /Créez un lien neuf\.$/,
    );
    expect(livingHereAgeLine(daysAgo(26), NOW, { canCreate: true })?.text).toMatch(
      /Créez bientôt un lien neuf\.$/,
    );
  });

  it('l’adresse du bien a changé depuis le collage : il n’est plus montré, la carte le dit', () => {
    expect(livingHereAgeLine(daysAgo(2), NOW, { moved: true })).toEqual({
      tone: 'warn',
      text: 'L’adresse du bien a changé depuis le collage : ce lien n’est plus montré, ni au vendeur ni aux acquéreurs. Collez celui de la nouvelle adresse.',
    });
    expect(livingHereAgeLine(daysAgo(2), NOW, { moved: true, canCreate: true })?.text).toMatch(
      /Créez celui de la nouvelle adresse\.$/,
    );
  });

  it('sans date (collé avant la mission 156) : il n’est plus montré, la carte le dit', () => {
    expect(livingHereAgeLine(null, NOW)).toEqual({
      tone: 'warn',
      text: 'Collé sans date connue : ce lien n’est plus montré, ni au vendeur ni aux acquéreurs. Collez un lien neuf.',
    });
  });
});

describe('pastedLinkStatus — un lien collé, montré ou non', () => {
  const property = {
    address: '4 chemin des Restanques Hautes',
    postal_code: '06140',
    city: 'Vence',
  };
  const current = '4 chemin des Restanques Hautes, 06140 Vence';
  const status = (
    pastedAt: string | null,
    pastedProperty: unknown,
    address: string | null = current,
  ) => pastedLinkStatus({ pastedAt, pastedProperty, currentAddress: address, now: NOW });

  it('frais et à la même adresse : montré, jusqu’au 29e jour', () => {
    expect(status(daysAgo(2), property)).toBe('shown');
    expect(status(daysAgo(29), property)).toBe('shown');
  });

  it('à 30 jours et au-delà : plus montré', () => {
    expect(status(daysAgo(30), property)).toBe('old');
  });

  it('l’adresse du bien a changé depuis : plus montré', () => {
    expect(status(daysAgo(2), property, '12 rue Neuve, 06140 Vence')).toBe('moved');
    // Collé avant que l'adresse soit saisie : elle a changé depuis.
    expect(status(daysAgo(2), null)).toBe('moved');
    expect(status(daysAgo(2), { address: null, postal_code: null, city: null })).toBe('moved');
  });

  it('ni adresse au collage ni aujourd’hui : la même, montré', () => {
    expect(status(daysAgo(2), { address: null, postal_code: null, city: 'Vence' }, null)).toBe(
      'shown',
    );
  });

  it('sans date de collage : plus montré', () => {
    expect(status(null, property)).toBe('undated');
  });

  it('une adresse du collage illisible ne vaut pas l’adresse du jour', () => {
    expect(status(daysAgo(2), 'texte')).toBe('moved');
    expect(status(daysAgo(2), { address: 42, city: ['Vence'] })).toBe('moved');
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
