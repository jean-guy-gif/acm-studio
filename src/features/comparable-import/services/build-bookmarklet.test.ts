import { describe, expect, it, vi } from 'vitest';

import {
  ASSISTANT_PATH,
  LISTING_MESSAGE_TYPE,
  READY_SIGNAL,
  buildBookmarkletHref,
  buildBookmarkletSource,
} from '@/features/comparable-import/services/build-bookmarklet';

const ORIGIN = 'https://acm-studio-henna.vercel.app';

describe('buildBookmarklet', () => {
  it('produit un favori « javascript: » qui décode vers le code source', () => {
    const href = buildBookmarkletHref(ORIGIN);
    expect(href.startsWith('javascript:')).toBe(true);
    expect(decodeURIComponent(href.slice('javascript:'.length))).toBe(
      buildBookmarkletSource(ORIGIN),
    );
  });

  it('est du JavaScript valide (sinon le favori ne fait rien au clic)', () => {
    expect(() => new Function(buildBookmarkletSource(ORIGIN))).not.toThrow();
  });

  it('n’envoie la page qu’à l’origine ACM Studio, jamais à « * »', () => {
    const source = buildBookmarkletSource(ORIGIN);
    expect(source).toContain('w.postMessage(p,o)');
    expect(source).not.toContain("postMessage(p,'*')");
    expect(source).toContain(JSON.stringify(ORIGIN));
  });

  it('exécuté sur une page de portail : ouvre l’assistant puis envoie la page au signal', () => {
    const postMessage = vi.fn();
    const assistantWindow = { postMessage };
    const open = vi.fn(() => assistantWindow);
    let listener: ((event: unknown) => void) | null = null;

    const fakeWindow = {
      open,
      addEventListener: (_type: string, handler: (event: unknown) => void) => {
        listener = handler;
      },
      removeEventListener: () => {},
    };
    const fakeLocation = { href: 'https://www.bienici.com/annonce/vente/nice/appartement/1' };
    const fakeDocument = { documentElement: { outerHTML: '<html>annonce</html>' } };

    // Exécution du favori dans un contexte imitant l'onglet du portail.
    new Function(
      'window',
      'location',
      'document',
      'alert',
      'setTimeout',
      buildBookmarkletSource(ORIGIN),
    )(fakeWindow, fakeLocation, fakeDocument, vi.fn(), vi.fn());

    expect(open).toHaveBeenCalledWith(`${ORIGIN}${ASSISTANT_PATH}`, 'acmstudio');
    expect(postMessage).not.toHaveBeenCalled();

    // Un message venant d'une AUTRE fenêtre ne déclenche rien.
    listener!({ source: { other: true }, data: READY_SIGNAL });
    expect(postMessage).not.toHaveBeenCalled();

    // Le bon signal, venant de la fenêtre ouverte : la page part.
    listener!({ source: assistantWindow, data: READY_SIGNAL });
    expect(postMessage).toHaveBeenCalledWith(
      {
        type: LISTING_MESSAGE_TYPE,
        url: fakeLocation.href,
        html: '<html>annonce</html>',
      },
      ORIGIN,
    );
  });
});
