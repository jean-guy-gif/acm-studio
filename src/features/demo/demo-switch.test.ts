import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { listingPayload } from '@/features/competitor-search/services/listing-payload';
import { geoProviderFor } from '@/features/competitor-search/services/geo-provider';
import {
  DEMO_LISTING_HOST,
  DEMO_LISTING_UNKNOWN,
  DEMO_SUBJECT_UNKNOWN,
} from '@/features/demo/constants';
import { DEMO_SCENARIOS } from '@/features/demo/data/scenarios';
import { demoListingUrl, demoSubjectListingUrl } from '@/features/demo/services/demo-urls';
import { fakeSupabase } from '@/test-fixtures/fake-supabase';

// Mission 114 (A1.3) — la bascule vers les fournisseurs simulés se décide CÔTÉ SERVEUR, sur le
// repère de l'agence, jamais sur un paramètre du navigateur ; et dans les deux sens :
//   - une agence RÉELLE n'atteint jamais un fournisseur simulé : les actions de démonstration
//     refusent et n'écrivent rien, l'import par l'extension ne connaît pas une annonce de démo ;
//   - l'agence de DÉMONSTRATION n'atteint jamais un fournisseur réel : aucun `fetch` ne part
//     (import, Localisateur, relecture des prix, géographie), tout vient du jeu de données, et
//     entre dans les mêmes services qu'une vraie lecture.
// Les actions sont appelées pour de vrai ; seuls le repère, la session, la base et les services
// d'écriture partagés sont remplacés.

const state = vi.hoisted(() => ({
  demo: false,
  profile: null as Record<string, unknown> | null,
  respond: (() => ({})) as (table: string) => { data?: unknown; error?: unknown },
}));
const created = vi.hoisted(() => [] as Record<string, unknown>[]);
const located = vi.hoisted(() => [] as unknown[]);
const readings = vi.hoisted(() => [] as { price: number; url: string }[]);

const server = fakeSupabase((calls) => {
  const from = [...calls].reverse().find((call) => call.method === 'from');
  return state.respond(from ? String(from.args[0]) : '');
});

vi.mock('@/features/demo/services/is-demo-agency', () => ({
  isDemoAgency: async () => state.demo,
}));
vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => server.client }));
vi.mock('@/features/demo/services/demo-delay', () => ({ demoDelay: async () => undefined }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/features/competitor-search/services/create-imported-competitor', () => ({
  createImportedCompetitor: async (options: Record<string, unknown>) => {
    created.push(options);
    return { ok: true, name: 'créé' };
  },
}));
vi.mock('@/features/competitor-locator/actions/competitor-locations', () => ({
  loadCompetitorsToLocate: async () =>
    DEMO_SCENARIOS[0].listings.slice(0, 2).map((listing) => ({
      id: `c-${listing.id}`,
      listingUrl: demoListingUrl(listing),
    })),
  saveCompetitorLocations: async (_projectId: string, entries: unknown[]) => {
    located.push(...entries);
    return { ok: true, changed: entries.length };
  },
}));
vi.mock('@/features/competitor-refresh/actions/refresh-competitor-price', () => ({
  finishPriceRefresh: async () => undefined,
}));
vi.mock('@/features/competitor-refresh/services/record-price-reading', () => ({
  recordPriceReading: async (
    _supabase: unknown,
    _agencyId: string,
    competitor: { price: number },
    url: string,
    _data: unknown,
    price: number,
  ) => {
    readings.push({ price, url });
    return price === competitor.price
      ? { status: 'unchanged', price }
      : { status: 'changed', previous: competitor.price, price };
  },
}));

const AGENCY = '11111111-1111-4111-8111-111111111111';
const PROJECT = '33333333-3333-4333-8333-333333333333';
const advisor = { id: 'u-advisor', agency_id: AGENCY, role: 'advisor', removed_at: null };
const antibes = DEMO_SCENARIOS[0];
const listing = antibes.listings[0];
const dropped = antibes.listings.find(
  (entry) => entry.priceAfterMeeting != null && entry.priceAfterMeeting < entry.price,
)!;
const form = (url: string): FormData => {
  const data = new FormData();
  data.set('url', url);
  return data;
};

async function actions() {
  const [competitor, subject, locate, refresh] = await Promise.all([
    import('@/features/demo/actions/import-demo-competitor'),
    import('@/features/demo/actions/import-demo-subject'),
    import('@/features/demo/actions/locate-demo-competitors'),
    import('@/features/demo/actions/refresh-demo-prices'),
  ]);
  return {
    importDemoCompetitor: competitor.importDemoCompetitor,
    importDemoSubjectListing: subject.importDemoSubjectListing,
    locateDemoCompetitors: locate.locateDemoCompetitors,
    refreshDemoPrices: refresh.refreshDemoPrices,
  };
}

beforeEach(() => {
  server.reset();
  created.length = 0;
  located.length = 0;
  readings.length = 0;
  state.demo = false;
  state.profile = advisor;
  state.respond = (table) => {
    if (table === 'projects') return { data: { id: PROJECT, status: 'meeting_completed' } };
    if (table === 'comparables') {
      return {
        data: [
          {
            id: 'c-1',
            price: dropped.price,
            listing_url: demoListingUrl(dropped),
            listing_gone_at: null,
          },
        ],
      };
    }
    return {};
  };
  // Aucun appel réseau ne doit partir : un `fetch` est une faute, pas un repli.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new Error('appel réseau interdit');
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('une agence réelle n’atteint jamais un fournisseur simulé', () => {
  it('les quatre actions de démonstration refusent, sans rien écrire', async () => {
    const {
      importDemoCompetitor,
      importDemoSubjectListing,
      locateDemoCompetitors,
      refreshDemoPrices,
    } = await actions();
    expect((await importDemoCompetitor(PROJECT, demoListingUrl(listing))).ok).toBe(false);
    expect(await importDemoSubjectListing(PROJECT, form(demoSubjectListingUrl('antibes')))).toEqual(
      {
        ok: false,
        error: DEMO_SUBJECT_UNKNOWN,
      },
    );
    expect(await locateDemoCompetitors(PROJECT)).toEqual({
      availability: 'unavailable',
      pending: false,
      changed: 0,
    });
    expect(await refreshDemoPrices(PROJECT)).toEqual([]);
    expect(server.writes()).toEqual([]);
    expect(created).toEqual([]);
    expect(located).toEqual([]);
    expect(readings).toEqual([]);
  });

  it('sans session ou membre retiré : même refus, démo ou non', async () => {
    const { importDemoCompetitor } = await actions();
    for (const demo of [false, true]) {
      state.demo = demo;
      for (const profile of [null, { ...advisor, removed_at: '2026-10-01T00:00:00Z' }]) {
        state.profile = profile;
        expect((await importDemoCompetitor(PROJECT, demoListingUrl(listing))).ok).toBe(false);
      }
    }
    expect(created).toEqual([]);
  });

  it('l’import par l’extension ne connaît pas une annonce de démonstration', async () => {
    const { importAndCreateComparable } =
      await import('@/features/competitor-search/actions/import-and-create-competitor');
    const result = await importAndCreateComparable(
      PROJECT,
      listingPayload(demoListingUrl(listing), '<html><body>Prix 410 000 €</body></html>', null),
    );
    expect(result).toEqual({ ok: false, error: 'Adresse d’annonce invalide.' });
    expect(server.writes()).toEqual([]);
    expect(created).toEqual([]);
  });

  it('la géographie d’une agence réelle est celle des services publics, pas la table locale', async () => {
    const geo = await geoProviderFor(AGENCY);
    // `fetch` est interdit dans ce test : le fournisseur réel l'appelle, et son appel échoue —
    // ce qui prouve qu'il n'a pas répondu depuis la table locale de la démo.
    const commune = await geo.resolveCommune('Antibes', '06600');
    expect(commune.ok).toBe(false);
    expect(fetch).toHaveBeenCalled();
  });
});

describe('l’agence de démonstration n’atteint jamais un fournisseur réel', () => {
  beforeEach(() => {
    state.demo = true;
  });

  it('l’import vient du jeu de données et entre dans le service commun, sans aucun appel', async () => {
    const { importDemoCompetitor } = await actions();
    const result = await importDemoCompetitor(PROJECT, demoListingUrl(listing));
    expect(result.ok).toBe(true);
    expect(created).toHaveLength(1);
    const call = created[0];
    expect(call.projectId).toBe(PROJECT);
    expect(call.agencyId).toBe(AGENCY);
    expect((call.url as URL).hostname).toBe(DEMO_LISTING_HOST);
    expect((call.data as { price: number }).price).toBe(listing.price);
    expect(call.propertyType).toBe(listing.propertyType);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('une annonce d’un vrai portail, ou inconnue, n’est pas importée : rien ne part ailleurs', async () => {
    const { importDemoCompetitor } = await actions();
    for (const url of [
      'https://www.seloger.com/annonces/achat/appartement/antibes-06/123456789.htm',
      `https://${DEMO_LISTING_HOST}/annonces/inconnue-999`,
      'pas une adresse',
    ]) {
      expect(await importDemoCompetitor(PROJECT, url)).toEqual({
        ok: false,
        error: DEMO_LISTING_UNKNOWN,
      });
    }
    expect(created).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('le bien vendeur s’importe depuis le scénario, prix « pour information » seulement', async () => {
    const { importDemoSubjectListing } = await actions();
    const result = await importDemoSubjectListing(PROJECT, form(demoSubjectListingUrl('antibes')));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.price).toBe(antibes.subject.listedPrice);
    expect(result.data.surfaceArea).toBe(antibes.subject.surfaceArea);
    expect(result.foundFields.length).toBeGreaterThan(0);
    // L'annonce d'un concurrent n'est pas celle du bien vendeur.
    expect(await importDemoSubjectListing(PROJECT, form(demoListingUrl(listing)))).toEqual({
      ok: false,
      error: DEMO_SUBJECT_UNKNOWN,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('le Localisateur simulé rend des adresses confirmées, par l’écriture commune', async () => {
    const { locateDemoCompetitors } = await actions();
    expect(await locateDemoCompetitors(PROJECT)).toEqual({
      availability: 'ready',
      pending: false,
      changed: 2,
    });
    expect(located).toHaveLength(2);
    for (const entry of located as { listingUrl: string; raw: Record<string, unknown> }[]) {
      expect(new URL(entry.listingUrl).hostname).toBe(DEMO_LISTING_HOST);
      expect(entry.raw.confirme).toBe(true);
      expect(entry.raw.etiquetteCle).toBe('confirmee');
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it('la relecture des prix passe par le constat commun : une baisse simulée apparaît', async () => {
    const { refreshDemoPrices } = await actions();
    const outcomes = await refreshDemoPrices(PROJECT);
    expect(outcomes).toEqual([
      { status: 'changed', previous: dropped.price, price: dropped.priceAfterMeeting },
    ]);
    expect(readings).toEqual([{ price: dropped.priceAfterMeeting, url: demoListingUrl(dropped) }]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('la relecture des prix ne lit que le Suivi : un dossier en préparation ne change pas', async () => {
    const { refreshDemoPrices } = await actions();
    state.respond = (table) =>
      table === 'projects' ? { data: { id: PROJECT, status: 'ready_for_meeting' } } : {};
    expect(await refreshDemoPrices(PROJECT)).toEqual([]);
    expect(readings).toEqual([]);
  });

  it('la géographie vient de la table locale : la commune se résout sans appel', async () => {
    const geo = await geoProviderFor(AGENCY);
    const commune = await geo.resolveCommune('Antibes', '06600');
    expect(commune.ok).toBe(true);
    expect(commune.ok && commune.code).toBe('06004');
    expect(fetch).not.toHaveBeenCalled();
  });
});
