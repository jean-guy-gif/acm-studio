import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase } from '@/test-fixtures/fake-supabase';

// Mission 130 — ajouter le téléphone ou l'e-mail du vendeur depuis la relance : relus au serveur,
// seuls les champs vides du dossier s'écrivent, dans l'agence de l'appelant, sur un dossier du Suivi.
type Project = {
  status: string;
  seller_phone: string | null;
  seller_email: string | null;
} | null;
const state: {
  profile: { agency_id: string; removed_at: string | null } | null;
  project: Project;
} = {
  profile: { agency_id: 'agence-1', removed_at: null },
  project: { status: 'meeting_completed', seller_phone: null, seller_email: null },
};
const server = fakeSupabase(() => ({}));
vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('@/features/projects/queries/get-project', () => ({
  getProject: async () => state.project,
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => server.client }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));

const { saveSellerContact } =
  await import('@/features/meeting-conclusion/actions/save-seller-contact');

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

describe('ajouter les coordonnées du vendeur depuis la relance', () => {
  beforeEach(() => {
    server.reset();
    state.profile = { agency_id: 'agence-1', removed_at: null };
    state.project = { status: 'meeting_completed', seller_phone: null, seller_email: null };
  });

  it('écrit le téléphone et l’e-mail manquants, cadré sur l’agence', async () => {
    const result = await saveSellerContact(
      'dossier-1',
      form({ seller_phone: '06 12 34 56 78', seller_email: 'martin@exemple.fr' }),
    );
    expect(result).toEqual({ ok: true, phone: '06 12 34 56 78', email: 'martin@exemple.fr' });
    expect(server.writes()).toEqual(['update projects']);
    const update = server.calls.find((call) => call.method === 'update');
    expect(update?.args[0]).toEqual({
      seller_phone: '06 12 34 56 78',
      seller_email: 'martin@exemple.fr',
    });
    const eqs = server.calls.filter((call) => call.method === 'eq').map((call) => call.args);
    expect(eqs).toEqual([
      ['id', 'dossier-1'],
      ['agency_id', 'agence-1'],
    ]);
  });

  it('ne remplace jamais une coordonnée déjà connue', async () => {
    state.project = {
      status: 'meeting_completed',
      seller_phone: '06 00 00 00 01',
      seller_email: null,
    };
    await saveSellerContact(
      'dossier-1',
      form({ seller_phone: '07 11 11 11 11', seller_email: 'a@b.fr' }),
    );
    const update = server.calls.find((call) => call.method === 'update');
    expect(update?.args[0]).toEqual({ seller_email: 'a@b.fr' });
  });

  it('refuse sans rien écrire : rien saisi, téléphone ou e-mail invalides, dossier hors Suivi, membre retiré', async () => {
    const refused = [
      await saveSellerContact('dossier-1', form({})),
      await saveSellerContact('dossier-1', form({ seller_phone: 'appelez-moi' })),
      await saveSellerContact('dossier-1', form({ seller_phone: '0612' })),
      await saveSellerContact('dossier-1', form({ seller_email: 'pas-un-mail' })),
    ];
    state.project = { status: 'draft', seller_phone: null, seller_email: null };
    refused.push(await saveSellerContact('dossier-1', form({ seller_phone: '06 12 34 56 78' })));
    state.project = null;
    refused.push(await saveSellerContact('dossier-1', form({ seller_phone: '06 12 34 56 78' })));
    state.project = { status: 'meeting_completed', seller_phone: null, seller_email: null };
    state.profile = { agency_id: 'agence-1', removed_at: '2026-10-01T00:00:00Z' };
    refused.push(await saveSellerContact('dossier-1', form({ seller_phone: '06 12 34 56 78' })));
    for (const result of refused) expect(result.ok).toBe(false);
    expect(server.writes()).toEqual([]);
  });
});
