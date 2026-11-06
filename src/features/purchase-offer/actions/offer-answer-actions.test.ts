import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mission 138 — donner suite à la réponse du vendeur : tout est relu au serveur (l'offre, son
// agence, sa réponse) ; le lien du notaire s'ajoute, jamais il ne remplace ; « Fait » une fois.
const OFFER = '0aaaaaaa-0000-4000-8000-000000000001';
const state = vi.hoisted(() => ({
  profile: {
    id: 'u1',
    agency_id: 'agency-a',
    removed_at: null as string | null,
    first_name: 'Natacha',
    last_name: 'Durand',
    phone: '06 39 98 41 27',
  },
  offer: null as unknown,
  insertError: null as { code: string } | null,
  writes: [] as [string, string, unknown][],
}));

vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/lib/app-errors/report-server-error', () => ({ reportServerError: async () => {} }));
vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: () => ({
    from(table: string) {
      const chain: Record<string, unknown> = {};
      for (const method of ['select', 'eq', 'in']) chain[method] = () => chain;
      chain.maybeSingle = async () =>
        table === 'buyer_documents'
          ? { data: state.offer, error: null }
          : { data: { property_type: 'house', city: 'Mougins' }, error: null };
      chain.insert = (values: unknown) => {
        state.writes.push([table, 'insert', values]);
        return Promise.resolve({
          error: table === 'buyer_offer_follow_ups' ? state.insertError : null,
        });
      };
      chain.update = (values: unknown) => {
        state.writes.push([table, 'update', values]);
        return chain;
      };
      chain.delete = () => {
        state.writes.push([table, 'delete', null]);
        return chain;
      };
      return chain;
    },
  }),
}));

const { markOfferAnswerDone, prepareOfferBuyerMessage, prepareOfferNotaryMessage } =
  await import('@/features/purchase-offer/actions/offer-answer');

const fields = {
  agency: { name: 'Agence Horizon Côte d’Azur' },
  offrants: [
    {
      civility: 'M.',
      lastName: 'Keller',
      firstNames: 'Jonas',
      birthDate: '1980-01-01',
      birthPlace: 'Bâle',
      nationality: 'suisse',
      profession: 'ingénieur',
    },
  ],
  address: '3 rue des Lilas, 06000 Nice',
  matrimonial: null,
  fiscalResidenceFrance: true,
  mandateNumber: 'M-2026-041',
  propertyAddress: '12 chemin des Pins, 06250 Mougins',
  price: 1_600_000,
  validUntil: '2026-11-07',
  cover: {
    agencyName: 'Agence Horizon Côte d’Azur',
    agencyAddress: '70 rue du Bonheur, 06140 Vence',
    agencyPhone: '04 00 00 00 00',
    agencyEmail: 'contact@example.com',
    agencySite: null,
    photoPath: null,
  },
  visitId: 'v1',
  projectId: 'p1',
};
const offer = (decision: 'accepted' | 'refused' | null, archived = false) => ({
  id: OFFER,
  fields,
  buyers: {
    name: 'Famille Keller',
    email: 'famille.keller@example.com',
    phone: '06 39 98 12 34',
    archived_at: archived ? '2026-11-01T00:00:00Z' : null,
  },
  buyer_document_acceptances: decision ? { decision, decided_at: '2026-11-06T09:00:00Z' } : null,
});

beforeEach(() => {
  state.profile.removed_at = null;
  state.offer = offer('accepted');
  state.insertError = null;
  state.writes = [];
});

describe('prévenir l’acquéreur', () => {
  it('acceptée : un lien neuf vers sa copie (jamais un retrait), son message, ses coordonnées', async () => {
    const result = await prepareOfferBuyerMessage(OFFER, 'https://acm.example');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.message).toContain(
      'le vendeur a accepté votre offre d’achat pour la maison de Mougins',
    );
    expect(result.message).toMatch(/https:\/\/acm\.example\/offre\/[A-Za-z0-9_-]{43}/);
    expect(result.phone).toBe('06 39 98 12 34');
    expect(result.email).toBe('famille.keller@example.com');
    expect(state.writes).toEqual([
      ['buyer_document_links', 'insert', expect.objectContaining({ audience: 'visitor' })],
    ]);
  });

  it('refusée : le message sans lien, rien n’est écrit', async () => {
    state.offer = offer('refused');
    const result = await prepareOfferBuyerMessage(OFFER, 'https://acm.example');
    expect(result.ok && result.message).toContain('n’a pas retenu votre offre');
    expect(state.writes).toEqual([]);
  });

  it('sans réponse, fiche archivée, identifiant malformé, membre retiré : rien', async () => {
    state.offer = offer(null);
    expect((await prepareOfferBuyerMessage(OFFER, '')).ok).toBe(false);
    state.offer = offer('accepted', true);
    expect((await prepareOfferBuyerMessage(OFFER, '')).ok).toBe(false);
    expect((await prepareOfferBuyerMessage('pas-un-id', '')).ok).toBe(false);
    state.offer = offer('accepted');
    state.profile.removed_at = '2026-11-01T00:00:00Z';
    expect((await prepareOfferBuyerMessage(OFFER, '')).ok).toBe(false);
    expect(state.writes).toEqual([]);
  });
});

describe('transmettre au notaire', () => {
  it('acceptée : le lien du notaire s’ajoute, sans destinataire connu', async () => {
    const result = await prepareOfferNotaryMessage(OFFER, 'https://acm.example');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.message).toContain('12 chemin des Pins, 06250 Mougins, mandat n° M-2026-041');
    expect(result.message).toContain(
      'Natacha Durand · Agence Horizon Côte d’Azur · 06 39 98 41 27',
    );
    expect(result.phone).toBeNull();
    expect(result.email).toBeNull();
    expect(state.writes).toEqual([
      ['buyer_document_links', 'insert', expect.objectContaining({ audience: 'notary' })],
    ]);
  });

  it('refusée ou sans réponse : refusé, aucun lien', async () => {
    state.offer = offer('refused');
    expect(await prepareOfferNotaryMessage(OFFER, '')).toEqual({
      ok: false,
      error: 'Seule une offre acceptée se transmet au notaire.',
    });
    state.offer = offer(null);
    expect((await prepareOfferNotaryMessage(OFFER, '')).ok).toBe(false);
    expect(state.writes).toEqual([]);
  });
});

describe('« Fait »', () => {
  it('écrit le « Fait » à son auteur ; déjà fait : rien de plus, sans erreur', async () => {
    expect(await markOfferAnswerDone(OFFER)).toEqual({ ok: true });
    expect(state.writes).toEqual([
      [
        'buyer_offer_follow_ups',
        'insert',
        { agency_id: 'agency-a', document_id: OFFER, done_by: 'u1' },
      ],
    ]);
    state.insertError = { code: '23505' };
    expect(await markOfferAnswerDone(OFFER)).toEqual({ ok: true });
  });

  it('une offre sans réponse ou d’une autre agence : rien', async () => {
    state.offer = null;
    expect((await markOfferAnswerDone(OFFER)).ok).toBe(false);
    state.offer = offer(null);
    expect((await markOfferAnswerDone(OFFER)).ok).toBe(false);
    expect(state.writes).toEqual([]);
  });
});
