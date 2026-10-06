import { describe, expect, it } from 'vitest';

import { parseExtensionInstallUrl } from '@/features/browser-extension/install-url';

describe('parseExtensionInstallUrl', () => {
  it('rend l’adresse https telle quelle', () => {
    expect(parseExtensionInstallUrl(' https://chromewebstore.google.com/detail/abc ')).toBe(
      'https://chromewebstore.google.com/detail/abc',
    );
  });

  it('ne rend rien sans variable : le message renvoie alors vers l’agence', () => {
    expect(parseExtensionInstallUrl(undefined)).toBeNull();
    expect(parseExtensionInstallUrl('   ')).toBeNull();
  });

  it('refuse ce qui n’est pas une adresse https', () => {
    expect(parseExtensionInstallUrl('javascript:alert(1)')).toBeNull();
    expect(parseExtensionInstallUrl('http://exemple.fr')).toBeNull();
    expect(parseExtensionInstallUrl('pas une adresse')).toBeNull();
  });
});
