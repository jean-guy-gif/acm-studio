import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase } from '@/test-fixtures/fake-supabase';

// Mission 157 — le lien « Vivre ici » d'un mandat signé part vers l'acquéreur ; créé par l'API, il a
// son expiration donnée par Academia : expiré, il ne part plus. Collé à la main, il garde sa date de
// collage (les avertissements de la M156). Une lecture en échec n'est jamais « pas de lien » (M98).
vi.mock('@/lib/app-errors/report-server-error', () => ({ reportServerError: async () => {} }));
const { readMandateAcademiaLinks } =
  await import('@/features/academia/queries/read-academia-links');

const API_LINK = 'https://app.myacademia.ai/l/Vb4nT8wLp2';
const PASTED = 'https://app.myacademia.ai/l/colle';
const NOW = new Date('2026-11-16T10:00:00Z');
const state = vi.hoisted(() => ({
  projects: [] as Record<string, unknown>[],
  dossiers: [] as Record<string, unknown>[] | null,
  subjects: [
    {
      project_id: 'p1',
      address: '4 chemin des Restanques Hautes',
      postal_code: '06140',
      city: 'Vence',
    },
  ] as Record<string, unknown>[],
}));
const db = fakeSupabase((calls) => {
  const last = calls.map((call) => call.method).lastIndexOf('from');
  const table = String(calls[last]?.args[0]);
  if (table === 'projects') return { data: state.projects };
  if (table === 'project_meeting_conclusions')
    return { data: [{ project_id: 'p1' }, { project_id: 'p2' }] };
  if (table === 'subject_properties') return { data: state.subjects };
  if (table === 'project_academia_dossiers') {
    return state.dossiers ? { data: state.dossiers } : { error: { message: 'lecture impossible' } };
  }
  return { data: null };
});

beforeEach(() => {
  db.reset();
  state.subjects = [
    {
      project_id: 'p1',
      address: '4 chemin des Restanques Hautes',
      postal_code: '06140',
      city: 'Vence',
    },
  ];
  state.projects = [
    {
      id: 'p1',
      academia_living_here_url: API_LINK,
      academia_living_here_pasted_at: '2026-11-10T09:00:00Z',
    },
    {
      id: 'p2',
      academia_living_here_url: PASTED,
      academia_living_here_pasted_at: '2026-10-10T09:00:00Z',
    },
  ];
  state.dossiers = [
    {
      project_id: 'p1',
      property_address: '4 chemin des Restanques Hautes, 06140 Vence',
      link_url: API_LINK,
      link_expires_at: '2026-12-10T00:00:00Z',
    },
  ];
});

describe('le lien « Vivre ici » d’un mandat vers l’acquéreur', () => {
  it('créé par l’API et valable : il part, sans date de collage ; collé à la main : sa date', async () => {
    const read = await readMandateAcademiaLinks(db.client as never, 'agency-a', ['p1', 'p2'], NOW);
    expect(read).toEqual({
      ok: true,
      links: new Map([
        ['p1', API_LINK],
        ['p2', PASTED],
      ]),
      dates: new Map([
        ['p1', null],
        ['p2', '2026-10-10T09:00:00Z'],
      ]),
    });
  });

  it('créé par l’API et expiré : il ne part plus', async () => {
    state.dossiers = [
      {
        project_id: 'p1',
        property_address: '4 chemin des Restanques Hautes, 06140 Vence',
        link_url: API_LINK,
        link_expires_at: '2026-11-15T00:00:00Z',
      },
    ];
    const read = await readMandateAcademiaLinks(db.client as never, 'agency-a', ['p1', 'p2'], NOW);
    expect(read.ok && [...read.links.keys()]).toEqual(['p2']);
  });

  it('un lien recollé à la main après celui de l’API : il part, avec sa date de collage', async () => {
    state.projects = [
      {
        id: 'p1',
        academia_living_here_url: PASTED,
        academia_living_here_pasted_at: '2026-11-14T09:00:00Z',
      },
    ];
    state.dossiers = [
      {
        project_id: 'p1',
        property_address: '4 chemin des Restanques Hautes, 06140 Vence',
        link_url: API_LINK,
        link_expires_at: '2026-11-15T00:00:00Z',
      },
    ];
    const read = await readMandateAcademiaLinks(db.client as never, 'agency-a', ['p1'], NOW);
    expect(read.ok && read.links.get('p1')).toBe(PASTED);
    expect(read.ok && read.dates.get('p1')).toBe('2026-11-14T09:00:00Z');
  });

  it('l’adresse du bien changée depuis la demande : le lien de l’ancienne adresse ne part plus', async () => {
    state.subjects = [
      {
        project_id: 'p1',
        address: '6 chemin des Restanques Hautes',
        postal_code: '06140',
        city: 'Vence',
      },
    ];
    const read = await readMandateAcademiaLinks(db.client as never, 'agency-a', ['p1', 'p2'], NOW);
    expect(read.ok && [...read.links.keys()]).toEqual(['p2']);
  });

  it('les expirations illisibles : une lecture en échec, jamais « pas de lien »', async () => {
    state.dossiers = null;
    expect(await readMandateAcademiaLinks(db.client as never, 'agency-a', ['p1'], NOW)).toEqual({
      ok: false,
    });
  });
});
