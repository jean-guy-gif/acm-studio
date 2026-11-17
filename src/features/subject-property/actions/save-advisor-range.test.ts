import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase, type FakeCall } from '@/test-fixtures/fake-supabase';

// Mission 158 — « Votre fourchette » depuis « Avant le rendez-vous » : seules ses deux bornes
// s'écrivent, saisies par le conseiller ; jamais la valeur indicative d'Academia (test 4 de la
// mission, validé par Jean-Guy le 17/11). Deux bornes ou aucune (M93).
const state = vi.hoisted(() => ({
  profile: { id: 'u1', agency_id: 'agence-1', removed_at: null } as Record<string, unknown> | null,
  project: { id: 'p1', status: 'ready_for_meeting' } as Record<string, unknown> | null,
  written: [{ id: 's1' }] as unknown[] | null,
}));
const lastTable = (calls: FakeCall[]) =>
  String([...calls].reverse().find((call) => call.method === 'from')?.args[0] ?? '');
const db = fakeSupabase((calls) =>
  lastTable(calls) === 'projects' ? { data: state.project } : { data: state.written },
);

vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => db.client }));
vi.mock('@/lib/app-errors/report-server-error', () => ({ reportServerError: async () => {} }));
const promoted = vi.hoisted(() => [] as string[]);
vi.mock('@/features/projects/services/project-readiness', () => ({
  maybePromoteToReady: async (_client: unknown, projectId: string) => {
    promoted.push(projectId);
    return false;
  },
}));
const { saveAdvisorRange } = await import('@/features/subject-property/actions/save-advisor-range');

const updates = () => db.calls.filter((call) => call.method === 'update').map((c) => c.args[0]);

beforeEach(() => {
  db.reset();
  state.profile = { id: 'u1', agency_id: 'agence-1', removed_at: null };
  state.project = { id: 'p1', status: 'ready_for_meeting' };
  state.written = [{ id: 's1' }];
});

describe('saveAdvisorRange', () => {
  it('la bascule en « Prêt » reste automatique (M52) : vérifiée après l’enregistrement', async () => {
    promoted.length = 0;
    await saveAdvisorRange('p1', 900000, 955000);
    expect(promoted).toEqual(['p1']);
    promoted.length = 0;
    await saveAdvisorRange('p1', 955000, '');
    expect(promoted).toEqual([]);
  });

  it('n’écrit que les deux bornes du conseiller, sur le bien de son agence', async () => {
    expect(await saveAdvisorRange('p1', '955 000', 1060000)).toEqual({
      ok: true,
      min: 955000,
      max: 1060000,
    });
    expect(updates()).toEqual([{ advisor_price_min: 955000, advisor_price_max: 1060000 }]);
    expect(db.writes()).toEqual(['update subject_properties']);
    const eqs = db.calls.filter((c) => c.method === 'eq').map((c) => c.args.join('='));
    expect(eqs).toContain('agency_id=agence-1');
  });

  it('vider les deux bornes retire la fourchette ; une borne seule est refusée (M93)', async () => {
    expect(await saveAdvisorRange('p1', '', '')).toEqual({ ok: true, min: null, max: null });
    db.reset();
    expect(await saveAdvisorRange('p1', 955000, '')).toEqual({
      ok: false,
      error: 'Indiquez les deux montants',
    });
    expect(db.writes()).toEqual([]);
  });

  it('refuse un bas au-dessus du haut, un montant illisible, un dossier archivé, un membre retiré', async () => {
    expect((await saveAdvisorRange('p1', 1060000, 955000)).ok).toBe(false);
    expect((await saveAdvisorRange('p1', 'beaucoup', 955000)).ok).toBe(false);
    expect((await saveAdvisorRange('p1', -1, 955000)).ok).toBe(false);
    state.project = { id: 'p1', status: 'archived' };
    expect((await saveAdvisorRange('p1', 900000, 955000)).ok).toBe(false);
    state.profile = { id: 'u1', agency_id: 'agence-1', removed_at: '2026-11-01' };
    expect((await saveAdvisorRange('p1', 900000, 955000)).ok).toBe(false);
    expect(db.writes()).toEqual([]);
  });

  it('aucun autre champ ne peut passer : la valeur d’Academia n’a pas de colonne', async () => {
    await saveAdvisorRange('p1', 900000, 955000);
    const keys = updates().flatMap((update) => Object.keys(update as object));
    expect(keys.sort()).toEqual(['advisor_price_max', 'advisor_price_min']);
  });
});
