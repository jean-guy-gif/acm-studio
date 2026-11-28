import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase, type FakeCall } from '@/test-fixtures/fake-supabase';

// Mission 117 — les actions de la fiche : un garde (profil non retiré), une relecture (zod), puis
// l'écriture par la clé service dans la seule agence de l'appelant ; un appel refusé n'écrit rien.
const profile = vi.hoisted(() => ({
  current: null as null | { id: string; agency_id: string; removed_at: string | null },
}));
const service = vi.hoisted(() => ({ client: null as unknown }));

vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => profile.current }));
vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: () => service.client,
}));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));

const {
  archiveBuyer,
  markBuyerContacted,
  moveBuyerStatus,
  saveBuyer,
  saveQuickBuyer,
  setBuyerFinancing,
  setBuyerFinancingMode,
} = await import('@/features/buyers/actions/buyers');

const row = {
  id: 'b1',
  agency_id: 'agency-a',
  advisor_id: 'advisor-1',
  created_at: '2026-10-24T08:00:00Z',
  updated_at: '2026-10-24T08:00:00Z',
  archived_at: null,
  name: 'M. Durand',
  phone: null,
  email: null,
  purpose: null,
  timeline: null,
  notes: null,
  property_types: ['apartment'],
  cities: ['Antibes'],
  budget_ideal: null,
  budget_max: 430000,
  rooms_min: 3,
  bedrooms_min: null,
  surface_min: null,
  outdoor: null,
  parking: null,
  pool: null,
  floor_min: null,
  elevator: null,
  energy_rating_max: null,
  works_accepted: null,
  must_have: [],
  deal_breakers: null,
  status: 'searching',
  status_changed_at: '2026-10-24T08:00:00Z',
  demo: false,
  financing: 'unknown',
  financing_changed_at: null,
  contacted_at: null,
};

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

const lastTable = (calls: FakeCall[]) =>
  [...calls].reverse().find((call) => call.method === 'from')?.args[0];

describe('les actions de la fiche acquéreur', () => {
  beforeEach(() => {
    profile.current = { id: 'advisor-1', agency_id: 'agency-a', removed_at: null };
  });

  it('sans profil, ou retiré : rien n’est écrit', async () => {
    const fake = fakeSupabase();
    service.client = fake.client;
    profile.current = null;
    expect(await saveBuyer(null, form({ name: 'X', cities: 'Nice' }))).toEqual({
      ok: false,
      error: 'Vous devez être connecté.',
    });
    profile.current = { id: 'advisor-1', agency_id: 'agency-a', removed_at: '2026-10-01' };
    expect((await moveBuyerStatus('b1', 'forward')).ok).toBe(false);
    expect((await archiveBuyer('b1')).ok).toBe(false);
    expect(fake.writes()).toEqual([]);
  });

  it('une fiche invalide n’écrit rien et nomme le champ', async () => {
    const fake = fakeSupabase();
    service.client = fake.client;
    const result = await saveBuyer(null, form({ name: 'M. Durand', cities: '' }));
    expect(result).toMatchObject({
      ok: false,
      errors: { cities: 'Indiquez au moins une commune.' },
    });
    expect(fake.writes()).toEqual([]);
  });

  it('une fiche neuve s’insère dans l’agence de l’appelant, à son nom', async () => {
    const fake = fakeSupabase(() => ({ data: { id: 'new-id' } }));
    service.client = fake.client;
    const result = await saveBuyer(
      null,
      form({ name: 'M. Durand', cities: 'Antibes', budget_max: '430 000' }),
    );
    expect(result).toEqual({ ok: true, buyerId: 'new-id' });
    expect(fake.writes()).toEqual(['insert buyers']);
    const insert = fake.calls.find((call) => call.method === 'insert');
    expect(insert?.args[0]).toMatchObject({
      agency_id: 'agency-a',
      advisor_id: 'advisor-1',
      name: 'M. Durand',
      cities: ['Antibes'],
      budget_max: 430000,
    });
    expect(insert?.args[0]).not.toHaveProperty('demo');
    expect(insert?.args[0]).not.toHaveProperty('status');
  });

  it('modifier : la fiche est relue dans l’agence ; introuvable, rien n’est écrit', async () => {
    const fake = fakeSupabase(() => ({ data: null }));
    service.client = fake.client;
    const result = await saveBuyer('b1', form({ name: 'M. Durand', cities: 'Antibes' }));
    expect(result).toEqual({ ok: false, error: 'Cette fiche acquéreur n’existe plus.' });
    expect(fake.writes()).toEqual([]);
    // La relecture filtre sur l'agence et exclut les archivées.
    expect(
      fake.calls.some(
        (call) =>
          call.method === 'eq' && call.args[0] === 'agency_id' && call.args[1] === 'agency-a',
      ),
    ).toBe(true);
    expect(fake.calls.some((call) => call.method === 'is' && call.args[0] === 'archived_at')).toBe(
      true,
    );
  });

  it('le statut avance d’un cran, daté ; deux crans sont refusés sans écriture', async () => {
    const fake = fakeSupabase((calls) =>
      calls.some((call) => call.method === 'update')
        ? { data: { ...row, status: 'visiting', status_changed_at: '2026-10-24T09:00:00Z' } }
        : { data: row },
    );
    service.client = fake.client;
    const moved = await moveBuyerStatus('b1', 'forward');
    expect(moved.ok && moved.buyer.status).toBe('visiting');
    expect(fake.writes()).toEqual(['update buyers']);
    const update = fake.calls.find((call) => call.method === 'update');
    expect(update?.args[0]).toMatchObject({ status: 'visiting' });
    expect((update?.args[0] as { status_changed_at: string }).status_changed_at).toMatch(/^\d{4}-/);

    fake.reset();
    expect(await moveBuyerStatus('b1', 'back')).toEqual({
      ok: false,
      error: 'Ce changement n’est pas permis depuis ce statut.',
    });
    expect(await moveBuyerStatus('b1', 'bought')).toEqual({
      ok: false,
      error: 'Ce changement n’est pas permis.',
    });
    expect(fake.writes()).toEqual([]);
  });

  it('archiver pose archived_at dans l’agence : une suppression douce, jamais un delete', async () => {
    const fake = fakeSupabase(() => ({ data: row }));
    service.client = fake.client;
    expect(await archiveBuyer('b1')).toEqual({ ok: true });
    expect(fake.writes()).toEqual(['update buyers']);
    expect(lastTable(fake.calls)).toBe('buyers');
    const update = fake.calls.find((call) => call.method === 'update');
    expect(Object.keys(update?.args[0] as object)).toEqual(['archived_at', 'updated_at']);
  });
});

// Mission 132 — la saisie rapide, le financement et « J'ai eu l'acquéreur aujourd'hui » : même garde,
// même agence, un appel refusé n'écrit rien ; le formulaire de la fiche n'écrit jamais le financement.
describe('la fiche en 30 secondes, et « prêt à visiter »', () => {
  beforeEach(() => {
    profile.current = { id: 'advisor-1', agency_id: 'agency-a', removed_at: null };
  });

  it('sans profil, ou retiré : aucune des trois n’écrit', async () => {
    const fake = fakeSupabase(() => ({ data: row }));
    service.client = fake.client;
    profile.current = { id: 'advisor-1', agency_id: 'agency-a', removed_at: '2026-10-01' };
    expect((await saveQuickBuyer(form({ name: 'X', cities: 'Vence' }))).ok).toBe(false);
    expect((await setBuyerFinancing('b1', 'validated')).ok).toBe(false);
    expect((await markBuyerContacted('b1')).ok).toBe(false);
    expect(fake.writes()).toEqual([]);
  });

  it('la saisie rapide insère dans l’agence, à son nom ; trois ★ sont refusées sans écriture', async () => {
    const fake = fakeSupabase(() => ({ data: { id: 'new-id' } }));
    service.client = fake.client;
    const data = form({ name: 'Famille Test', cities: 'Vence', budget_max: '750000' });
    data.append('must_have', 'pool');
    expect(await saveQuickBuyer(data)).toEqual({ ok: true, buyerId: 'new-id' });
    const insert = fake.calls.find((call) => call.method === 'insert')?.args[0];
    expect(insert).toMatchObject({ agency_id: 'agency-a', advisor_id: 'advisor-1', pool: true });
    expect(insert).not.toHaveProperty('financing');

    fake.reset();
    const tooMany = form({ name: 'Famille Test', cities: 'Vence', budget_max: '750000' });
    for (const star of ['pool', 'parking', 'outdoor']) tooMany.append('must_have', star);
    expect((await saveQuickBuyer(tooMany)).ok).toBe(false);
    expect(fake.writes()).toEqual([]);
  });

  it('le financement : hors liste refusé ; daté ; une fiche d’une autre agence est introuvable', async () => {
    const fake = fakeSupabase((calls) =>
      calls.some((call) => call.method === 'update')
        ? { data: { ...row, financing: 'validated', financing_changed_at: '2026-11-05T10:00:00Z' } }
        : { data: row },
    );
    service.client = fake.client;
    expect(await setBuyerFinancing('b1', 'peut-être')).toEqual({
      ok: false,
      error: 'Ce financement n’existe pas.',
    });
    expect(fake.writes()).toEqual([]);
    const done = await setBuyerFinancing('b1', 'validated');
    expect(done.ok && done.buyer.financing).toBe('validated');
    const update = fake.calls.find((call) => call.method === 'update')?.args[0];
    expect(Object.keys(update as object).sort()).toEqual([
      // Mission 151 — le financement posé n'est plus « À vérifier ».
      'fields_to_verify',
      'financing',
      'financing_changed_at',
      'updated_at',
    ]);

    const elsewhere = fakeSupabase(() => ({ data: null }));
    service.client = elsewhere.client;
    expect(await setBuyerFinancing('b1', 'validated')).toEqual({
      ok: false,
      error: 'Cette fiche acquéreur n’existe plus.',
    });
    expect(await markBuyerContacted('b1')).toEqual({
      ok: false,
      error: 'Cette fiche acquéreur n’existe plus.',
    });
    expect(elsewhere.writes()).toEqual([]);
  });

  it('« J’ai eu l’acquéreur aujourd’hui » : le seul contact, à l’heure du serveur', async () => {
    const fake = fakeSupabase(() => ({ data: { ...row, contacted_at: '2026-11-05T10:00:00Z' } }));
    service.client = fake.client;
    expect((await markBuyerContacted('b1')).ok).toBe(true);
    const update = fake.calls.find((call) => call.method === 'update')?.args[0];
    expect(Object.keys(update as object).sort()).toEqual(['contacted_at', 'updated_at']);
  });

  it('le formulaire de la fiche n’écrit jamais le financement ni le contact', async () => {
    const fake = fakeSupabase(() => ({ data: row }));
    service.client = fake.client;
    const data = form({
      name: 'M. Durand',
      cities: 'Antibes',
      financing: 'validated',
      financing_mode: 'loan',
      loan_amount: '540000',
    });
    await saveBuyer('b1', data);
    const update = fake.calls.find((call) => call.method === 'update')?.args[0];
    expect(update).not.toHaveProperty('financing');
    expect(update).not.toHaveProperty('contacted_at');
    // Lot B — ni le mode de financement ni le prêt : ils ont leur geste à part.
    expect(update).not.toHaveProperty('financing_mode');
    expect(update).not.toHaveProperty('loan_amount');
  });
});

// Lot B (Jean-Guy, 27/11) — « Comment finance-t-il ? » : un geste à part, comme l'état du
// financement (M132), qui n'y est pas touché ; ce n'est pas un échange (M135). Relu au serveur,
// écrit dans la seule agence de l'appelant ; hors prêt, les détails du prêt sont effacés.
describe('le mode de financement', () => {
  beforeEach(() => {
    profile.current = { id: 'advisor-1', agency_id: 'agency-a', removed_at: null };
  });

  const loan = { mode: 'loan', contribution: 120_000, amount: 650_000, agreement: false };

  it('sans profil, ou retiré : rien n’est écrit', async () => {
    const fake = fakeSupabase(() => ({ data: row }));
    service.client = fake.client;
    profile.current = null;
    expect((await setBuyerFinancingMode('b1', loan)).ok).toBe(false);
    profile.current = { id: 'advisor-1', agency_id: 'agency-a', removed_at: '2026-10-01' };
    expect((await setBuyerFinancingMode('b1', loan)).ok).toBe(false);
    expect(fake.writes()).toEqual([]);
  });

  it('ce qui n’est pas valable est refusé, sans rien écrire ; une autre agence ne trouve pas la fiche', async () => {
    const fake = fakeSupabase(() => ({ data: row }));
    service.client = fake.client;
    expect(await setBuyerFinancingMode('b1', { mode: 'credit' })).toEqual({
      ok: false,
      error: 'Ce mode de financement n’existe pas.',
    });
    expect(await setBuyerFinancingMode('b1', { mode: 'loan', amount: 0 })).toEqual({
      ok: false,
      error: 'Le montant du prêt n’est pas un montant valable.',
    });
    expect(fake.writes()).toEqual([]);

    const elsewhere = fakeSupabase(() => ({ data: null }));
    service.client = elsewhere.client;
    expect(await setBuyerFinancingMode('b1', loan)).toEqual({
      ok: false,
      error: 'Cette fiche acquéreur n’existe plus.',
    });
    expect(elsewhere.writes()).toEqual([]);
  });

  it('avec un prêt : le mode et ses détails, dans l’agence ; il n’est plus « À vérifier »', async () => {
    const saved = {
      ...row,
      financing_mode: 'loan',
      loan_contribution: 120_000,
      loan_amount: 650_000,
      loan_agreement: false,
    };
    const fake = fakeSupabase((calls) =>
      calls.some((call) => call.method === 'update')
        ? { data: saved }
        : { data: { ...row, fields_to_verify: ['financing_mode', 'cities'] } },
    );
    service.client = fake.client;
    const done = await setBuyerFinancingMode('b1', loan);
    expect(done.ok && done.buyer.financingMode).toBe('loan');
    expect(done.ok && done.buyer.loanAmount).toBe(650_000);
    const update = fake.calls.find((call) => call.method === 'update')?.args[0] as Record<
      string,
      unknown
    >;
    // Ni l'état du financement, ni sa date, ni le contact : le mode a son geste à part.
    expect(Object.keys(update).sort()).toEqual([
      'fields_to_verify',
      'financing_mode',
      'loan_agreement',
      'loan_amount',
      'loan_contribution',
      'updated_at',
    ]);
    expect(update).toMatchObject({
      financing_mode: 'loan',
      loan_contribution: 120_000,
      loan_amount: 650_000,
      loan_agreement: false,
      fields_to_verify: ['cities'],
    });
    expect(lastTable(fake.calls)).toBe('buyers');
    expect(
      fake.calls.some(
        (call) =>
          call.method === 'eq' && call.args[0] === 'agency_id' && call.args[1] === 'agency-a',
      ),
    ).toBe(true);
  });

  it('comptant ou pas encore dit : l’apport, le prêt et l’accord sont effacés dans la même écriture', async () => {
    const fake = fakeSupabase(() => ({ data: row }));
    service.client = fake.client;
    for (const mode of ['cash', 'not_said']) {
      fake.reset();
      await setBuyerFinancingMode('b1', { ...loan, mode });
      const update = fake.calls.find((call) => call.method === 'update')?.args[0];
      expect(update).toMatchObject({
        financing_mode: mode,
        loan_contribution: null,
        loan_amount: null,
        loan_agreement: null,
      });
    }
  });
});
