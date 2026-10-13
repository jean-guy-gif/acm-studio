import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  PING_ATTEMPT_TIMEOUT_MS,
  PING_ATTEMPTS,
  pingExtension,
  pingWithRetries,
  type ExtensionPing,
} from '@/features/browser-extension/client';

// Correctif du 13/10 — avec la version du Chrome Web Store, « Bienvenue » affichait « ! » alors
// que l'extension était installée : un seul signal, attendu 800 ms, partait avant que le script
// de contenu soit injecté (`document_idle`) ou que le service worker soit réveillé.
describe('pingWithRetries — le signal est réessayé avant de conclure « absente »', () => {
  const scripted = (answers: (ExtensionPing | null | 'throw')[]) => {
    let calls = 0;
    const attempt = async () => {
      const answer = answers[Math.min(calls, answers.length - 1)];
      calls += 1;
      if (answer === 'throw') throw new Error('panne');
      return answer;
    };
    return { attempt, calls: () => calls };
  };

  it('répond dès le premier signal quand l’extension est prête : aucun essai de plus', async () => {
    const { attempt, calls } = scripted([{ available: true, version: '1.0.0' }]);
    expect(await pingWithRetries(attempt)).toEqual({ available: true, version: '1.0.0' });
    expect(calls()).toBe(1);
  });

  it('l’extension répond au troisième signal (script de contenu pas encore injecté) : présente', async () => {
    const { attempt, calls } = scripted([null, null, { available: true, version: '1.0.0' }]);
    expect(await pingWithRetries(attempt)).toEqual({ available: true, version: '1.0.0' });
    expect(calls()).toBe(3);
  });

  it('ne conclut « absente » qu’après quatre signaux sans réponse, sur quatre secondes', async () => {
    const { attempt, calls } = scripted([null]);
    expect(await pingWithRetries(attempt)).toEqual({ available: false });
    expect(calls()).toBe(PING_ATTEMPTS);
    expect(PING_ATTEMPTS).toBe(4);
    expect(PING_ATTEMPTS * PING_ATTEMPT_TIMEOUT_MS).toBe(4_000);
  });

  it('un essai qui plante compte comme un essai sans réponse', async () => {
    const { attempt, calls } = scripted(['throw', { available: true }]);
    expect(await pingWithRetries(attempt)).toEqual({ available: true });
    expect(calls()).toBe(2);
  });

  it('une extension qui répond « non » est là : sa réponse décide, sans réessayer', async () => {
    const { attempt, calls } = scripted([{ available: false }]);
    expect(await pingWithRetries(attempt)).toEqual({ available: false });
    expect(calls()).toBe(1);
  });
});

// Le vrai signal, sur une fenêtre factice : le script de contenu ne répond qu'à partir du
// troisième message — ce que fait la version du Store sur une page tout juste chargée.
describe('pingExtension — sur la page', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function fakeWindow(answerFrom: number) {
    const listeners = new Set<(event: unknown) => void>();
    let requests = 0;
    const fake = {
      location: { origin: 'https://acm.test' },
      setTimeout: (run: () => void, ms: number) => setTimeout(run, ms),
      clearTimeout: (timer: ReturnType<typeof setTimeout>) => clearTimeout(timer),
      addEventListener: (_type: string, listener: (event: unknown) => void) =>
        listeners.add(listener),
      removeEventListener: (_type: string, listener: (event: unknown) => void) =>
        listeners.delete(listener),
      postMessage: (message: { id: string; kind: string }) => {
        requests += 1;
        if (requests < answerFrom) return;
        for (const listener of [...listeners]) {
          listener({
            source: fake,
            origin: 'https://acm.test',
            data: { __acmStudio: 'response', id: message.id, ok: true, version: '1.0.0' },
          });
        }
      },
    };
    vi.stubGlobal('window', fake);
    return { requests: () => requests, listeners };
  }

  it('renvoie le signal jusqu’à la réponse du script de contenu', async () => {
    vi.useFakeTimers();
    const page = fakeWindow(3);
    const ping = pingExtension();
    await vi.advanceTimersByTimeAsync(2 * PING_ATTEMPT_TIMEOUT_MS);
    expect(await ping).toEqual({ available: true, version: '1.0.0' });
    expect(page.requests()).toBe(3);
    expect(page.listeners.size).toBe(0);
  });

  it('sans extension : « absente » après quatre secondes, pas avant', async () => {
    vi.useFakeTimers();
    const page = fakeWindow(Infinity);
    let settled: ExtensionPing | null = null;
    const ping = pingExtension().then((result) => (settled = result));
    await vi.advanceTimersByTimeAsync(3_900);
    expect(settled).toBeNull();
    await vi.advanceTimersByTimeAsync(200);
    await ping;
    expect(settled).toEqual({ available: false });
    expect(page.requests()).toBe(4);
    expect(page.listeners.size).toBe(0);
  });
});
