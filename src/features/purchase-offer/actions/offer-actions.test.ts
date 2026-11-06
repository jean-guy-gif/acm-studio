import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OfferContext } from '@/features/purchase-offer/queries/get-offer-context';

// Mission 137 (partie B) — signer l'offre et y répondre : tout est relu au serveur ; un refus
// n'écrit rien.
const state = vi.hoisted(() => ({
  profile: {
    id: 'u1',
    agency_id: 'agency-a',
    removed_at: null as string | null,
    first_name: 'Carl',
  },
  context: null as unknown,
  writes: [] as [string, string, unknown][],
  uploads: [] as string[],
  found: null as unknown,
}));

vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/lib/app-errors/report-server-error', () => ({ reportServerError: async () => {} }));
vi.mock('@/features/purchase-offer/queries/get-offer-context', () => ({
  getOfferContext: async () => ({ ok: true, context: state.context }),
}));
vi.mock('@/features/purchase-offer/queries/load-offer', () => ({
  findOfferByToken: async () => state.found,
}));
vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: () => ({
    from(table: string) {
      const chain: Record<string, unknown> = {};
      for (const method of ['select', 'eq', 'in']) chain[method] = () => chain;
      chain.insert = (values: unknown) => {
        state.writes.push([table, 'insert', values]);
        return Promise.resolve({ error: null });
      };
      chain.update = (values: unknown) => {
        state.writes.push([table, 'update', values]);
        return chain;
      };
      chain.delete = () => chain;
      chain.then = (resolve: (value: unknown) => unknown) => resolve({ data: null, error: null });
      return chain;
    },
    storage: {
      from: () => ({
        upload: async (path: string) => {
          state.uploads.push(path);
          return { error: null };
        },
        remove: async () => ({ error: null }),
      }),
    },
  }),
}));

const { signPurchaseOffer } = await import('@/features/purchase-offer/actions/sign-offer');
const { respondToOffer } = await import('@/features/purchase-offer/actions/respond-to-offer');

const BUYER = '11111111-1111-4111-8111-111111111111';
const VISIT = '22222222-2222-4222-8222-222222222222';
const PNG = `data:image/png;base64,${Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(100),
]).toString('base64')}`;
const day = (offset: number) =>
  new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

const agency = {
  ...Object.fromEntries(
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
  ),
  guaranteeAmount: 120000,
};

const context = (over: Partial<OfferContext> = {}): OfferContext => ({
  buyer: { id: BUYER, name: 'Famille Test', email: 'test@example.com' },
  visits: [
    {
      visitId: VISIT,
      label: 'Maison · Mougins',
      eligible: true,
      note: 'Offre envisagée · mandat signé',
      projectId: 'p1',
      price: 1_639_500,
      propertyAddress: '12 allée du Décor, 06250 Mougins',
      condominium: false,
      mandateNumber: null,
      fees: null,
      feesPaidBy: null,
      photoPath: null,
      visitedAt: new Date().toISOString(),
      sellerEmail: null,
      sellerPhone: null,
    },
  ],
  agency: agency as OfferContext['agency'],
  gaps: [],
  cover: { site: null },
  advisorFirstName: 'Carl',
  last: null,
  ...over,
});

const input = (over: Record<string, unknown> = {}) => ({
  buyerId: BUYER,
  visitId: VISIT,
  offrants: [
    {
      civility: 'M.',
      lastName: 'Test',
      firstNames: 'Paul',
      birthDate: '1978-04-12',
      birthPlace: 'Lyon',
      nationality: 'française',
      profession: 'ingénieur',
    },
  ],
  address: '5 chemin des Figurants, 69006 Lyon',
  matrimonial: null,
  fiscalResidenceFrance: true,
  mandateNumber: 'M-1',
  agent: null,
  parcels: [{ prefix: '', section: 'AB', number: '214', lieudit: '', area: '18 a 40 ca' }],
  totalArea: '18 a 40 ca',
  lots: [],
  price: 1_590_000,
  fees: 64_000,
  feesPaidBy: 'seller',
  deposit: 80_000,
  financing: 'cash',
  validUntil: day(3),
  contractDeadline: day(40),
  signatures: [PNG],
  ...over,
});

beforeEach(() => {
  state.profile = { id: 'u1', agency_id: 'agency-a', removed_at: null, first_name: 'Carl' };
  state.context = context();
  state.writes = [];
  state.uploads = [];
  state.found = null;
});

describe('signer l’offre d’achat', () => {
  it('écrit l’offre figée, sa visite, le mandat et les honoraires, et deux liens', async () => {
    const result = await signPurchaseOffer(input());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sellerLinkPath).toMatch(/^\/offre\/[A-Za-z0-9_-]{43}$/);
    expect(result.buyerLinkPath).not.toBe(result.sellerLinkPath);
    const tables = state.writes.map(([table, method]) => `${method} ${table}`);
    expect(tables).toEqual([
      'insert buyer_documents',
      'insert buyer_document_visits',
      'update project_meeting_conclusions',
      'insert buyer_document_links',
    ]);
    const offer = state.writes[0]![2] as {
      kind: string;
      valid_until: string;
      rendered_text: string;
    };
    expect(offer.kind).toBe('purchase_offer');
    expect(offer.valid_until).toBe(day(3));
    expect(offer.rendered_text).toContain(
      'au prix de un million cinq cent quatre-vingt-dix mille euros',
    );
    expect(state.writes[2]![2]).toEqual({
      mandate_number: 'M-1',
      fees_amount: 64_000,
      fees_paid_by: 'seller',
    });
    const links = state.writes[3]![2] as { audience: string }[];
    expect(links.map((link) => link.audience)).toEqual(['visitor', 'seller']);
  });

  it('un n° de mandat et des honoraires déjà posés ne se réécrivent pas', async () => {
    state.context = context({
      visits: [
        { ...context().visits[0]!, mandateNumber: 'M-0', fees: 60_000, feesPaidBy: 'buyer' },
      ],
    });
    await signPurchaseOffer(input());
    expect(state.writes.some(([table]) => table === 'project_meeting_conclusions')).toBe(false);
  });

  it('refusé sans rien écrire : avec prêt, sans cadastre, périmée, copropriété sans lot, bien hors mandat, identité incomplète', async () => {
    expect((await signPurchaseOffer(input({ financing: 'loan' }))).ok).toBe(false);
    expect((await signPurchaseOffer(input({ parcels: [] }))).ok).toBe(false);
    expect(
      (await signPurchaseOffer(input({ validUntil: day(-2), contractDeadline: day(40) }))).ok,
    ).toBe(false);
    expect(
      (await signPurchaseOffer(input({ contractDeadline: day(1), validUntil: day(3) }))).ok,
    ).toBe(false);
    state.context = context({ visits: [{ ...context().visits[0]!, condominium: true }] });
    expect((await signPurchaseOffer(input())).ok).toBe(false);
    state.context = context({
      visits: [{ ...context().visits[0]!, eligible: false, note: 'hors mandat' }],
    });
    expect(await signPurchaseOffer(input())).toEqual({ ok: false, error: 'hors mandat' });
    state.context = context({ agency: null, gaps: ['N° de TVA'] });
    expect((await signPurchaseOffer(input())).ok).toBe(false);
    expect(state.writes).toEqual([]);
    expect(state.uploads).toEqual([]);
  });
});

describe('la réponse du vendeur', () => {
  const found = (over: Record<string, unknown> = {}) => ({
    audience: 'seller',
    offer: { id: 'o1', agencyId: 'agency-a', validUntil: day(2), answer: null, ...over },
  });

  it('« Bon pour acceptation » : signée par chaque propriétaire, sous le dossier de l’agence', async () => {
    state.found = found();
    expect(
      await respondToOffer('t', {
        decision: 'accepted',
        signers: ['M. Lefebvre', 'Mme Lefebvre'],
        signatures: [PNG, PNG],
      }),
    ).toEqual({ ok: true });
    expect(state.uploads).toHaveLength(2);
    expect(state.uploads.every((path) => path.startsWith('agency-a/o1/'))).toBe(true);
    const answer = state.writes[0]![2] as { decision: string; signer_names: string[] };
    expect(answer).toMatchObject({
      decision: 'accepted',
      signer_names: ['M. Lefebvre', 'Mme Lefebvre'],
    });
  });

  it('« Je refuse » : sans signature', async () => {
    state.found = found();
    expect(await respondToOffer('t', { decision: 'refused' })).toEqual({ ok: true });
    expect(state.writes[0]![2]).toEqual({
      agency_id: 'agency-a',
      document_id: 'o1',
      decision: 'refused',
    });
    expect(state.uploads).toEqual([]);
  });

  it('le lien des offrants, une offre passée ou déjà répondue, une signature manquante : rien', async () => {
    state.found = { ...found(), audience: 'visitor' };
    expect((await respondToOffer('t', { decision: 'refused' })).ok).toBe(false);
    state.found = found({ validUntil: day(-2) });
    expect((await respondToOffer('t', { decision: 'refused' })).ok).toBe(false);
    state.found = found({ answer: { decision: 'refused' } });
    expect((await respondToOffer('t', { decision: 'refused' })).ok).toBe(false);
    state.found = found();
    expect(
      (
        await respondToOffer('t', {
          decision: 'accepted',
          signers: ['A B', 'C D'],
          signatures: [PNG],
        })
      ).ok,
    ).toBe(false);
    state.found = null;
    expect((await respondToOffer('t', { decision: 'refused' })).ok).toBe(false);
    expect(state.writes).toEqual([]);
  });
});
