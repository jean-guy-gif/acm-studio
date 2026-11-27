import { describe, expect, it } from 'vitest';

import {
  ACADEMIA_API_BASE,
  academiaPropertyType,
  createAcademiaClientLink,
  createAcademiaRequest,
  readAcademiaRequest,
} from '@/features/academia/services/academia-api';
import { FAKE_ACADEMIA_ID, FAKE_LINK, fakeAcademia } from '@/test-fixtures/fake-academia';

// Mission 157 — le client de l'API de Laurent (contrat v1 du 14/11), contre un faux serveur : la clé
// dans l'en-tête, seule l'adresse du bien et ses caractéristiques envoyées, chaque réponse relue par
// une liste d'autorisation, les codes d'erreur du contrat, un délai de 8 s et un seul nouvel essai.
const KEY = 'msk_essai_0123456789';
const input = {
  key: KEY,
  adresse: '4 chemin des Restanques Hautes, 06140 Vence',
  bien: { type: 'maison' as const, pieces: 5, surface: 135 },
};

describe('POST /dossiers', () => {
  it('la clé dans l’en-tête, et seulement l’adresse et le bien dans le corps (l’API refuse tout autre champ)', async () => {
    const server = fakeAcademia();
    expect(await createAcademiaRequest(input, server.fetch)).toEqual({
      ok: true,
      id: FAKE_ACADEMIA_ID,
      etat: 'pret',
    });
    expect(server.calls).toHaveLength(1);
    expect(server.calls[0]).toMatchObject({
      method: 'POST',
      path: '/api/v1/dossiers',
      authorization: `Bearer ${KEY}`,
    });
    expect(server.calls[0].body).toEqual({
      adresse: '4 chemin des Restanques Hautes, 06140 Vence',
      bien: { type: 'maison', pieces: 5, surface: 135 },
    });
  });

  it('un bien sans caractéristiques connues part sans « bien »', async () => {
    const server = fakeAcademia();
    await createAcademiaRequest({ ...input, bien: null }, server.fetch);
    expect(server.calls[0].body).toEqual({
      adresse: input.adresse,
    });
  });

  it('202 : en préparation ; « reutilise » n’est jamais rendu', async () => {
    const server = fakeAcademia({
      createRequest: [{ status: 202, body: { id: FAKE_ACADEMIA_ID, etat: 'en_cours' } }],
    });
    const result = await createAcademiaRequest(input, server.fetch);
    expect(result).toEqual({ ok: true, id: FAKE_ACADEMIA_ID, etat: 'en_cours' });
    expect(JSON.stringify(result)).not.toContain('reutilise');
  });

  it('422 : les adresses proposées par Academia, jamais devinées', async () => {
    const server = fakeAcademia({
      createRequest: [
        {
          status: 422,
          body: {
            erreur: 'Adresse introuvable',
            propositions: [
              { adresse: '4 chemin des Restanques Hautes, 06140 Vence' },
              '4 chemin des Restanques, 06140 Vence',
              { inconnu: 1 },
            ],
          },
        },
      ],
    });
    expect(await createAcademiaRequest(input, server.fetch)).toMatchObject({
      ok: false,
      reason: 'ambiguous',
      propositions: [
        '4 chemin des Restanques Hautes, 06140 Vence',
        '4 chemin des Restanques, 06140 Vence',
      ],
    });
  });

  it('les codes du contrat : clé refusée, lecture seule, droit absent, plafond (Retry-After)', async () => {
    const cases: [number, string][] = [
      [401, 'unauthorized'],
      [402, 'readonly'],
      [403, 'forbidden'],
      [404, 'not_found'],
    ];
    for (const [status, reason] of cases) {
      const server = fakeAcademia({ createRequest: [{ status, body: { erreur: 'x' } }] });
      expect(await createAcademiaRequest(input, server.fetch)).toMatchObject({
        ok: false,
        reason,
      });
      expect(server.calls).toHaveLength(1);
    }
    const limited = fakeAcademia({
      createRequest: [
        { status: 429, body: { code: 'plafond_jour' }, headers: { 'retry-after': '3600' } },
      ],
    });
    expect(await createAcademiaRequest(input, limited.fetch)).toMatchObject({
      ok: false,
      reason: 'quota',
      retryAfter: 3600,
    });
    // Jamais de nouvel essai sur une 4xx, plafond compris.
    expect(limited.calls).toHaveLength(1);
  });

  it('une 5xx : un seul nouvel essai ; deux de suite : indisponible', async () => {
    const once = fakeAcademia({
      createRequest: [
        { status: 503 },
        { status: 200, body: { id: FAKE_ACADEMIA_ID, etat: 'pret' } },
      ],
    });
    expect((await createAcademiaRequest(input, once.fetch)).ok).toBe(true);
    expect(once.calls).toHaveLength(2);
    const twice = fakeAcademia({ createRequest: [{ status: 500 }, { status: 502 }] });
    expect(await createAcademiaRequest(input, twice.fetch)).toMatchObject({
      ok: false,
      reason: 'unavailable',
    });
    expect(twice.calls).toHaveLength(2);
  });

  it('pas de réponse en 8 s : un seul nouvel essai, puis indisponible', async () => {
    const server = fakeAcademia({ createRequest: ['timeout'] });
    expect(await createAcademiaRequest(input, server.fetch, 20)).toMatchObject({
      ok: false,
      reason: 'unavailable',
    });
    expect(server.calls).toHaveLength(2);
  });

  it('une réponse hors du contrat n’est jamais crue : indisponible', async () => {
    for (const body of [
      { id: '../autre', etat: 'pret' },
      { id: FAKE_ACADEMIA_ID, etat: 'peut-etre' },
      'pas du json',
      null,
    ]) {
      const server = fakeAcademia({ createRequest: [{ status: 200, body }] });
      expect(await createAcademiaRequest(input, server.fetch)).toMatchObject({
        ok: false,
        reason: 'unavailable',
      });
    }
  });
});

describe('ce qu’Academia a rendu, dit au journal (pour Laurent)', () => {
  it('le statut, le code et le message de son erreur ; jamais la clé', async () => {
    const server = fakeAcademia({
      createRequest: [
        { status: 404, body: { erreur: { code: 'route_inconnue', message: 'Route inconnue' } } },
      ],
    });
    const result = await createAcademiaRequest(input, server.fetch);
    expect(result).toEqual({
      ok: false,
      reason: 'not_found',
      detail: 'HTTP 404 · route_inconnue · Route inconnue',
    });
    expect(JSON.stringify(result)).not.toContain(KEY);
    const flat = fakeAcademia({
      createRequest: [
        { status: 400, body: { code: 'adresse_absente', message: 'Adresse requise' } },
      ],
    });
    expect(await createAcademiaRequest(input, flat.fetch)).toMatchObject({
      reason: 'unavailable',
      detail: 'HTTP 400 · adresse_absente · Adresse requise',
    });
  });

  it('deux 5xx : le dernier statut ; aucune réponse : le délai', async () => {
    const twice = fakeAcademia({ createRequest: [{ status: 500 }, { status: 502 }] });
    expect(await createAcademiaRequest(input, twice.fetch)).toMatchObject({ detail: 'HTTP 502' });
    const silent = fakeAcademia({ createRequest: ['timeout'] });
    expect(await createAcademiaRequest(input, silent.fetch, 20)).toMatchObject({
      detail: 'aucune réponse en 0 s',
    });
  });

  it('une réponse hors contrat : les noms de ses champs, jamais leurs valeurs', async () => {
    const server = fakeAcademia({
      createRequest: [
        { status: 200, body: { dossier: { id: 'dos_secret' }, statut: 'pret', lien: 'x' } },
      ],
    });
    const result = await createAcademiaRequest(input, server.fetch);
    expect(result).toMatchObject({
      reason: 'unavailable',
      detail: 'HTTP 200 · réponse hors contrat · champs\u00a0: dossier, statut, lien',
    });
    expect(JSON.stringify(result)).not.toContain('dos_secret');
  });
});

describe('la forme réelle de l’API d’essai (17/11)', () => {
  it('« statut » et les noms en camelCase sont lus ; « adresse », « creeLe »… ne sont pas gardés', async () => {
    const server = fakeAcademia({
      createRequest: [
        {
          status: 200,
          body: {
            id: FAKE_ACADEMIA_ID,
            statut: 'pret',
            adresse: '12 Avenue de la Démonstration, 06800 Cagnes-sur-Mer',
            creeLe: '2026-11-17T13:49:35Z',
            actualiseLe: '2026-11-17T13:49:35Z',
            effaceLe: '2027-11-17T13:49:35Z',
            reutilise: true,
          },
        },
      ],
    });
    expect(await createAcademiaRequest(input, server.fetch)).toEqual({
      ok: true,
      id: FAKE_ACADEMIA_ID,
      etat: 'pret',
    });
  });

  it('un statut inconnu : dit au journal, jamais deviné', async () => {
    const server = fakeAcademia({
      createRequest: [{ status: 200, body: { id: FAKE_ACADEMIA_ID, statut: 'archive' } }],
    });
    expect(await createAcademiaRequest(input, server.fetch)).toMatchObject({
      reason: 'unavailable',
      detail:
        'HTTP 200 · réponse hors contrat · champs\u00a0: id, statut · statut inconnu\u00a0: archive',
    });
  });

  it('le lien client : « expireLe » comme « expire_le »', async () => {
    const server = fakeAcademia({
      createLink: [{ status: 201, body: { url: FAKE_LINK, expireLe: '2026-12-17T13:49:35Z' } }],
    });
    expect(await createAcademiaClientLink(KEY, FAKE_ACADEMIA_ID, server.fetch)).toEqual({
      ok: true,
      url: FAKE_LINK,
      expiresAt: '2026-12-17T13:49:35.000Z',
    });
  });
});

describe('GET /dossiers/{id}', () => {
  it('l’état de la préparation, par l’identifiant du dossier', async () => {
    const server = fakeAcademia({
      readRequest: [{ status: 200, body: { id: FAKE_ACADEMIA_ID, etat: 'en_cours', sources: [] } }],
    });
    expect(await readAcademiaRequest(KEY, FAKE_ACADEMIA_ID, server.fetch)).toEqual({
      ok: true,
      etat: 'en_cours',
    });
    expect(server.calls[0]).toMatchObject({
      method: 'GET',
      path: `/api/v1/dossiers/${FAKE_ACADEMIA_ID}`,
      authorization: `Bearer ${KEY}`,
    });
  });

  it('un identifiant de forme inconnue ne part pas', async () => {
    const server = fakeAcademia();
    expect(await readAcademiaRequest(KEY, '../moi', server.fetch)).toMatchObject({
      ok: false,
      reason: 'not_found',
    });
    expect(server.calls).toEqual([]);
  });
});

describe('POST /dossiers/{id}/liens-client', () => {
  it('le lien « Vivre ici » et son expiration', async () => {
    const server = fakeAcademia();
    expect(await createAcademiaClientLink(KEY, FAKE_ACADEMIA_ID, server.fetch)).toEqual({
      ok: true,
      url: FAKE_LINK,
      expiresAt: '2026-12-16T00:00:00.000Z',
    });
    expect(server.calls[0]).toMatchObject({
      method: 'POST',
      path: `/api/v1/dossiers/${FAKE_ACADEMIA_ID}/liens-client`,
      body: { type: 'vivre-ici' },
    });
  });

  it('un lien qui n’est pas d’Academia, ou sans expiration lisible, n’est jamais rangé', async () => {
    for (const body of [
      { url: 'https://exemple.fr/l/x', expire_le: '2026-12-16' },
      { url: 'https://app.myacademia.ai/l/x?adresse=12+rue', expire_le: '2026-12-16' },
      { url: FAKE_LINK, expire_le: 'bientôt' },
      { url: FAKE_LINK },
    ]) {
      const server = fakeAcademia({ createLink: [{ status: 201, body }] });
      expect(await createAcademiaClientLink(KEY, FAKE_ACADEMIA_ID, server.fetch)).toMatchObject({
        ok: false,
        reason: 'unavailable',
      });
    }
  });

  it('sans le droit au lien client (403) : refusé, dit tel quel', async () => {
    const server = fakeAcademia({ createLink: [{ status: 403, body: { erreur: 'offre' } }] });
    expect(await createAcademiaClientLink(KEY, FAKE_ACADEMIA_ID, server.fetch)).toMatchObject({
      ok: false,
      reason: 'forbidden',
    });
  });
});

describe('le type du bien', () => {
  it('le vocabulaire du contrat ; un type inconnu ne part pas', () => {
    expect(academiaPropertyType('Appartement')).toBe('appartement');
    expect(academiaPropertyType('Maison')).toBe('maison');
    expect(academiaPropertyType('Villa')).toBe('maison');
    expect(academiaPropertyType('Terrain')).toBeNull();
    expect(academiaPropertyType(null)).toBeNull();
  });

  it('la base de l’API est celle du contrat', () => {
    expect(ACADEMIA_API_BASE).toBe('https://app.myacademia.ai/api/v1');
  });
});

describe('GET /dossiers/{id}/bien (mission 158)', () => {
  it('la clé dans l’en-tête, le type, les pièces et la surface en paramètres, la réponse rendue', async () => {
    const { readAcademiaPropertyView } = await import('@/features/academia/services/academia-api');
    const server = fakeAcademia({ readView: [{ status: 200, body: { blocs: { ventes: {} } } }] });
    const result = await readAcademiaPropertyView(
      KEY,
      FAKE_ACADEMIA_ID,
      { type: 'maison', pieces: 5, surface: 135 },
      server.fetch,
    );
    expect(result).toEqual({ ok: true, json: { blocs: { ventes: {} } } });
    expect(server.calls[0]).toMatchObject({
      method: 'GET',
      path: `/api/v1/dossiers/${FAKE_ACADEMIA_ID}/bien`,
      query: '?type=maison&pieces=5&surface=135',
      authorization: `Bearer ${KEY}`,
    });
  });

  it('une erreur d’Academia est dite avec son détail ; un identifiant douteux ne part pas', async () => {
    const { readAcademiaPropertyView } = await import('@/features/academia/services/academia-api');
    const server = fakeAcademia({
      readView: [{ status: 400, body: { erreur: 'Demande invalide', code: 'demande' } }],
    });
    expect(
      await readAcademiaPropertyView(
        KEY,
        FAKE_ACADEMIA_ID,
        { type: 'maison', pieces: 5, surface: 135 },
        server.fetch,
      ),
    ).toMatchObject({
      ok: false,
      reason: 'unavailable',
      detail: 'HTTP 400 · demande · Demande invalide',
    });
    const none = fakeAcademia();
    expect(
      await readAcademiaPropertyView(
        KEY,
        '../x',
        { type: 'maison', pieces: 5, surface: 135 },
        none.fetch,
      ),
    ).toEqual({ ok: false, reason: 'not_found' });
    expect(none.calls).toHaveLength(0);
  });
});
