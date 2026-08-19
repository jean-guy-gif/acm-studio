import { describe, expect, it, vi } from 'vitest';

import {
  ASSISTANT_PATH,
  LISTING_MESSAGE_TYPE,
  SEND_ATTEMPTS_MS,
  buildBookmarkletHref,
  buildBookmarkletSource,
} from '@/features/comparable-import/services/build-bookmarklet';

const ORIGIN = 'https://acm-studio-henna.vercel.app';

// Exécute le favori dans un contexte imitant l'onglet du portail, et rend la
// main sur ce qui a été observé.
function runBookmarklet(options: { popupBlocked?: boolean } = {}) {
  const postMessage = vi.fn();
  const assistantWindow = { postMessage };
  const open = vi.fn(() => (options.popupBlocked ? null : assistantWindow));
  const addEventListener = vi.fn();
  const alert = vi.fn();
  const timers: { fn: () => void; ms: number }[] = [];
  const setTimeout = vi.fn((fn: () => void, ms: number) => {
    timers.push({ fn, ms });
    return timers.length;
  });

  const fakeWindow = { open, addEventListener, removeEventListener: vi.fn() };
  const fakeLocation = { href: 'https://www.bienici.com/annonce/vente/antibes/appartement/1' };
  const fakeDocument = { documentElement: { outerHTML: '<html>annonce</html>' } };

  new Function(
    'window',
    'location',
    'document',
    'alert',
    'setTimeout',
    buildBookmarkletSource(ORIGIN),
  )(fakeWindow, fakeLocation, fakeDocument, alert, setTimeout);

  return { open, postMessage, addEventListener, alert, timers, assistantWindow, fakeLocation };
}

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
    expect(source).not.toContain("'*'");
    expect(source).toContain(JSON.stringify(ORIGIN));
  });

  // Terrain (19/08) : la version précédente installait un écouteur sur la page
  // du portail et y recevait des signaux répétés. Bien'ici a affiché sa page
  // d'erreur. On ne touche plus jamais à la page du portail.
  it('ne touche pas à la page du portail : aucun écouteur, aucun envoi vers elle', () => {
    const { addEventListener, postMessage, assistantWindow, timers } = runBookmarklet();
    expect(addEventListener).not.toHaveBeenCalled();

    for (const timer of timers) {
      timer.fn();
    }
    // Tous les envois sont dirigés vers la fenêtre ACM Studio, aucune autre.
    expect(postMessage).toHaveBeenCalledTimes(SEND_ATTEMPTS_MS.length);
    expect(postMessage.mock.instances.every((instance) => instance === assistantWindow)).toBe(true);
  });

  it('ouvre l’assistant puis lui envoie la page en plusieurs tentatives espacées', () => {
    const { open, postMessage, timers, fakeLocation } = runBookmarklet();

    expect(open).toHaveBeenCalledWith(`${ORIGIN}${ASSISTANT_PATH}`, 'acmstudio');
    expect(timers.map((timer) => timer.ms)).toEqual(SEND_ATTEMPTS_MS);
    expect(postMessage).not.toHaveBeenCalled();

    timers[0].fn();
    expect(postMessage).toHaveBeenCalledWith(
      { type: LISTING_MESSAGE_TYPE, url: fakeLocation.href, html: '<html>annonce</html>' },
      ORIGIN,
    );
  });

  it('prévient le conseiller si la fenêtre est bloquée, sans rien casser', () => {
    const { alert, postMessage, timers } = runBookmarklet({ popupBlocked: true });
    expect(alert).toHaveBeenCalledTimes(1);
    expect(timers).toHaveLength(0);
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('un envoi qui échoue n’interrompt pas les suivants', () => {
    const { timers, postMessage } = runBookmarklet();
    postMessage.mockImplementationOnce(() => {
      throw new Error('fenêtre fermée');
    });
    expect(() => timers.forEach((timer) => timer.fn())).not.toThrow();
    expect(postMessage).toHaveBeenCalledTimes(SEND_ATTEMPTS_MS.length);
  });
});
