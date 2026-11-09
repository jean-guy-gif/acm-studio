import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase, type FakeResponse } from '@/test-fixtures/fake-supabase';

// Mission 147 (partie A) — le lien client « Vivre ici » d'Academia, collé sur le mandat : l'action
// appelée POUR DE VRAI avec un client factice (modèle de `sensitive-actions.test.ts`, M100). Un appel
// refusé n'écrit rien ; « Retirer » écrit `null`, jamais une chaîne vide.

const state = vi.hoisted(() => ({
  profile: null as Record<string, unknown> | null,
  project: null as Record<string, unknown> | null,
}));

const db = fakeSupabase((calls): FakeResponse => {
  const wrote = calls.some((call) => call.method === 'update');
  return wrote ? { data: [{ id: 'p1' }] } : { data: state.project };
});

vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => db.client }));

const AGENCY = '11111111-1111-4111-8111-111111111111';
const advisor = { id: 'u-advisor', agency_id: AGENCY, removed_at: null };
const LINK = 'https://app.myacademia.ai/l/v3k9-2mq7.8f2c1a9e4b7d';

const updates = () =>
  db.calls.filter((call) => call.method === 'update').map((call) => call.args[0]);

beforeEach(() => {
  db.reset();
  state.profile = advisor;
  state.project = { id: 'p1', status: 'meeting_completed' };
});

describe('setAcademiaLivingHereLink', () => {
  it('refusé sans session, à un membre retiré, sur un dossier archivé ou introuvable : rien n’est écrit', async () => {
    const { setAcademiaLivingHereLink } =
      await import('@/features/projects/actions/set-academia-link');
    state.profile = null;
    expect((await setAcademiaLivingHereLink('p1', LINK)).ok).toBe(false);
    state.profile = { ...advisor, removed_at: '2026-10-01T00:00:00Z' };
    expect((await setAcademiaLivingHereLink('p1', LINK)).ok).toBe(false);
    state.profile = advisor;
    state.project = { id: 'p1', status: 'archived' };
    expect((await setAcademiaLivingHereLink('p1', LINK)).ok).toBe(false);
    state.project = null;
    expect((await setAcademiaLivingHereLink('p1', LINK)).ok).toBe(false);
    expect((await setAcademiaLivingHereLink(42, LINK)).ok).toBe(false);
    expect(db.writes()).toEqual([]);
  });

  it('un autre site, un « ? », un « # » ou un « / » de plus : refusé avec le message, rien n’est écrit', async () => {
    const { setAcademiaLivingHereLink } =
      await import('@/features/projects/actions/set-academia-link');
    for (const bad of [
      'https://www.seloger.com/annonces/1.htm',
      `${LINK}?x=1`,
      `${LINK}#haut`,
      'https://app.myacademia.ai/l/v3k9/8f2c',
      'http://app.myacademia.ai/l/abc',
    ]) {
      expect(await setAcademiaLivingHereLink('p1', bad)).toEqual({
        ok: false,
        error:
          'Collez le lien « Vivre ici » donné par Academia : il commence par https://app.myacademia.ai/l/',
      });
    }
    expect(db.writes()).toEqual([]);
  });

  it('un lien d’Academia, dossier conclu compris : écrit tel quel, dans l’agence', async () => {
    const { setAcademiaLivingHereLink } =
      await import('@/features/projects/actions/set-academia-link');
    expect(await setAcademiaLivingHereLink('p1', `  ${LINK}  `)).toEqual({ ok: true, url: LINK });
    expect(updates()).toEqual([{ academia_living_here_url: LINK }]);
    expect(db.calls).toContainEqual({ method: 'eq', args: ['agency_id', AGENCY] });
  });

  it('« Retirer » écrit null, jamais une chaîne vide', async () => {
    const { setAcademiaLivingHereLink } =
      await import('@/features/projects/actions/set-academia-link');
    expect(await setAcademiaLivingHereLink('p1', null)).toEqual({ ok: true, url: null });
    expect(await setAcademiaLivingHereLink('p1', '   ')).toEqual({ ok: true, url: null });
    expect(updates()).toEqual([
      { academia_living_here_url: null },
      { academia_living_here_url: null },
    ]);
  });
});
