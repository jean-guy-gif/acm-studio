// Mission 100 — un client Supabase factice pour éprouver une action serveur : chaque appel de la
// chaîne (`from`, `update`, `eq`, `rpc`, `auth.admin.…`) est noté, et attendre la chaîne rend la
// réponse prévue. Ce qui compte dans ces tests, c'est ce que l'action a écrit — ou n'a PAS écrit
// quand un garde l'a arrêtée.
export type FakeCall = { method: string; args: unknown[] };
export type FakeResponse = { data?: unknown; error?: unknown; count?: number | null };

const WRITES = ['insert', 'update', 'upsert', 'delete', 'rpc', 'deleteUser', 'inviteUserByEmail'];
const NAMESPACES = ['auth', 'admin', 'storage'];

export function fakeSupabase(respond: (calls: FakeCall[]) => FakeResponse = () => ({})) {
  const calls: FakeCall[] = [];
  // La racine (le client) n'est PAS attendable — `await createClient()` doit rendre le client,
  // pas une réponse ; la chaîne qu'ouvre son premier appel, elle, l'est.
  const make = (awaitable: boolean): unknown => {
    const self: unknown = new Proxy(() => undefined, {
      get(_target, property) {
        const name = String(property);
        if (name === 'then') {
          return awaitable
            ? (resolve: (value: FakeResponse) => unknown) =>
                resolve({ data: null, error: null, ...respond(calls) })
            : undefined;
        }
        if (NAMESPACES.includes(name)) return self;
        return (...args: unknown[]) => {
          calls.push({ method: name, args });
          return chain;
        };
      },
    });
    return self;
  };
  const chain = make(true);
  const builder = make(false);
  return {
    client: builder,
    calls,
    // Les écritures tentées, dans l'ordre : « insert projects », « rpc conclude_meeting »…
    writes(): string[] {
      const out: string[] = [];
      let table = '';
      for (const call of calls) {
        if (call.method === 'from') table = String(call.args[0]);
        if (call.method === 'rpc') out.push(`rpc ${String(call.args[0])}`);
        else if (WRITES.includes(call.method)) out.push(`${call.method} ${table}`.trim());
      }
      return out;
    },
    reset(): void {
      calls.length = 0;
    },
  };
}
