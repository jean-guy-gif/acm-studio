// Mission 157 — un faux serveur Academia (Mon secteur), d'après le contrat v1 de Laurent (14/11) :
// `POST /dossiers`, `GET /dossiers/{id}`, `POST /dossiers/{id}/liens-client`. Il remplace `fetch` dans
// les tests : jamais un appel au vrai service. Chaque appel est noté (méthode, chemin, clé, corps),
// et chaque route répond ce qu'on lui demande (statut, corps, en-têtes), ou ne répond pas (délai).

export type FakeAcademiaCall = {
  method: string;
  path: string;
  authorization: string | null;
  body: unknown;
};

export type FakeAcademiaReply =
  { status: number; body?: unknown; headers?: Record<string, string> } | 'timeout';

export type FakeAcademiaRoutes = {
  createDossier?: FakeAcademiaReply[];
  readDossier?: FakeAcademiaReply[];
  createLink?: FakeAcademiaReply[];
};

export const FAKE_DOSSIER_ID = 'dos_8f2c1a9e';
export const FAKE_LINK = 'https://app.myacademia.ai/l/Vb4nT8wLp2';

export function fakeAcademia(routes: FakeAcademiaRoutes = {}) {
  const calls: FakeAcademiaCall[] = [];
  const queues: Required<FakeAcademiaRoutes> = {
    createDossier: [
      ...(routes.createDossier ?? [
        { status: 200, body: { id: FAKE_DOSSIER_ID, etat: 'pret', reutilise: false } },
      ]),
    ],
    readDossier: [
      ...(routes.readDossier ?? [{ status: 200, body: { id: FAKE_DOSSIER_ID, etat: 'pret' } }]),
    ],
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
    calls.push({ method, path: url.pathname, authorization: headers.get('authorization'), body });
    let reply: FakeAcademiaReply = { status: 404, body: { erreur: 'introuvable' } };
    if (method === 'POST' && url.pathname === '/api/v1/dossiers')
      reply = next(queues.createDossier);
    else if (method === 'GET' && /^\/api\/v1\/dossiers\/[^/]+$/.test(url.pathname))
      reply = next(queues.readDossier);
    else if (method === 'POST' && /^\/api\/v1\/dossiers\/[^/]+\/liens-client$/.test(url.pathname))
      reply = next(queues.createLink);
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
