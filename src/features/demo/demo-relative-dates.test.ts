import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEMO_LEGAL_IDENTITY } from '@/features/demo/data/demo-legal-identity';
import { demoKellerOfferPlan } from '@/features/demo/services/demo-seed';
import type { FakeCall, FakeResponse } from '@/test-fixtures/fake-supabase';

// Mission 147 (partie B.2) — toutes les dates de la démo partent du jour de la remise à zéro. La
// démo est semée deux fois sur un client factice, à deux « maintenant », et chaque date écrite doit
// avoir bougé exactement de l'écart. Les deux jours sont des lundis d'hiver (même décalage horaire,
// même jour de la semaine pour le point de la semaine) dont le mois précédent a 31 jours (le
// mandat signé « il y a un mois calendaire », M130) : sans cela, un décalage juste ne serait pas
// constant. Les dates que la base pose elle-même (heure de la base) ne sont pas écrites par la démo.

vi.mock('@/features/demo/services/is-demo-agency', () => ({ isDemoAgency: async () => true }));
vi.mock('@/lib/app-errors/report-server-error', () => ({ reportServerError: async () => {} }));

const AGENCY = '11111111-1111-4111-8111-111111111111';
const CLOSER = { id: 'u-closer', agencyId: AGENCY };
const FIRST = new Date('2026-11-09T09:30:00.000Z');
const SECOND = new Date('2027-02-15T09:30:00.000Z');
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

// Un client factice dont chaque requête garde ses propres appels : `Promise.all` lit plusieurs
// tables à la fois (le bon des Keller), et chacune doit recevoir SA réponse. Tous les appels sont
// aussi notés dans l'ordre, pour relire ce qui a été écrit.
function chainClient(respond: (chain: FakeCall[]) => FakeResponse) {
  const calls: FakeCall[] = [];
  const chainOf = (first: FakeCall): unknown => {
    const own: FakeCall[] = [first];
    const proxy: unknown = new Proxy(() => undefined, {
      get(_target, property) {
        const name = String(property);
        if (name === 'then') {
          return (resolve: (value: FakeResponse) => unknown) =>
            resolve({ data: null, error: null, ...respond(own) });
        }
        return (...args: unknown[]) => {
          const call = { method: name, args };
          calls.push(call);
          own.push(call);
          return proxy;
        };
      },
    });
    return proxy;
  };
  const start =
    (method: string) =>
    (...args: unknown[]) => {
      const call = { method, args };
      calls.push(call);
      return chainOf(call);
    };
  const client = {
    from: start('from'),
    rpc: start('rpc'),
    storage: {
      from: (bucket: string) => ({ upload: start('upload'), remove: start('remove'), bucket }),
    },
  };
  const WRITES = ['insert', 'update', 'upsert', 'delete', 'rpc'];
  return {
    client,
    calls,
    writes(): string[] {
      const out: string[] = [];
      let table = '';
      for (const call of calls) {
        if (call.method === 'from') table = String(call.args[0]);
        if (call.method === 'rpc') out.push(`rpc ${String(call.args[0])}`);
        else if (WRITES.includes(call.method)) out.push(`${call.method} ${table}`);
      }
      return out;
    },
  };
}

// Une petite base en mémoire : ce qui est inséré se relit (les concurrents, les sélections), avec
// des identifiants déterministes, pour que les deux semis suivent exactement le même chemin.
type Row = Record<string, unknown>;

function seedingClient() {
  let next = 0;
  const id = () => `00000000-0000-4000-8000-${String((next += 1)).padStart(12, '0')}`;
  const tables = new Map<string, Row[]>([
    [
      'profiles',
      [
        {
          id: CLOSER.id,
          agency_id: AGENCY,
          first_name: 'Claire',
          last_name: 'Martin',
          phone: '06 12 34 56 78',
        },
      ],
    ],
    ['agencies', [{ id: AGENCY, name: 'Agence Horizon Côte d’Azur' }]],
    [
      'agency_branding',
      [
        {
          agency_id: AGENCY,
          document_name: null,
          postal_address: '70 rue du Bonheur, 06140 Vence',
          professional_card: 'CPI 0605 2026 000 000 001',
          professional_card_issuer: 'CCI Nice Côte d’Azur',
          logo_light_path: null,
          logo_dark_path: null,
        },
      ],
    ],
    ['agency_legal_identities', [{ agency_id: AGENCY, ...DEMO_LEGAL_IDENTITY }]],
  ]);
  const rowsOf = (table: string): Row[] => tables.get(table) ?? tables.set(table, []).get(table)!;
  const matches = (row: Row, chain: FakeCall[]): boolean =>
    chain.every((call) => {
      const column = String(call.args[0]);
      if (column.includes('.') || !(column in row)) return true;
      if (call.method === 'eq') return row[column] === call.args[1];
      if (call.method === 'in') return (call.args[1] as unknown[]).includes(row[column]);
      return true;
    });
  return chainClient((chain: FakeCall[]) => {
    const table = chain[0]?.method === 'from' ? String(chain[0].args[0]) : '';
    const names = chain.map((call) => call.method);
    const last = chain[chain.length - 1]!;
    if (last.method === 'rpc') {
      // La conclusion que pose la fonction de la base : le bon et l'offre des Keller la relisent.
      const args = (last.args[1] ?? {}) as Row;
      if (last.args[0] === 'conclude_meeting') {
        rowsOf('project_meeting_conclusions').push({
          id: id(),
          project_id: args.p_project_id,
          agency_id: AGENCY,
          commercialization_price: args.p_price,
        });
      }
      return { data: id() };
    }
    if (last.method === 'upload') return { data: { path: String(last.args[0]) } };
    if (last.method === 'remove') return { data: [] };
    const single = names.includes('single') || names.includes('maybeSingle');
    const insert = chain.find((call) => call.method === 'insert' || call.method === 'upsert');
    if (insert) {
      const given = insert.args[0];
      const rows = (Array.isArray(given) ? given : [given]).map((row) => ({
        id: id(),
        ...(row as Row),
      }));
      rowsOf(table).push(...rows);
      return { data: single ? rows[0] : rows };
    }
    const filters = chain.filter((call) => call.method === 'eq' || call.method === 'in');
    const update = chain.find((call) => call.method === 'update');
    if (update) {
      for (const row of rowsOf(table)) {
        if (matches(row, filters)) Object.assign(row, update.args[0]);
      }
      return { data: [] };
    }
    if (names.includes('delete')) return { data: [] };
    const found = rowsOf(table).filter((row) => matches(row, filters));
    return { data: single ? (found[0] ?? null) : found };
  });
}

// Toutes les dates écrites, dans l'ordre : lignes insérées, mises à jour, arguments des fonctions.
function writtenDates(calls: FakeCall[]): string[] {
  const dates: string[] = [];
  const walk = (value: unknown): void => {
    if (typeof value === 'string') {
      if (ISO_DATE.test(value)) dates.push(value);
    } else if (Array.isArray(value)) {
      value.forEach(walk);
    } else if (value && typeof value === 'object' && !(value instanceof Uint8Array)) {
      Object.values(value).forEach(walk);
    }
  };
  for (const call of calls) {
    if (['insert', 'update', 'upsert'].includes(call.method)) walk(call.args[0]);
    if (call.method === 'rpc') walk(call.args[1]);
  }
  return dates;
}

async function seedAt(now: Date): Promise<{ ok: boolean; dates: string[]; writes: string[] }> {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
  const { seedDemoDossiers } = await import('@/features/demo/services/demo-dossiers');
  const service = seedingClient();
  const ok = await seedDemoDossiers(service.client as never, CLOSER, now);
  vi.useRealTimers();
  return { ok, dates: writtenDates(service.calls), writes: service.writes() };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('les dates de la démo sont relatives au jour de la remise à zéro', () => {
  it('semée à deux « maintenant », chaque date écrite bouge exactement de l’écart', async () => {
    const first = await seedAt(FIRST);
    const second = await seedAt(SECOND);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    // Assez de dates pour que la preuve compte : dossiers, Live, conclusions, acquéreurs.
    expect(first.dates.length).toBeGreaterThan(150);
    for (const table of ['projects', 'live_seller_responses', 'buyers', 'buyer_documents']) {
      expect(first.writes).toContain(`insert ${table}`);
    }
    expect(second.dates).toHaveLength(first.dates.length);
    const shift = SECOND.getTime() - FIRST.getTime();
    const shiftDays = shift / 86_400_000;
    // Seules dates fixes permises : les dates de naissance des offrants de l'offre des Keller (un
    // état civil, pas une date de la démo).
    const births = new Set(
      demoKellerOfferPlan(1_000_000, FIRST).offrants.map((offrant) => offrant.birthDate),
    );
    const fixed = first.dates.flatMap((date, index) => {
      const other = second.dates[index]!;
      if (births.has(date) && other === date) return [];
      const moved =
        date.length === 10
          ? (Date.parse(`${other}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86_400_000 ===
            shiftDays
          : Date.parse(other) - Date.parse(date) === shift;
      return moved ? [] : [`${date} → ${other}`];
    });
    expect(fixed).toEqual([]);
  });
});
