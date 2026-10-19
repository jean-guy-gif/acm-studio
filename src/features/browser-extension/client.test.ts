import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  PING_ATTEMPT_TIMEOUT_MS,
  PING_ATTEMPTS,
  REMEMBERED_PING_ATTEMPTS,
  detectExtension,
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

// Mission 105 — la détection, plus claire.
describe('detectExtension', () => {
  const memory = () => {
    const data = new Map<string, string>();
    return {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
    };
  };

  it('une fois détectée, l’onglet s’en souvient : deux signaux (M108), plus les 4 secondes', async () => {
    const tab = memory();
    let calls = 0;
    const present = async () => {
      calls += 1;
      return { available: true, version: '1.0.0' };
    };
    await detectExtension({ relay: present, direct: async () => null, memory: tab });
    calls = 0;
    // Le relais reste muet : un onglet qui se souvient fait deux essais (M108), pas quatre.
    const silent = async () => {
      calls += 1;
      return null;
    };
    const result = await detectExtension({ relay: silent, direct: async () => null, memory: tab });
    expect(calls).toBe(REMEMBERED_PING_ATTEMPTS);
    expect(REMEMBERED_PING_ATTEMPTS).toBe(2);
    expect(result).toEqual({ available: false });
    // Et il oublie : la fois suivante, de nouveau les quatre essais.
    calls = 0;
    await detectExtension({ relay: silent, direct: async () => null, memory: tab });
    expect(calls).toBe(PING_ATTEMPTS);
  });

  it('le relais muet, l’appel direct répond : installée, mais sans accès au site', async () => {
    expect(
      await detectExtension({
        relay: async () => null,
        direct: async () => ({ version: '1.0.0' }),
        memory: memory(),
      }),
    ).toEqual({ available: false, version: '1.0.0', noSiteAccess: true });
  });

  it('ni relais ni appel direct : à installer', async () => {
    expect(
      await detectExtension({
        relay: async () => null,
        direct: async () => null,
        memory: null,
      }),
    ).toEqual({ available: false });
  });

  // Mission 108 — le service worker en veille : il répond au deuxième signal, rien n'est perdu.
  it('détectée, puis en veille : le deuxième signal suffit', async () => {
    const tab = memory();
    await detectExtension({
      relay: async () => ({ available: true }),
      direct: async () => null,
      memory: tab,
    });
    let calls = 0;
    const sleepy = async () => {
      calls += 1;
      return calls === 2 ? { available: true } : null;
    };
    expect(await detectExtension({ relay: sleepy, direct: async () => null, memory: tab })).toEqual(
      {
        available: true,
      },
    );
  });

  it('sans extension, l’attente n’a lieu qu’une fois par onglet ; « Réessayer » la refait', async () => {
    const tab = memory();
    let calls = 0;
    const silent = async () => {
      calls += 1;
      return null;
    };
    await detectExtension({ relay: silent, direct: async () => null, memory: tab });
    expect(calls).toBe(PING_ATTEMPTS);
    calls = 0;
    // Le clic suivant : aucun signal, le message tout de suite.
    expect(await detectExtension({ relay: silent, direct: async () => null, memory: tab })).toEqual(
      {
        available: false,
      },
    );
    expect(calls).toBe(0);
    // « Réessayer » : la détection complète, et l'extension installée entre-temps est trouvée.
    const installed = async () => {
      calls += 1;
      return { available: true };
    };
    expect(
      await detectExtension({
        relay: installed,
        direct: async () => null,
        memory: tab,
        force: true,
      }),
    ).toEqual({ available: true });
    expect(calls).toBe(1);
  });

  it('installée sans accès au site : retenu aussi, et redit tout de suite', async () => {
    const tab = memory();
    await detectExtension({ relay: async () => null, direct: async () => ({}), memory: tab });
    expect(
      await detectExtension({ relay: async () => null, direct: async () => null, memory: tab }),
    ).toEqual({
      available: false,
      noSiteAccess: true,
    });
  });
});
