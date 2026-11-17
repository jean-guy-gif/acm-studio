import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Database } from '@/lib/supabase/database.types';

// Mission 159 — le quartier lu pour le Live et les documents (décisions de Jean-Guy, 17/11) : le
// dernier instantané ; un lien déjà envoyé lit celui d'avant sa création ; avant le Live, un
// instantané fait pour une autre adresse ou un autre bien est écarté et le panneau le dit ; le Live
// commencé, on garde ce qui a été montré et l'adresse du bien n'est plus lue.
vi.mock('server-only', () => ({}));
vi.mock('@/lib/app-errors/report-server-error', () => ({
  reportServerError: vi.fn(async () => {}),
}));
const { readNeighbourhoodSnapshot, neighbourhoodKeys } =
  await import('@/features/neighbourhood-link/queries/read-neighbourhood-snapshot');

type Rows = Record<string, { data?: unknown; count?: number; error?: unknown }>;
let rows: Rows;
let reads: { table: string; select: string; filters: [string, unknown][] }[];

// Un faux client qui répond par table (les lectures partent ensemble).
function client(): SupabaseClient<Database> {
  return {
    from(table: string) {
      const entry = { table, select: '', filters: [] as [string, unknown][] };
      reads.push(entry);
      const chain: Record<string, unknown> = {
        select(columns: string) {
          entry.select = columns;
          return chain;
        },
        then(resolve: (value: unknown) => unknown) {
          return Promise.resolve(resolve({ data: null, error: null, ...rows[table] }));
        },
      };
      for (const name of ['eq', 'order', 'limit', 'lte', 'maybeSingle'])
        chain[name] = (...args: unknown[]) => {
          entry.filters.push([name, args]);
          return chain;
        };
      return chain;
    },
  } as unknown as SupabaseClient<Database>;
}

const SNAPSHOT = {
  blocks: {
    risques: { source: 'Géorisques', date: '2026-10-07', clay: 2, earthquake: 4, radon: 1 },
    ventes: { list: [{ month: '2025-11', price: 876800, street: 'Rue des Oliviers' }] },
    estimation: { middle: 980000 },
  },
  taken_at: '2026-11-17T18:00:00Z',
  property_address: '4 chemin des Restanques Hautes, 06140 Vence',
  property_type: 'maison',
  property_rooms: 5,
  property_surface: 135,
};
const PROPERTY = {
  address: '4 chemin des Restanques Hautes',
  postal_code: '06140',
  city: 'Vence',
  property_type: 'Maison',
  rooms_count: 5,
  surface_area: 135,
};

beforeEach(() => {
  reads = [];
  rows = {
    projects: { data: { status: 'ready_for_meeting', live_started_at: null } },
    live_seller_responses: { count: 0 },
    subject_properties: { data: PROPERTY },
    project_neighbourhood_snapshots: { data: SNAPSHOT },
  };
});

describe('readNeighbourhoodSnapshot', () => {
  it('le dernier instantané, relu champ par champ : seuls ses blocs, rien d’autre', async () => {
    const state = await readNeighbourhoodSnapshot(client(), 'a1', 'p1');
    expect(state.stale).toBe(false);
    expect(neighbourhoodKeys(state)).toEqual(['risques', 'ventes']);
    expect(state.snapshot?.takenAt).toBe('2026-11-17T18:00:00Z');
    expect(JSON.stringify(state)).not.toMatch(/estimation|980000/);
    const snapshot = reads.find((read) => read.table === 'project_neighbourhood_snapshots');
    expect(snapshot?.filters).toContainEqual(['order', ['taken_at', { ascending: false }]]);
  });

  it('un lien déjà envoyé lit l’instantané d’avant sa création', async () => {
    await readNeighbourhoodSnapshot(client(), 'a1', 'p1', { before: '2026-11-18T09:00:00Z' });
    const snapshot = reads.find((read) => read.table === 'project_neighbourhood_snapshots');
    expect(snapshot?.filters).toContainEqual(['lte', ['taken_at', '2026-11-18T09:00:00Z']]);
  });

  it('avant le Live, l’adresse, le type, les pièces ou la surface changés : écarté, et dit', async () => {
    for (const change of [
      { address: '6 chemin des Restanques Hautes' },
      { property_type: 'Appartement' },
      { rooms_count: 6 },
      { surface_area: 140 },
    ]) {
      rows.subject_properties = { data: { ...PROPERTY, ...change } };
      const state = await readNeighbourhoodSnapshot(client(), 'a1', 'p1');
      expect(state).toEqual({ snapshot: null, stale: true, locked: false });
    }
  });

  it('le Live commencé : on garde ce qui a été montré, et l’adresse n’est plus lue', async () => {
    rows.subject_properties = { data: { ...PROPERTY, address: '6 autre rue' } };
    for (const started of [
      {
        projects: {
          data: { status: 'ready_for_meeting', live_started_at: '2026-11-18T10:00:00Z' },
        },
      },
      { live_seller_responses: { count: 2 } },
      { projects: { data: { status: 'meeting_completed', live_started_at: null } } },
    ]) {
      reads = [];
      Object.assign(rows, started);
      const state = await readNeighbourhoodSnapshot(client(), 'a1', 'p1');
      expect(state.locked).toBe(true);
      expect(neighbourhoodKeys(state)).toEqual(['risques', 'ventes']);
      expect(reads.some((read) => read.table === 'subject_properties')).toBe(false);
      rows.projects = { data: { status: 'ready_for_meeting', live_started_at: null } };
      rows.live_seller_responses = { count: 0 };
    }
  });

  it('sans instantané, ou une lecture en échec : aucun écran, jamais une erreur', async () => {
    rows.project_neighbourhood_snapshots = { data: null };
    expect(neighbourhoodKeys(await readNeighbourhoodSnapshot(client(), 'a1', 'p1'))).toEqual([]);
    rows.project_neighbourhood_snapshots = { error: { message: 'panne' } };
    expect(await readNeighbourhoodSnapshot(client(), 'a1', 'p1')).toEqual({
      snapshot: null,
      stale: false,
      locked: false,
    });
  });
});
