import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ExtensionRequiredNotice } from '@/features/browser-extension/extension-required-notice';

// Mission 108 — sans extension, le message vient tout de suite, avec « Réessayer ».
describe('le message d’installation de l’extension', () => {
  it('porte « Réessayer » quand l’écran peut redétecter', () => {
    const html = renderToStaticMarkup(
      createElement(ExtensionRequiredNotice, { reason: 'missing', onRetry: async () => undefined }),
    );
    expect(html).toContain('Réessayer');
  });

  it('aussi pour une extension installée sans accès au site', () => {
    const html = renderToStaticMarkup(
      createElement(ExtensionRequiredNotice, {
        reason: 'no_site_access',
        onRetry: async () => undefined,
      }),
    );
    expect(html).toContain('Réessayer');
  });

  it('sans redétection possible, pas de bouton', () => {
    const html = renderToStaticMarkup(
      createElement(ExtensionRequiredNotice, { reason: 'missing' }),
    );
    expect(html).not.toContain('Réessayer');
  });
});
