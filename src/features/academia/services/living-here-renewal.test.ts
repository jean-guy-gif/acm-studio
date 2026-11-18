import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  LINK_RENEW_AFTER_DAYS,
  linkNeedsRenewal,
} from '@/features/academia/services/living-here-age';
import { FAKE_ACADEMIA_ID, FAKE_LINK, fakeAcademia } from '@/test-fixtures/fake-academia';
import { fakeSupabase } from '@/test-fixtures/fake-supabase';

// Mission 161 — le lien « Vivre ici » (décision de Jean-Guy, 18/11) : un seul lien par bien, réutilisé
// partout tant qu'il a moins de 7 jours ; au-delà, un lien neuf, créé seulement par un écran du
// conseiller ; une création en échec reprend le lien encore valable, sans rien bloquer, notée au
// journal. Réponses simulées, aucune API réelle.
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/lib/app-errors/report-server-error', () => ({
  reportServerError: vi.fn(async () => {}),
}));
const { renewLivingHereLinkIfOld } =
  await import('@/features/academia/services/living-here-renewal');
const { reportServerError } = await import('@/lib/app-errors/report-server-error');

const NOW = new Date('2026-11-18T10:00:00Z');
const DAY = 86_400_000;
const ADDRESS = '4 chemin des Restanques Hautes, 06140 Vence';
const OLD_LINK = 'https://app.myacademia.ai/l/ancien0123';
// Un lien de 30 jours créé il y a `age` jours.
const expiresFor = (age: number) => new Date(NOW.getTime() + (30 - age) * DAY).toISOString();

type Row = Record<string, unknown> | null;
const state = vi.hoisted(() => ({
  request: null as Row,
  project: null as Row,
  subject: null as Row,
}));
const db = fakeSupabase((calls) => {
  const last = calls.map((call) => call.method).lastIndexOf('from');
  const table = String(calls[last]?.args[0] ?? '');
  if (calls.slice(last).some((call) => call.method === 'update')) return { data: [{ id: 'x' }] };
  if (table === 'project_academia_requests') return { data: state.request };
  if (table === 'projects') return { data: state.project };
  if (table === 'subject_properties') return { data: state.subject };
  return { data: null };
});
const updates = (table: string) => {
  let current = '';
  const out: unknown[] = [];
  for (const call of db.calls) {
    if (call.method === 'from') current = String(call.args[0]);
    if (current === table && call.method === 'update') out.push(call.args[0]);
  }
  return out;
};
const renew = (server = fakeAcademia()) =>
  renewLivingHereLinkIfOld({
    admin: db.client as never,
    agencyId: 'a1',
    projectId: 'p1',
    access: { key: 'msk_test', demoAddress: null },
    now: NOW,
    fetchImpl: server.fetch,
  });

beforeEach(() => {
  db.reset();
  vi.mocked(reportServerError).mockClear();
  state.subject = {
    address: '4 chemin des Restanques Hautes',
    postal_code: '06140',
    city: 'Vence',
  };
  state.project = { academia_living_here_url: OLD_LINK };
  state.request = {
    academia_id: FAKE_ACADEMIA_ID,
    state: 'pret',
    property_address: ADDRESS,
    link_url: OLD_LINK,
    link_expires_at: expiresFor(8),
  };
});

describe('linkNeedsRenewal', () => {
  it('moins de 7 jours : réutilisé ; 7 jours ou plus, ou expiré : un lien neuf', () => {
    expect(LINK_RENEW_AFTER_DAYS).toBe(7);
    expect(linkNeedsRenewal(expiresFor(0), NOW)).toBe(false);
    expect(linkNeedsRenewal(expiresFor(6.9), NOW)).toBe(false);
    expect(linkNeedsRenewal(expiresFor(7), NOW)).toBe(true);
    expect(linkNeedsRenewal(expiresFor(31), NOW)).toBe(true);
    expect(linkNeedsRenewal(null, NOW)).toBe(true);
  });
});

describe('renewLivingHereLinkIfOld (un écran du conseiller)', () => {
  it('un lien de moins de 7 jours : rien ne part', async () => {
    state.request = { ...state.request!, link_expires_at: expiresFor(3) };
    const server = fakeAcademia();
    expect(await renew(server)).toBe('fresh');
    expect(server.calls).toEqual([]);
  });

  it('un lien de 8 jours : un lien neuf, rangé sur la demande et sur le mandat', async () => {
    const server = fakeAcademia();
    expect(await renew(server)).toBe('renewed');
    expect(server.calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      `POST /api/v1/dossiers/${FAKE_ACADEMIA_ID}/liens-client`,
    ]);
    expect(updates('project_academia_requests')).toEqual([
      { link_url: FAKE_LINK, link_expires_at: '2026-12-16T00:00:00.000Z' },
    ]);
    expect(updates('projects')).toEqual([{ academia_living_here_url: FAKE_LINK }]);
  });

  it('la création échoue : le lien encore valable est gardé, rien n’est bloqué, c’est noté au journal', async () => {
    for (const reply of [
      { status: 503 },
      { status: 429, headers: { 'retry-after': '60' } },
      { status: 404 },
    ]) {
      db.reset();
      vi.mocked(reportServerError).mockClear();
      const server = fakeAcademia({ createLink: [reply as never, reply as never] });
      expect(await renew(server)).toBe('kept');
      expect(updates('projects')).toEqual([]);
      expect(reportServerError).toHaveBeenCalled();
    }
  });

  it('rien à renouveler : pas de dossier prêt, un lien collé à la main, ou l’adresse du bien changée', async () => {
    const server = fakeAcademia();
    state.request = null;
    expect(await renew(server)).toBe('none');
    state.request = {
      academia_id: FAKE_ACADEMIA_ID,
      state: 'en_cours',
      property_address: ADDRESS,
      link_url: null,
      link_expires_at: null,
    };
    expect(await renew(server)).toBe('none');
    state.request = {
      ...state.request,
      state: 'pret',
      link_url: OLD_LINK,
      link_expires_at: expiresFor(8),
    };
    state.project = { academia_living_here_url: 'https://app.myacademia.ai/l/colle0123' };
    expect(await renew(server)).toBe('none');
    state.project = { academia_living_here_url: OLD_LINK };
    state.subject = { address: '6 autre rue', postal_code: '06140', city: 'Vence' };
    expect(await renew(server)).toBe('none');
    expect(server.calls).toEqual([]);
  });
});
