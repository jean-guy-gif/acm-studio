import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase } from '@/test-fixtures/fake-supabase';

// Mission 159 — l'enregistrement de la fiche du bien vendeur pose la date de sa dernière
// modification : elle dit si le bien a changé avant ou après le début du Live, pour savoir si le
// quartier montré au vendeur était encore le bon (`read-neighbourhood-snapshot`).
const db = fakeSupabase((calls) => {
  const last = calls.map((call) => call.method).lastIndexOf('from');
  const table = String(calls[last]?.args[0] ?? '');
  if (table === 'projects') return { data: { id: 'p1', status: 'draft' } };
  if (table === 'subject_properties') return { data: { id: 's1' } };
  return { data: null };
});
vi.mock('@/lib/auth/get-profile', () => ({
  getProfile: async () => ({ id: 'u1', agency_id: 'a1', removed_at: null }),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => db.client }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/features/projects/services/project-readiness', () => ({
  maybePromoteToReady: async () => false,
}));

const { saveSubjectPropertySheet } =
  await import('@/features/subject-property/actions/save-subject-property-sheet');

beforeEach(() => db.reset());

describe('l’enregistrement de la fiche du bien vendeur', () => {
  it('pose la date de la dernière modification du bien', async () => {
    const form = new FormData();
    form.set('address', '4 chemin des Restanques Hautes');
    form.set('city', 'Vence');
    form.set('postal_code', '06140');
    form.set('property_type', 'Maison');
    form.set('rooms_count', '5');
    form.set('surface_area', '135');
    const before = Date.now();
    const result = await saveSubjectPropertySheet('p1', form);
    expect(result.ok).toBe(true);
    const upsert = db.calls.find((call) => call.method === 'upsert');
    const row = upsert?.args[0] as { updated_at?: string; address?: string };
    expect(row.address).toBe('4 chemin des Restanques Hautes');
    expect(Date.parse(row.updated_at ?? '')).toBeGreaterThanOrEqual(before);
  });
});
