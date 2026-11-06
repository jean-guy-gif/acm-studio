import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { VoucherContext } from '@/features/visit-voucher/queries/get-voucher-context';

// Mission 137 — « Signer le bon de visite » : tout est relu au serveur ; une identité incomplète, une
// visite qui n'a pas droit au bon, une signature qui n'est pas un PNG ou une par visiteur manquante
// n'écrivent rien ; sinon le texte figé, la signature dans le stockage privé, le document, ses
// visites et le lien du visiteur.
const state = vi.hoisted(() => ({
  profile: { id: 'u1', agency_id: 'agency-a', removed_at: null as string | null },
  context: null as unknown,
  writes: [] as [string, unknown][],
  uploads: [] as string[],
  removed: [] as string[],
}));

vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/lib/app-errors/report-server-error', () => ({ reportServerError: async () => {} }));
vi.mock('@/features/visit-voucher/queries/get-voucher-context', () => ({
  getVoucherContext: async () => ({ ok: true, context: state.context }),
}));
vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: () => ({
    from(table: string) {
      const chain: Record<string, unknown> = {};
      for (const method of ['select', 'eq', 'in']) chain[method] = () => chain;
      chain.insert = (values: unknown) => {
        state.writes.push([table, values]);
        return Promise.resolve({ error: null });
      };
      chain.then = (resolve: (value: unknown) => unknown) =>
        resolve({
          data:
            table === 'buyer_visit_requests'
              ? [{ id: VISIT, buyer_selection_items: { source: 'project', reference: 'p1' } }]
              : [],
          error: null,
        });
      return chain;
    },
    storage: {
      from: () => ({
        upload: async (path: string) => {
          state.uploads.push(path);
          return { error: null };
        },
        remove: async (paths: string[]) => {
          state.removed.push(...paths);
          return { error: null };
        },
      }),
    },
  }),
}));

const { signVisitVoucher } = await import('@/features/visit-voucher/actions/sign-voucher');

const BUYER = '11111111-1111-4111-8111-111111111111';
const VISIT = '22222222-2222-4222-8222-222222222222';
const OTHER = '33333333-3333-4333-8333-333333333333';
const PNG = `data:image/png;base64,${Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(100),
]).toString('base64')}`;

const agency = Object.fromEntries(
  [
    'name',
    'address',
    'phone',
    'email',
    'companyName',
    'companyForm',
    'shareCapital',
    'companySeat',
    'rcsCity',
    'rcsNumber',
    'cardNumber',
    'cardIssuer',
    'vatNumber',
    'rcpInsurer',
    'rcpAddress',
    'rcpNumber',
    'guaranteeBody',
    'guaranteeAddress',
    'guaranteeNumber',
    'representativeName',
    'representativeTitle',
  ].map((key) => [key, `{${key}}`]),
);

const context = (over: Partial<VoucherContext> = {}): VoucherContext => ({
  buyer: { id: BUYER, name: 'Famille Test', email: 'test@example.com' },
  visits: [
    {
      visitId: VISIT,
      label: 'Maison · 7 pièces · Mougins',
      eligible: true,
      note: 'Mandat signé',
      price: 1639500,
      address: '12 allée du Décor, 06250 Mougins',
      mandate: null,
      visited: true,
    },
    {
      visitId: OTHER,
      label: 'Maison · Valbonne',
      eligible: false,
      note: 'Bon de visite : seulement pour un bien de l’agence (mandat signé ou rentré) ou en collaboration obtenue.',
      price: 1_500_000,
      address: null,
      mandate: null,
      visited: false,
    },
  ],
  agency: agency as VoucherContext['agency'],
  gaps: [],
  advisorName: 'Carl Conseiller',
  city: 'Mougins',
  lastVisitor: null,
  ...over,
});

const input = (over: Record<string, unknown> = {}) => ({
  buyerId: BUYER,
  visitors: [{ civility: 'M.', name: 'Paul Test' }],
  visitorAddress: '5 chemin des Figurants, 69006 Lyon',
  piece: 'cni',
  city: 'Mougins',
  biens: [
    { visitId: VISIT, mandate: 'M-1', price: 1639500, address: '12 allée du Décor, 06250 Mougins' },
  ],
  signatures: [PNG],
  approved: true,
  ...over,
});

beforeEach(() => {
  state.profile = { id: 'u1', agency_id: 'agency-a', removed_at: null };
  state.context = context();
  state.writes = [];
  state.uploads = [];
  state.removed = [];
});

describe('signer le bon de visite', () => {
  it('écrit le texte figé, la signature, le document, sa visite et le lien du visiteur', async () => {
    const result = await signVisitVoucher(input());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.linkPath).toMatch(/^\/bon-de-visite\/[A-Za-z0-9_-]{43}$/);
    expect(state.uploads).toEqual([`agency-a/${result.documentId}/signature-1.png`]);
    expect(state.writes.map(([table]) => table)).toEqual([
      'buyer_documents',
      'buyer_document_visits',
      'buyer_document_links',
    ]);
    const document = state.writes[0]![1] as { rendered_text: string; fields: { piece: string } };
    expect(document.rendered_text).toContain('Je soussigné(e) M. Paul Test , demeurant');
    expect(document.rendered_text).toContain('Numéro du mandat : M-1');
    // Le type de la pièce seul, jamais un numéro.
    expect(document.fields.piece).toBe('cni');
    expect(JSON.stringify(document.fields)).not.toMatch(/numéro de pièce|\bn° CNI/i);
  });

  it('identité légale incomplète : rien n’est écrit, l’écran dit ce qui manque', async () => {
    state.context = context({ agency: null, gaps: ['N° de TVA'] });
    const result = await signVisitVoucher(input());
    expect(result).toEqual({
      ok: false,
      error: 'Identité légale de l’agence à compléter (Administration → Identité) : N° de TVA.',
    });
    expect(state.writes).toEqual([]);
    expect(state.uploads).toEqual([]);
  });

  it('une visite sans droit au bon, sans « Lu et approuvé », sans signature valable : rien', async () => {
    expect(
      (
        await signVisitVoucher(
          input({ biens: [{ visitId: OTHER, mandate: 'M', price: 1, address: 'adresse' }] }),
        )
      ).ok,
    ).toBe(false);
    expect((await signVisitVoucher(input({ approved: false }))).ok).toBe(false);
    expect((await signVisitVoucher(input({ signatures: ['data:image/png;base64,AAAA'] }))).ok).toBe(
      false,
    );
    // Deux visiteurs, une seule signature.
    expect(
      (
        await signVisitVoucher(
          input({
            visitors: [
              { civility: 'M.', name: 'Paul Test' },
              { civility: 'Mme', name: 'Anna Test' },
            ],
          }),
        )
      ).ok,
    ).toBe(false);
    state.profile = { ...state.profile, removed_at: '2026-11-01T00:00:00Z' };
    expect((await signVisitVoucher(input())).ok).toBe(false);
    expect(state.writes).toEqual([]);
    expect(state.uploads).toEqual([]);
  });
});
