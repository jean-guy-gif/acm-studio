import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase } from '@/test-fixtures/fake-supabase';

// Mission 157 B — le lien « Vivre ici » du bien, montré au vendeur : seul le lien client relu, et sa
// date de validité quand elle est connue ; rien d'autre de la demande (son identifiant, l'adresse
// envoyée), jamais une erreur devant le vendeur (une lecture en échec ne montre rien et entre au
// journal).
const reported = vi.hoisted(() => [] as string[]);
vi.mock('@/lib/app-errors/report-server-error', () => ({
  reportServerError: async (scope: string) => {
    reported.push(scope);
  },
}));
const { readNeighbourhoodLink } =
  await import('@/features/neighbourhood-link/queries/read-neighbourhood-link');

const LINK = 'https://app.myacademia.ai/l/Vb4nT8wLp2';
const ADDRESS = '4 chemin des Restanques Hautes, 06140 Vence';
const NOW = new Date('2026-11-17T10:00:00Z');
const PROPERTY = { address: '4 chemin des Restanques Hautes', postal_code: '06140', city: 'Vence' };

const state = vi.hoisted(() => ({
  project: null as Record<string, unknown> | null,
  request: null as Record<string, unknown> | null,
  failRequest: false,
  failProject: false,
}));
const db = fakeSupabase((calls) => {
  const last = calls.map((call) => call.method).lastIndexOf('from');
  const table = String(calls[last]?.args[0]);
  if (table === 'projects') {
    return state.failProject
      ? { error: { message: 'lecture impossible' } }
      : { data: state.project };
  }
  if (table === 'project_academia_requests') {
    return state.failRequest
      ? { error: { message: 'lecture impossible' } }
      : { data: state.request };
  }
  if (table === 'subject_properties') {
    return {
      data: { address: '4 chemin des Restanques Hautes', postal_code: '06140', city: 'Vence' },
    };
  }
  return { data: null };
});

const read = () =>
  readNeighbourhoodLink(db.client as never, 'agence-1', 'p1', NOW) as Promise<unknown>;

beforeEach(() => {
  db.reset();
  reported.length = 0;
  state.project = {
    academia_living_here_url: LINK,
    academia_living_here_pasted_at: '2026-11-15T09:00:00Z',
    academia_living_here_property: PROPERTY,
  };
  state.request = {
    // Des pièges : rien de cela ne doit sortir.
    academia_id: 'dos_8f2c1a9e',
    address_sent: ADDRESS,
    property_address: ADDRESS,
    link_url: LINK,
    link_expires_at: '2026-12-16T10:00:00Z',
  };
  state.failRequest = false;
  state.failProject = false;
});

describe('readNeighbourhoodLink', () => {
  it('le lien créé par Academia : le lien client et sa date de validité, rien d’autre', async () => {
    expect(await read()).toEqual({ url: LINK, validUntil: '2026-12-16T10:00:00Z' });
  });

  it('expiré : rien', async () => {
    state.request = { ...state.request, link_expires_at: '2026-11-17T09:59:00Z' };
    expect(await read()).toBeNull();
  });

  it('l’adresse du bien a changé depuis la demande : rien', async () => {
    state.request = { ...state.request, property_address: '12 rue Ancienne, 06140 Vence' };
    expect(await read()).toBeNull();
  });

  it('collé à la main : le lien, sans date (elle n’est pas connue)', async () => {
    state.request = null;
    expect(await read()).toEqual({ url: LINK, validUntil: null });
  });

  // Mission 157 — collé à la main, il se comporte comme un lien créé en un clic (Jean-Guy, 17/11).
  it('collé depuis 30 jours ou plus : rien', async () => {
    state.request = null;
    state.project = { ...state.project, academia_living_here_pasted_at: '2026-10-18T09:00:00Z' };
    expect(await read()).toBeNull();
    state.project = { ...state.project, academia_living_here_pasted_at: '2026-10-19T09:00:00Z' };
    expect(await read()).toEqual({ url: LINK, validUntil: null });
  });

  it('collé, puis l’adresse du bien a changé : rien', async () => {
    state.request = null;
    state.project = {
      ...state.project,
      academia_living_here_property: { ...PROPERTY, address: '12 rue Ancienne' },
    };
    expect(await read()).toBeNull();
  });

  it('collé sans date connue : rien', async () => {
    state.request = null;
    state.project = { ...state.project, academia_living_here_pasted_at: null };
    expect(await read()).toBeNull();
  });

  it('un lien qui n’est pas un lien client (un dossier d’Academia, un autre site) : rien', async () => {
    for (const url of [
      'https://app.myacademia.ai/dossiers/dos_8f2c1a9e',
      'https://exemple.fr/l/abc',
      'http://app.myacademia.ai/l/abc',
    ]) {
      state.project = { ...state.project, academia_living_here_url: url };
      expect(await read()).toBeNull();
    }
  });

  it('sans lien sur le bien : rien, et la demande n’est pas lue', async () => {
    state.project = { ...state.project, academia_living_here_url: null };
    expect(await read()).toBeNull();
    expect(db.calls.some((call) => call.args[0] === 'project_academia_requests')).toBe(false);
  });

  it('une lecture en échec ne montre rien au vendeur et entre au journal', async () => {
    state.failRequest = true;
    expect(await read()).toBeNull();
    expect(reported).toEqual(['neighbourhood-link:read']);
    reported.length = 0;
    state.failRequest = false;
    state.failProject = true;
    expect(await read()).toBeNull();
    expect(reported).toEqual(['neighbourhood-link:read']);
  });

  it('une exception (le réseau) ne montre rien et entre au journal', async () => {
    const throwing = {
      from: () => {
        throw new Error('fetch failed');
      },
    };
    expect(await readNeighbourhoodLink(throwing as never, 'agence-1', 'p1', NOW)).toBeNull();
    expect(reported).toEqual(['neighbourhood-link:read']);
  });

  it('ne lit que les colonnes utiles, cadrées sur l’agence et le dossier', async () => {
    await read();
    const selects = db.calls.filter((call) => call.method === 'select').map((c) => c.args[0]);
    expect(selects.join(' ')).not.toMatch(/academia_id|address_sent|requested_by/);
    const eqs = db.calls.filter((call) => call.method === 'eq').map((c) => c.args.join('='));
    expect(eqs).toContain('agency_id=agence-1');
  });
});
