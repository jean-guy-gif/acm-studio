import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  ACADEMIA_LIVING_HERE_PATTERN,
  ACADEMIA_PRESENTATION_URL,
  academiaLinkView,
  academiaLivingHereUrl,
  propertyAddressLine,
} from '@/lib/academia';

// Mission 147 (partie A) — les liens vers Academia et le lien client « Vivre ici ».

describe('propertyAddressLine', () => {
  it('écrit la rue, le code postal et la commune', () => {
    expect(
      propertyAddressLine({
        address: '4 chemin des Restanques Hautes',
        postalCode: '06140',
        city: 'Vence',
      }),
    ).toBe('4 chemin des Restanques Hautes, 06140 Vence');
  });

  it('sans code postal, la rue et la commune', () => {
    expect(propertyAddressLine({ address: '4 rue X', postalCode: null, city: 'Vence' })).toBe(
      '4 rue X, Vence',
    );
  });

  it('sans rue ou sans commune, aucune adresse : jamais une adresse à moitié', () => {
    expect(propertyAddressLine({ address: '', postalCode: '06140', city: 'Vence' })).toBeNull();
    expect(propertyAddressLine({ address: '4 rue X', postalCode: '06140', city: ' ' })).toBeNull();
    expect(propertyAddressLine({ address: null, postalCode: null, city: null })).toBeNull();
  });

  it('une rue saisie avec sa commune n’est pas doublée', () => {
    expect(
      propertyAddressLine({
        address: '12 rue X, 06600 Antibes',
        postalCode: '06600',
        city: 'Antibes',
      }),
    ).toBe('12 rue X, 06600 Antibes');
    // Une rue qui porte le nom de la commune garde la commune.
    expect(
      propertyAddressLine({ address: '3 chemin de Vence', postalCode: '06800', city: 'Vence' }),
    ).toBe('3 chemin de Vence, 06800 Vence');
  });
});

describe('academiaLinkView', () => {
  const address = '4 chemin des Restanques Hautes, 06140 Vence';

  it('aujourd’hui : l’accueil d’Academia, et l’adresse à copier', () => {
    expect(academiaLinkView({ target: 'address', address, demo: false, direct: false })).toEqual({
      href: 'https://app.myacademia.ai',
      copy: address,
    });
  });

  it('le lien direct, une fois basculé : la bonne page, rien à copier', () => {
    expect(academiaLinkView({ target: 'living', address, demo: false, direct: true })).toEqual({
      href: `https://app.myacademia.ai/app/ouvrir?adresse=4+chemin+des+Restanques+Hautes%2C+06140+Vence&vers=vivre-ici`,
      copy: null,
    });
    expect(
      academiaLinkView({ target: 'sales', address, demo: false, direct: true })?.href,
    ).toContain('vers=dossier');
    expect(
      academiaLinkView({ target: 'address', address, demo: false, direct: true })?.href,
    ).toContain('vers=dossier');
  });

  it('l’adresse d’Academia est un réglage', () => {
    expect(
      academiaLinkView({
        target: 'address',
        address,
        demo: false,
        direct: false,
        base: 'https://x.test/',
      }),
    ).toEqual({ href: 'https://x.test', copy: address });
  });

  it('la démo ouvre la présentation d’Academia, sans copier l’adresse inventée', () => {
    expect(academiaLinkView({ target: 'living', address, demo: true, direct: false })).toEqual({
      href: ACADEMIA_PRESENTATION_URL,
      copy: null,
    });
    expect(ACADEMIA_PRESENTATION_URL).toBe('https://app.myacademia.ai');
  });

  it('sans adresse, aucun lien', () => {
    expect(academiaLinkView({ target: 'address', address: null, demo: false })).toBeNull();
    expect(academiaLinkView({ target: 'address', address: null, demo: true })).toBeNull();
  });
});

describe('academiaLivingHereUrl', () => {
  it('accepte un lien client d’Academia, au format réel (identifiant.signature)', () => {
    expect(academiaLivingHereUrl(' https://app.myacademia.ai/l/v3k9-2mq7.8f2c1a9e4b7d ')).toBe(
      'https://app.myacademia.ai/l/v3k9-2mq7.8f2c1a9e4b7d',
    );
  });

  it('refuse tout le reste', () => {
    for (const bad of [
      'https://www.seloger.com/annonces/123.htm',
      'https://app.myacademia.ai.evil.com/l/x',
      'https://evil.com/https://app.myacademia.ai/l/x',
      'http://app.myacademia.ai/l/x',
      'https://app.myacademia.ai/x/abc',
      'https://app.myacademia.ai/l/',
      'https://app.myacademia.ai/l/ab cd',
      'https://app.myacademia.ai/l/v3k9-2mq7.8f2c?x=1',
      'https://app.myacademia.ai/l/v3k9-2mq7.8f2c#haut',
      'https://app.myacademia.ai/l/v3k9-2mq7/8f2c',
      'HTTPS://APP.MYACADEMIA.AI/l/x',
      'https://app.myacademia.ai/l/ab​cd',
      'https://app.myacademia.ai/l/ab\u0007',
      'https://app.myacademia.ai:8443/l/x',
      `https://app.myacademia.ai/l/${'a'.repeat(473)}`,
      '',
      null,
      42,
    ]) {
      expect(academiaLivingHereUrl(bad), String(bad)).toBeNull();
    }
    expect(academiaLivingHereUrl(`https://app.myacademia.ai/l/${'a'.repeat(472)}`)).not.toBeNull();
  });

  it('suit la règle de la base, mot pour mot', () => {
    const migration = readFileSync(
      join(process.cwd(), 'supabase/migrations/20261205090000_vivre_ici_academia.sql'),
      'utf8',
    );
    const rule = /academia_living_here_url ~ '([^']+)'/.exec(migration)?.[1];
    expect(rule).toBe(ACADEMIA_LIVING_HERE_PATTERN.source.replaceAll('\\/', '/'));
    expect(migration).toContain('char_length(academia_living_here_url) <= 500');
  });
});
