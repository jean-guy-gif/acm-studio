import { describe, expect, it } from 'vitest';

import {
  checkAcademiaKey,
  createAcademiaRequest,
  readAcademiaRequest,
  readAcademiaView,
} from '@/features/academia/services/academia-api';
import { FAKE_ACADEMIA_ID, fakeAcademia } from '@/test-fixtures/fake-academia';

// Mission 161 — ce que Laurent annonce pour un vrai dossier (18/11), contre un faux serveur : aucun
// test n'appelle l'API réelle.
const KEY = 'msk_test_0123456789';
const input = {
  key: KEY,
  adresse: '4 chemin des Restanques Hautes, 06140 Vence',
  bien: { type: 'maison' as const, pieces: 5, surface: 135 },
};
const bien = { type: 'maison' as const, pieces: 5, surface: 135 };

describe('l’API réelle d’Academia (Laurent, 18/11)', () => {
  it('1. 202 en préparation, puis « echec » : un échec de préparation, pas une réponse hors contrat', async () => {
    const created = fakeAcademia({
      createRequest: [{ status: 202, body: { id: FAKE_ACADEMIA_ID, statut: 'en_cours' } }],
    });
    expect(await createAcademiaRequest(input, created.fetch)).toEqual({
      ok: true,
      id: FAKE_ACADEMIA_ID,
      etat: 'en_cours',
    });
    const failed = fakeAcademia({
      readRequest: [{ status: 200, body: { id: FAKE_ACADEMIA_ID, statut: 'echec' } }],
    });
    expect(await readAcademiaRequest(KEY, FAKE_ACADEMIA_ID, failed.fetch)).toEqual({
      ok: true,
      etat: 'erreur',
    });
  });

  it('2. un dossier prêt depuis moins de 30 jours : 200 « reutilise », prêt, rien d’autre n’est rendu', async () => {
    const server = fakeAcademia({
      createRequest: [
        { status: 200, body: { id: FAKE_ACADEMIA_ID, statut: 'pret', reutilise: true } },
      ],
    });
    const result = await createAcademiaRequest(input, server.fetch);
    expect(result).toEqual({ ok: true, id: FAKE_ACADEMIA_ID, etat: 'pret' });
  });

  it('3. /bien ou /bien-client sur un dossier pas prêt : 409 « pas_pret », en préparation', async () => {
    for (const view of ['bien', 'bien-client'] as const) {
      const server = fakeAcademia({
        readView: [{ status: 409, body: { erreur: 'Dossier pas prêt', code: 'pas_pret' } }],
        readClientView: [{ status: 409, body: { erreur: 'Dossier pas prêt', code: 'pas_pret' } }],
      });
      expect(
        await readAcademiaView(view, KEY, FAKE_ACADEMIA_ID, { ...bien }, server.fetch),
      ).toMatchObject({
        ok: false,
        reason: 'not_ready',
      });
    }
  });

  it('5. 422 sans proposition : adresse introuvable ; avec propositions : le choix d’aujourd’hui', async () => {
    const lost = fakeAcademia({
      createRequest: [{ status: 422, body: { erreur: 'Adresse introuvable', code: 'adresse' } }],
    });
    expect(await createAcademiaRequest(input, lost.fetch)).toMatchObject({
      ok: false,
      reason: 'address_not_found',
    });
    const choices = fakeAcademia({
      createRequest: [
        { status: 422, body: { propositions: ['4 chemin des Restanques, 06140 Vence'] } },
      ],
    });
    expect(await createAcademiaRequest(input, choices.fetch)).toMatchObject({
      ok: false,
      reason: 'ambiguous',
    });
  });

  it('6. 429 : le délai de Retry-After, en secondes ou en date ; 503 : un seul nouvel essai', async () => {
    const minute = fakeAcademia({
      createRequest: [
        { status: 429, body: { code: 'trop_vite' }, headers: { 'retry-after': '45' } },
      ],
    });
    expect(await createAcademiaRequest(input, minute.fetch)).toMatchObject({
      ok: false,
      reason: 'quota',
      retryAfter: 45,
    });
    const at = new Date(Date.now() + 2 * 3600_000).toUTCString();
    const day = fakeAcademia({
      createRequest: [
        { status: 429, body: { code: 'plafond_jour' }, headers: { 'retry-after': at } },
      ],
    });
    const result = await createAcademiaRequest(input, day.fetch);
    expect(result).toMatchObject({ ok: false, reason: 'quota' });
    expect((result as { retryAfter?: number }).retryAfter).toBeGreaterThan(7000);
    expect((result as { retryAfter?: number }).retryAfter).toBeLessThanOrEqual(7200);
    const busy = fakeAcademia({ createRequest: [{ status: 503 }, { status: 503 }] });
    expect(await createAcademiaRequest(input, busy.fetch)).toMatchObject({
      ok: false,
      reason: 'unavailable',
    });
    expect(busy.calls).toHaveLength(2);
  });

  it('7. un dossier effacé (404) : « introuvable », pour en redemander un', async () => {
    const gone = fakeAcademia({ readRequest: [{ status: 404, body: { code: 'introuvable' } }] });
    expect(await readAcademiaRequest(KEY, FAKE_ACADEMIA_ID, gone.fetch)).toMatchObject({
      ok: false,
      reason: 'not_found',
    });
  });

  it('9. GET /etat : la vraie clé (« ok », sans « essai »), la clé d’essai, ou refusée', async () => {
    expect(
      await checkAcademiaKey(
        KEY,
        fakeAcademia({ status: [{ status: 200, body: { ok: true } }] }).fetch,
      ),
    ).toBe('real');
    expect(
      await checkAcademiaKey(
        KEY,
        fakeAcademia({ status: [{ status: 200, body: { ok: true, essai: true } }] }).fetch,
      ),
    ).toBe('trial');
    expect(
      await checkAcademiaKey(
        KEY,
        fakeAcademia({ status: [{ status: 200, body: { ok: false } }] }).fetch,
      ),
    ).toBe('refused');
    expect(
      await checkAcademiaKey(KEY, fakeAcademia({ status: [{ status: 401, body: {} }] }).fetch),
    ).toBe('refused');
    expect(await checkAcademiaKey(KEY, fakeAcademia({ status: ['timeout'] }).fetch, 50)).toBe(
      'unavailable',
    );
  });
});
