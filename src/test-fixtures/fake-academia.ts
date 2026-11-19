// Mission 157 — un faux serveur Academia (Mon secteur), d'après le contrat v1 de Laurent (14/11) :
// `POST /dossiers`, `GET /dossiers/{id}`, `POST /dossiers/{id}/liens-client`. Il remplace `fetch` dans
// les tests : jamais un appel au vrai service. Chaque appel est noté (méthode, chemin, clé, corps),
// et chaque route répond ce qu'on lui demande (statut, corps, en-têtes), ou ne répond pas (délai).

export type FakeAcademiaCall = {
  method: string;
  path: string;
  query: string;
  authorization: string | null;
  body: unknown;
};

export type FakeAcademiaReply =
  { status: number; body?: unknown; headers?: Record<string, string> } | 'timeout';

export type FakeAcademiaRoutes = {
  createRequest?: FakeAcademiaReply[];
  readRequest?: FakeAcademiaReply[];
  createLink?: FakeAcademiaReply[];
  // Mission 158 — la vue « bien » d'un dossier.
  readView?: FakeAcademiaReply[];
  // Mission 159 — la vue « bien-client », la seule qui va au vendeur.
  readClientView?: FakeAcademiaReply[];
  // Mission 161 — `GET /etat` : la clé vue par Academia.
  status?: FakeAcademiaReply[];
};

export const FAKE_ACADEMIA_ID = 'dos_8f2c1a9e';
export const FAKE_LINK = 'https://app.myacademia.ai/l/Vb4nT8wLp2';

// Correctifs 161 — la fourchette de surface des ventes (Laurent, 19/11) : deux paramètres
// facultatifs, de 9 à 1 000 m², seuls ou ensemble ; le minimum plus petit que le maximum.
const invalidSurface: FakeAcademiaReply = {
  status: 400,
  body: {
    erreur: { code: 'demande', message: 'Demande invalide : surfaceMin, surfaceMax, pieces.' },
  },
};
function surfaceRangeError(bien: unknown): boolean {
  if (!bien || typeof bien !== 'object') return false;
  const { surfaceMin, surfaceMax } = bien as { surfaceMin?: unknown; surfaceMax?: unknown };
  const read = (value: unknown) => (value == null ? null : Number(value));
  const min = read(surfaceMin);
  const max = read(surfaceMax);
  const outside = (value: number | null) =>
    value != null && (!Number.isFinite(value) || value < 9 || value > 1000);
  return outside(min) || outside(max) || (min != null && max != null && min >= max);
}

export function fakeAcademia(routes: FakeAcademiaRoutes = {}) {
  const calls: FakeAcademiaCall[] = [];
  const queues: Required<FakeAcademiaRoutes> = {
    createRequest: [
      ...(routes.createRequest ?? [
        { status: 200, body: { id: FAKE_ACADEMIA_ID, etat: 'pret', reutilise: false } },
      ]),
    ],
    readRequest: [
      ...(routes.readRequest ?? [{ status: 200, body: { id: FAKE_ACADEMIA_ID, etat: 'pret' } }]),
    ],
    readView: [...(routes.readView ?? [{ status: 200, body: { blocs: {} } }])],
    readClientView: [...(routes.readClientView ?? [{ status: 200, body: { blocs: {} } }])],
    status: [...(routes.status ?? [{ status: 200, body: { ok: true } }])],
    createLink: [
      ...(routes.createLink ?? [
        { status: 201, body: { url: FAKE_LINK, expire_le: '2026-12-16T00:00:00Z' } },
      ]),
    ],
  };
  // La dernière réponse d'une file sert pour les appels suivants.
  const next = (queue: FakeAcademiaReply[]): FakeAcademiaReply =>
    queue.length > 1 ? (queue.shift() as FakeAcademiaReply) : queue[0];

  const fetchImpl = async (input: string | URL, init: RequestInit = {}): Promise<Response> => {
    const url = new URL(String(input));
    const method = (init.method ?? 'GET').toUpperCase();
    const headers = new Headers(init.headers);
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : null;
    calls.push({
      method,
      path: url.pathname,
      query: url.search,
      authorization: headers.get('authorization'),
      body,
    });
    let reply: FakeAcademiaReply = { status: 404, body: { erreur: 'introuvable' } };
    const extra =
      body && typeof body === 'object'
        ? Object.keys(body).filter((key) => key !== 'adresse' && key !== 'bien')
        : [];
    if (method === 'POST' && url.pathname === '/api/v1/dossiers' && extra.length > 0) {
      // Comme l'API d'essai (17/11) : seuls « adresse » et « bien » sont acceptés.
      reply = {
        status: 400,
        body: {
          erreur: {
            code: 'demande',
            message:
              'Demande invalide : seuls « adresse » et « bien » (type, pieces, surface) sont acceptés.',
          },
        },
      };
    } else if (
      method === 'POST' &&
      url.pathname === '/api/v1/dossiers' &&
      surfaceRangeError(body && typeof body === 'object' ? (body as { bien?: unknown }).bien : null)
    ) {
      // Laurent, 19/11 : surfaceMin et surfaceMax facultatifs, de 9 à 1 000 m², le minimum plus
      // petit que le maximum ; sinon 400.
      reply = invalidSurface;
    } else if (method === 'POST' && url.pathname === '/api/v1/dossiers')
      reply = next(queues.createRequest);
    else if (
      method === 'GET' &&
      /^\/api\/v1\/dossiers\/[^/]+\/bien(-client)?$/.test(url.pathname) &&
      (!url.searchParams.get('pieces') ||
        surfaceRangeError(Object.fromEntries(url.searchParams.entries())))
    )
      // « pieces » reste obligatoire dans l'appel des vues (Laurent, 19/11).
      reply = invalidSurface;
    else if (method === 'GET' && /^\/api\/v1\/dossiers\/[^/]+\/bien$/.test(url.pathname))
      reply = next(queues.readView);
    else if (method === 'GET' && /^\/api\/v1\/dossiers\/[^/]+\/bien-client$/.test(url.pathname))
      reply = next(queues.readClientView);
    else if (method === 'GET' && /^\/api\/v1\/dossiers\/[^/]+$/.test(url.pathname))
      reply = next(queues.readRequest);
    else if (method === 'POST' && /^\/api\/v1\/dossiers\/[^/]+\/liens-client$/.test(url.pathname))
      reply = next(queues.createLink);
    else if (method === 'GET' && url.pathname === '/api/v1/etat') reply = next(queues.status);
    if (reply === 'timeout') {
      // Le délai du client coupe l'appel : on attend son signal.
      return new Promise((_, reject) => {
        init.signal?.addEventListener('abort', () =>
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
        );
      });
    }
    return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), {
      status: reply.status,
      headers: { 'content-type': 'application/json', ...(reply.headers ?? {}) },
    });
  };
  return { fetch: fetchImpl, calls };
}
