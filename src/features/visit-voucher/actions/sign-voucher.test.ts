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
      let ids: string[] = [VISIT];
      for (const method of ['select', 'eq']) chain[method] = () => chain;
      chain.in = (_column: string, values: string[]) => {
        ids = values;
        return chain;
      };
      chain.insert = (values: unknown) => {
        state.writes.push([table, values]);
        return Promise.resolve({ error: null });
      };
      chain.then = (resolve: (value: unknown) => unknown) =>
        resolve({
          data:
            table === 'buyer_visit_requests'
              ? ids.map((id) => ({
                  id,
                  buyer_selection_items:
                    id === OUTSIDE
                      ? { source: 'listing', reference: 'https://annonce.example/1' }
                      : { source: 'project', reference: 'p1' },
                }))
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
const OUTSIDE = '44444444-4444-4444-8444-444444444444';
const SECOND = '55555555-5555-4555-8555-555555555555';
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
      day: '2026-11-06T10:00:00Z',
      outside: false,
      suggestion: null,
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
      day: '2026-11-05T10:00:00Z',
      outside: false,
      suggestion: null,
    },
    {
      visitId: OUTSIDE,
      label: 'Maison · 6 pièces · 220 m² · Mougins',
      eligible: true,
      note: 'Annonce du marché, hors mandat de l’agence',
      price: 1_720_000,
      address: null,
      mandate: null,
      visited: false,
      day: '2026-11-07T10:00:00Z',
      outside: true,
      suggestion: null,
    },
  ],
  agency: agency as VoucherContext['agency'],
  gaps: [],
  advisorName: 'Carl Conseiller',
  city: 'Mougins',
  lastVisitor: null,
  lastSearchTitle: null,
  tourOpen: false,
  ...over,
});

const input = (over: Record<string, unknown> = {}) => ({
  buyerId: BUYER,
  visitors: [{ civility: 'M.', firstName: 'Paul', lastName: 'Test' }],
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

  it('le prix et l’adresse connus du serveur l’emportent sur ceux du navigateur', async () => {
    await signVisitVoucher(
      input({
        biens: [{ visitId: VISIT, mandate: 'M-1', price: 1, address: 'une autre adresse' }],
        city: 'Ailleurs',
      }),
    );
    const document = state.writes[0]![1] as { rendered_text: string };
    expect(document.rendered_text).toMatch(/Prix de commercialisation : 1\s639\s500 €/);
    expect(document.rendered_text).toContain('Adresse du bien : 12 allée du Décor, 06250 Mougins');
    expect(document.rendered_text).toContain('Fait à Mougins ,');
    expect(document.rendered_text).not.toContain('une autre adresse');
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
              { civility: 'M.', firstName: 'Paul', lastName: 'Test' },
              { civility: 'Mme', firstName: 'Anna', lastName: 'Test' },
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

  // Mission 153 — hors mandat : le titre obligatoire, un bon à part, la version validée.
  describe('hors mandat', () => {
    const outsideBien = {
      visitId: OUTSIDE,
      mandate: '',
      price: 1_720_000,
      address: '8 allée des Cistes Blancs, 06250 Mougins',
    };
    const search = { kind: 'search', number: 'R-2026-031', signedOn: '2026-11-04' };

    it('sans titre : rien n’est écrit, l’écran dit pourquoi', async () => {
      const result = await signVisitVoucher(input({ biens: [outsideBien] }));
      expect(result).toEqual({
        ok: false,
        error: 'Choisissez à quel titre vous intervenez : sans lui, le document ne se crée pas.',
      });
      expect(state.writes).toEqual([]);
      expect(state.uploads).toEqual([]);
    });

    it('un bien sous mandat et un bien hors mandat ne se réunissent pas', async () => {
      const result = await signVisitVoucher(
        input({
          biens: [input().biens[0], outsideBien],
          title: search,
        }),
      );
      expect(result).toEqual({
        ok: false,
        error: 'Un bien hors mandat se signe sur un bon à part.',
      });
      expect(state.writes).toEqual([]);
    });

    it('un titre sur un bien sous mandat, un mandat de recherche daté du futur : refusés', async () => {
      expect((await signVisitVoucher(input({ title: search }))).ok).toBe(false);
      expect(
        (
          await signVisitVoucher(
            input({ biens: [outsideBien], title: { ...search, signedOn: '2099-01-01' } }),
          )
        ).ok,
      ).toBe(false);
      expect(state.writes).toEqual([]);
    });

    it('au mandat de recherche : la version hors mandat, les trois phrases validées', async () => {
      const result = await signVisitVoucher(input({ biens: [outsideBien], title: search }));
      expect(result.ok).toBe(true);
      const document = state.writes[0]![1] as {
        rendered_text: string;
        template_version: string;
        fields: { title: unknown; biens: { mandate: string }[] };
      };
      expect(document.template_version).toBe('bon-de-visite-hors-mandat-2026-11-12');
      expect(document.rendered_text).toContain(
        "que l'Agence me présente en vertu du titre indiqué pour chacun d'eux.",
      );
      expect(document.rendered_text).toContain(
        "Je reconnais avoir confié à l'Agence un mandat de recherche, et que ces biens m'ont été présentés dans le cadre de ce mandat.",
      );
      expect(document.rendered_text).toMatch(
        /Mandat de recherche n° R-2026-031 du 04\/11\/2026 · Prix affiché : 1\s720\s000 € · Adresse du bien : 8 allée des Cistes Blancs, 06250 Mougins/,
      );
      expect(document.rendered_text).not.toContain('précisés notamment dans le mandat de vente');
      expect(document.rendered_text).not.toContain('Numéro du mandat');
      expect(document.fields.title).toEqual(search);
      expect(document.fields.biens[0]!.mandate).toBe('');
    });

    it('en collaboration : l’agence du confrère et le n° de son mandat', async () => {
      await signVisitVoucher(
        input({
          biens: [outsideBien],
          title: { kind: 'colleague', agency: 'Agence Littoral & Pins', number: 'V-4471' },
        }),
      );
      const document = state.writes[0]![1] as { rendered_text: string };
      expect(document.rendered_text).toContain(
        "Je suis informé(e) que le vendeur a confié un mandat de vente à l'agence Agence Littoral & Pins, avec laquelle l'Agence collabore, et qu'il s'est engagé à ne pas traiter la vente de ces biens directement avec un acquéreur présenté par l'Agence.",
      );
      expect(document.rendered_text).toContain(
        'En collaboration avec Agence Littoral & Pins, mandat de vente n° V-4471 · Prix affiché',
      );
    });

    it('en collaboration, un bien par bon : le confrère est nommé une fois', async () => {
      state.context = context({
        visits: [
          ...context().visits,
          { ...context().visits[2]!, visitId: SECOND, label: 'Maison · Valbonne' },
        ],
      });
      const result = await signVisitVoucher(
        input({
          biens: [outsideBien, { ...outsideBien, visitId: SECOND }],
          title: { kind: 'colleague', agency: 'Agence Littoral & Pins', number: 'V-4471' },
        }),
      );
      expect(result).toEqual({
        ok: false,
        error: 'En collaboration, un bien par bon : signez les autres sur un bon à part.',
      });
      expect(state.writes).toEqual([]);
    });
  });
});

// Mission 154 (point 3) — le bon de la tournée, ouvert : plusieurs titres sur un bon, chaque bien
// avec le sien.
describe('le bon de la tournée', () => {
  const mandateBien = {
    visitId: VISIT,
    mandate: 'M-2026-0142',
    price: 1639500,
    address: '12 allée du Décor, 06250 Mougins',
    title: null,
  };
  const searchBien = {
    visitId: OUTSIDE,
    mandate: '',
    price: 395_000,
    address: '3 rue du Vieux Pressoir, 06600 Antibes',
    title: { kind: 'search', number: 'R-2026-031', signedOn: '2026-11-04' },
  };
  const colleagueBien = {
    visitId: SECOND,
    mandate: '',
    price: 1_720_000,
    address: '1 chemin des Pins, 06250 Mougins',
    title: { kind: 'colleague', agency: 'Agence Littoral & Pins', number: 'V-4471' },
  };
  const open = () =>
    context({
      tourOpen: true,
      visits: [
        ...context().visits,
        { ...context().visits[2]!, visitId: SECOND, label: 'Maison · 220 m² · Mougins' },
      ],
    });

  beforeEach(() => {
    state.context = open();
  });

  it('trois titres : chaque bien sa ligne, les trois phrases une fois chacune', async () => {
    const result = await signVisitVoucher(
      input({ biens: [mandateBien, searchBien, colleagueBien] }),
    );
    expect(result.ok).toBe(true);
    const document = state.writes[0]![1] as {
      rendered_text: string;
      template_version: string;
      fields: { title: unknown; biens: { title?: unknown }[] };
    };
    expect(document.template_version).toBe('bon-de-visite-tournee-2026-11-12');
    const text = document.rendered_text;
    expect(text).toContain("que l'Agence me présente en vertu du titre indiqué pour chacun d'eux.");
    expect(text).toMatch(
      /Mandat de vente de l'Agence n° M-2026-0142 · Prix de commercialisation : 1\s639\s500 €/,
    );
    expect(text).toContain('Mandat de recherche n° R-2026-031 du 04/11/2026 · Prix affiché');
    expect(text).toContain(
      'En collaboration avec Agence Littoral & Pins, mandat de vente n° V-4471 · Prix affiché',
    );
    expect(text).toContain("Pour les biens que l'Agence a en mandat de vente, je suis informé(e)");
    expect(text).toContain(
      'Pour les biens présentés au titre de mon mandat de recherche, je reconnais',
    );
    expect(text).toContain(
      "Pour chaque bien présenté en collaboration, je suis informé(e) que le vendeur a confié un mandat de vente à l'agence indiquée sur sa ligne",
    );
    expect(text).not.toContain('Numéro du mandat');
    expect(text).not.toContain('précisés notamment dans le mandat de vente');
    expect(document.fields.title).toBeNull();
    expect(document.fields.biens.map((bien) => bien.title)).toEqual([
      null,
      searchBien.title,
      colleagueBien.title,
    ]);
  });

  it('deux titres seulement : les seules phrases présentes', async () => {
    await signVisitVoucher(input({ biens: [mandateBien, searchBien] }));
    const text = (state.writes[0]![1] as { rendered_text: string }).rendered_text;
    expect(text).toContain("Pour les biens que l'Agence a en mandat de vente");
    expect(text).toContain('Pour les biens présentés au titre de mon mandat de recherche');
    expect(text).not.toContain('Pour chaque bien présenté en collaboration');
  });

  it('un seul titre : les textes d’avant, mot pour mot', async () => {
    await signVisitVoucher(input({ biens: [mandateBien] }));
    const mandate = state.writes[0]![1] as { rendered_text: string; template_version: string };
    expect(mandate.template_version).toBe('bon-de-visite-2026-11-06');
    expect(mandate.rendered_text).toContain('Numéro du mandat : M-2026-0142');
    state.writes = [];
    await signVisitVoucher(input({ biens: [searchBien] }));
    const search = state.writes[0]![1] as { rendered_text: string; template_version: string };
    expect(search.template_version).toBe('bon-de-visite-hors-mandat-2026-11-12');
    expect(search.rendered_text).toContain(
      "Je reconnais avoir confié à l'Agence un mandat de recherche, et que ces biens",
    );
  });

  it('deux collaborations avec deux confrères sur un bon : permis', async () => {
    state.context = context({
      tourOpen: true,
      visits: [
        context().visits[2]!,
        { ...context().visits[2]!, visitId: SECOND, label: 'Maison · 220 m² · Mougins' },
      ],
    });
    const result = await signVisitVoucher(
      input({
        biens: [
          {
            ...searchBien,
            title: { kind: 'colleague', agency: 'Collines & Vallons', number: 'V-1' },
          },
          colleagueBien,
        ],
      }),
    );
    expect(result.ok).toBe(true);
    const text = (state.writes[0]![1] as { rendered_text: string }).rendered_text;
    expect(text).toContain('En collaboration avec Collines & Vallons, mandat de vente n° V-1');
    expect(text).toContain(
      'En collaboration avec Agence Littoral & Pins, mandat de vente n° V-4471',
    );
  });

  it('un bien hors mandat sans titre, un titre sur un bien sous mandat : rien n’est écrit', async () => {
    expect(
      await signVisitVoucher(input({ biens: [mandateBien, { ...searchBien, title: null }] })),
    ).toEqual({
      ok: false,
      error: 'Choisissez à quel titre vous intervenez : sans lui, le document ne se crée pas.',
    });
    expect(
      (await signVisitVoucher(input({ biens: [{ ...mandateBien, title: searchBien.title }] }))).ok,
    ).toBe(false);
    expect(state.writes).toEqual([]);
  });

  it('le même confrère sous deux n° de mandat : la tournée, chaque bien son n° (relecteur)', async () => {
    state.context = context({
      tourOpen: true,
      visits: [
        context().visits[2]!,
        { ...context().visits[2]!, visitId: SECOND, label: 'Maison · 220 m² · Mougins' },
      ],
    });
    await signVisitVoucher(
      input({
        biens: [
          {
            ...searchBien,
            title: { kind: 'colleague', agency: 'Agence Littoral & Pins', number: 'V-1' },
          },
          {
            ...colleagueBien,
            title: { kind: 'colleague', agency: 'Agence Littoral & Pins', number: 'V-2' },
          },
        ],
      }),
    );
    const document = state.writes[0]![1] as { rendered_text: string; template_version: string };
    expect(document.template_version).toBe('bon-de-visite-tournee-2026-11-12');
    expect(document.rendered_text).toContain('mandat de vente n° V-1');
    expect(document.rendered_text).toContain('mandat de vente n° V-2');
    expect(document.rendered_text).toContain("l'agence indiquée sur sa ligne");
  });

  it('deux mandats de recherche différents sur un bon : refusé', async () => {
    state.context = context({
      tourOpen: true,
      visits: [
        context().visits[2]!,
        { ...context().visits[2]!, visitId: SECOND, label: 'Maison · 220 m² · Mougins' },
      ],
    });
    const result = await signVisitVoucher(
      input({
        biens: [
          searchBien,
          { ...colleagueBien, title: { kind: 'search', number: 'R-9', signedOn: '2026-11-04' } },
        ],
      }),
    );
    expect(result).toEqual({
      ok: false,
      error:
        'Un seul mandat de recherche par bon : le même numéro et la même date pour tous ses biens.',
    });
    expect(state.writes).toEqual([]);
  });

  it('un visiteur sans prénom ou sans civilité : le bon ne se signe pas (Jean-Guy, 12/11)', async () => {
    state.context = context();
    expect(
      (
        await signVisitVoucher(
          input({ visitors: [{ civility: 'M.', firstName: '', lastName: 'Keller' }] }),
        )
      ).ok,
    ).toBe(false);
    expect(
      (
        await signVisitVoucher(
          input({ visitors: [{ civility: '', firstName: 'Paul', lastName: 'Keller' }] }),
        )
      ).ok,
    ).toBe(false);
    expect(state.writes).toEqual([]);
  });
});
