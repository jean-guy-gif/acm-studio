import { describe, expect, it } from 'vitest';

import {
  fileBlocker,
  fileVersions,
  resolveFileVersion,
} from '@/features/prospecting-file/services/file-access';

describe('la version se choisit seule', () => {
  it('exclusivité → confrère ; particulier ou mandat simple → propriétaire', () => {
    expect(fileVersions('colleague')).toEqual(['colleague']);
    expect(fileVersions('owner')).toEqual(['owner']);
    expect(resolveFileVersion('colleague', 'owner')).toBe('colleague');
    expect(resolveFileVersion('owner', undefined)).toBe('owner');
  });

  it('inconnu : le conseiller choisit, et rien tant qu’il n’a pas choisi', () => {
    expect(fileVersions('check')).toEqual(['colleague', 'owner']);
    expect(resolveFileVersion('check', undefined)).toBeNull();
    expect(resolveFileVersion('check', 'autre')).toBeNull();
    expect(resolveFileVersion('check', ['owner'])).toBeNull();
    expect(resolveFileVersion('check', 'owner')).toBe('owner');
  });
});

describe('ce qui retient un dossier', () => {
  const ready = {
    version: 'owner' as const,
    addressConfirmed: true,
    advisorPhone: '06 12 34 56 78',
  };

  it('rien quand tout est là', () => {
    expect(fileBlocker(ready)).toBeNull();
  });

  it('le dossier s’ouvre dès le mandat signé, sans lien d’annonce à renseigner', () => {
    expect(Object.keys(ready)).toEqual(['version', 'addressConfirmed', 'advisorPhone']);
    expect(fileBlocker({ ...ready, version: 'colleague' })).toBeNull();
  });

  it('pas de dossier propriétaire sans adresse confirmée', () => {
    expect(fileBlocker({ ...ready, addressConfirmed: false })).toBe('address_unconfirmed');
  });

  it('pas de dossier propriétaire sans téléphone pour « ne plus être sollicité »', () => {
    expect(fileBlocker({ ...ready, advisorPhone: null })).toBe('phone_missing');
  });

  it('le confrère n’attend ni adresse ni téléphone', () => {
    expect(
      fileBlocker({ ...ready, version: 'colleague', addressConfirmed: false, advisorPhone: null }),
    ).toBeNull();
  });
});
