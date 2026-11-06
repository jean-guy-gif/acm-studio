import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mission 137 — l'identité légale : le manager seul ; le serveur relit tout ; la garantie
// structurée recompose le texte de la charte ; un refus n'écrit rien.
const state = vi.hoisted(() => ({
  guard: { ok: true, profile: { id: 'u1', agency_id: 'agency-a' } } as unknown,
  writes: [] as [string, string, unknown][],
}));

vi.mock('@/features/team/services/require-manager', () => ({
  requireManagerProfile: async () => state.guard,
}));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: () => ({
    from(table: string) {
      const chain: Record<string, unknown> = {};
      chain.eq = () => chain;
      chain.upsert = (values: unknown) => {
        state.writes.push([table, 'upsert', values]);
        return Promise.resolve({ error: null });
      };
      chain.update = (values: unknown) => {
        state.writes.push([table, 'update', values]);
        return chain;
      };
      chain.then = (resolve: (value: unknown) => unknown) => resolve({ error: null });
      return chain;
    },
  }),
}));

const { saveLegalIdentity } = await import('@/features/legal-identity/actions/save-legal-identity');

beforeEach(() => {
  state.guard = { ok: true, profile: { id: 'u1', agency_id: 'agency-a' } };
  state.writes = [];
});

describe('enregistrer l’identité légale', () => {
  it('le manager l’enregistre ; la garantie recompose le texte de la charte', async () => {
    expect(
      await saveLegalIdentity({
        companyName: 'Société Exemple',
        guaranteeBody: 'Garant Exemple',
        guaranteeNumber: 'GF-1',
        guaranteeAmount: '120 000',
        agencyEmail: 'agence@example.com',
      }),
    ).toEqual({ ok: true });
    const [table, , row] = state.writes[0]!;
    expect(table).toBe('agency_legal_identities');
    expect(row).toMatchObject({
      agency_id: 'agency-a',
      company_name: 'Société Exemple',
      guarantee_amount: 120000,
      updated_by: 'u1',
      vat_number: null,
    });
    const [brandingTable, method, branding] = state.writes[1]!;
    expect([brandingTable, method]).toEqual(['agency_branding', 'update']);
    expect((branding as { financial_guarantee: string }).financial_guarantee).toMatch(
      /^Garantie financière : Garant Exemple, n° GF-1, 120/,
    );
  });

  it('un conseiller, un e-mail faux, un montant illisible, un champ trop long : refusé, rien d’écrit', async () => {
    state.guard = { ok: false, error: 'Réservé au manager de l’agence.' };
    expect((await saveLegalIdentity({ companyName: 'X' })).ok).toBe(false);
    state.guard = { ok: true, profile: { id: 'u1', agency_id: 'agency-a' } };
    expect((await saveLegalIdentity({ agencyEmail: 'pas un e-mail' })).ok).toBe(false);
    expect((await saveLegalIdentity({ guaranteeAmount: 'beaucoup' })).ok).toBe(false);
    expect((await saveLegalIdentity({ companyName: 'x'.repeat(161) })).ok).toBe(false);
    expect(state.writes).toEqual([]);
  });
});
