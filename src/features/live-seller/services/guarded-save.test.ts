import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  CONNECTION_LOST_MESSAGE,
  guardedSave,
  isConnectionLost,
  type SaveResult,
} from '@/features/live-seller/services/guarded-save';

// Le bouton du Live, réduit à son état : grisé ou actif.
function button() {
  const states: boolean[] = [];
  return {
    setBusy: (busy: boolean) => states.push(busy),
    states,
    active: () => states.at(-1) === false,
  };
}

const offline = () => Promise.reject(new TypeError('Failed to fetch'));

// Chaque enregistrement attendu par un bouton du Live (critère 9) : un échec simulé, et le
// bouton doit redevenir actif, avec le message.
const AWAITED_SAVES = [
  'Votre bien — la réponse du vendeur',
  'Un sérieux concurrent ? — la réponse',
  'À quel prix ? — la devinette, puis la révélation',
  'Pourquoi toujours en vente ? — la durée devinée',
  'Votre valeur perçue — le prix du vendeur',
  'Analyse des prix — la livraison du marché calculé',
  'Analyse des prix — « Afficher l’analyse »',
  'Conclusion — le prix de commercialisation',
  'Prêt à lancer ? — « Terminer le rendez-vous »',
] as const;

describe('guardedSave — le Live ne se fige jamais', () => {
  it.each(AWAITED_SAVES)('%s : réseau coupé → bouton réactivé, message affiché', async () => {
    const live = button();
    const result = await guardedSave<SaveResult>(offline, live);
    expect(live.states).toEqual([true, false]);
    expect(live.active()).toBe(true);
    expect(result).toEqual({ ok: false, error: CONNECTION_LOST_MESSAGE, lost: true });
    expect(isConnectionLost(result)).toBe(true);
  });

  it('une réponse qui ne vient jamais ne grise pas le bouton indéfiniment', async () => {
    vi.useFakeTimers();
    const live = button();
    const pending = guardedSave<SaveResult>(() => new Promise(() => {}), {
      ...live,
      timeoutMs: 20_000,
    });
    await vi.advanceTimersByTimeAsync(19_999);
    expect(live.active()).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toEqual({ ok: false, error: CONNECTION_LOST_MESSAGE, lost: true });
    expect(live.active()).toBe(true);
    vi.useRealTimers();
  });

  it('un enregistrement réussi rend son résultat, bouton réactivé', async () => {
    const live = button();
    const result = await guardedSave(async () => ({ ok: true, fragment: 'x' }), live);
    expect(result).toEqual({ ok: true, fragment: 'x' });
    expect(live.states).toEqual([true, false]);
  });

  it('un refus du serveur garde SON message : ce n’est pas une connexion perdue', async () => {
    const live = button();
    const result = await guardedSave<SaveResult>(
      async () => ({ ok: false, error: 'Indiquez le prix que vous avez en tête.' }),
      live,
    );
    expect(result).toEqual({ ok: false, error: 'Indiquez le prix que vous avez en tête.' });
    expect(isConnectionLost(result)).toBe(false);
    expect(live.active()).toBe(true);
  });

  it('après un échec, un nouvel essai passe', async () => {
    const live = button();
    let online = false;
    const save = () => (online ? Promise.resolve({ ok: true }) : offline());
    expect((await guardedSave<SaveResult>(save, live)).ok).toBe(false);
    online = true;
    expect((await guardedSave<SaveResult>(save, live)).ok).toBe(true);
    expect(live.states).toEqual([true, false, true, false]);
  });

  it('le message est celui de la mission', () => {
    expect(CONNECTION_LOST_MESSAGE).toBe('Connexion perdue — touchez Valider pour réessayer');
  });
});

describe('la scène du Live passe par guardedSave pour tout ce qu’un bouton attend', () => {
  const shell = readFileSync(
    join(
      process.cwd(),
      'src',
      'features',
      'live-seller',
      'components',
      'live-comparative-shell.tsx',
    ),
    'utf8',
  );

  it('ne grise plus jamais un bouton à la main', () => {
    // `setBusy(true)` / `setFinishing(true)` hors de guardedSave = un bouton qui peut rester grisé.
    expect(shell).not.toMatch(/setBusy\(true\)|setFinishing\(true\)/);
    expect(shell).toContain('guardedSave(');
  });

  it('n’attend aucun enregistrement en dehors de guardedSave', () => {
    const awaited = shell.match(/await\s+[a-zA-Z.]+\(/g) ?? [];
    const allowed = ['await guardedSave(', 'await awaited('];
    const outside = awaited.filter((call) => !allowed.includes(call));
    expect(outside).toEqual([]);
  });
});
