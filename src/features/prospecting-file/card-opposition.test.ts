import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mission 111 — aucun courrier sur une copie dont la CARTE est opposée. Le scénario de l'audit :
// une annonce retenue dans deux mandats, adresse confirmée sur un seul, adresse inscrite à la main
// « Ne plus solliciter ». La copie sans adresse ne porte aucune opposition à elle seule ; c'est sa
// carte qui la porte. Chaque chemin refuse : la page du courrier (les deux versions), son
// enregistrement, et la liste du dossier.

const state = vi.hoisted(() => ({
  cardOpposedOn: '2026-10-20T09:00:00.000Z' as string | null,
  writes: [] as string[],
}));

// Un client qui répond table par table (le chargement lit plusieurs tables en parallèle).
const TABLES: Record<string, unknown> = {
  projects: { id: 'p2', status: 'meeting_completed' },
  project_meeting_conclusions: { outcome: 'signed', commercialization_price: 300_000 },
  // La copie du second mandat : sans adresse, ni annonce opposée à elle seule.
  comparables: {
    id: 'c2',
    is_selected: true,
    sold_by: 'unknown',
    exclusivity: 'unknown',
    listing_url: 'https://www.seloger.com/annonces/achat/appartement/antibes/123.htm',
    locator_address: null,
    locator_confirmed: null,
    locator_source: null,
    locator_latitude: null,
    locator_longitude: null,
    photo_urls: [],
  },
  subject_properties: { address: '1 rue du Bien', postal_code: '06600', photo_urls: [] },
};
function chain(table: string) {
  const self: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'neq', 'in', 'is', 'order', 'limit']) {
    self[method] = () => self;
  }
  for (const method of ['insert', 'update', 'upsert', 'delete']) {
    self[method] = () => {
      state.writes.push(`${method} ${table}`);
      return self;
    };
  }
  self.maybeSingle = async () => ({ data: TABLES[table] ?? null, error: null });
  self.then = (resolve: (value: unknown) => unknown) =>
    resolve({ data: TABLES[table] ?? null, error: null });
  return self;
}
const client = { from: (table: string) => chain(table) };

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => client }));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => client }));
vi.mock('@/lib/auth/get-profile', () => ({
  getProfile: async () => ({
    id: 'u1',
    agency_id: 'a1',
    phone: '06 00 00 00 00',
    removed_at: null,
  }),
}));
vi.mock('@/features/branding/queries/get-agency-branding', () => ({
  getAgencyBranding: async () => ({
    postalAddress: '1 place du Marché, 06600 Antibes',
    professionalCard: 'CPI 0601',
    professionalCardIssuer: 'CCI Nice',
  }),
}));
// La liste de l'agence ne porte que l'adresse de l'AUTRE copie : rien ne vise celle-ci.
vi.mock('@/features/prospecting/queries/get-oppositions', () => ({
  getOppositions: async () => ({ addresses: new Map(), listings: new Map() }),
}));
vi.mock('@/features/prospecting/queries/prospecting-card-store', () => ({
  cardOpposedOn: async () => state.cardOpposedOn,
}));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));

import { saveProspectingFile } from '@/features/prospecting-file/actions/save-prospecting-file';
import { getProspectingFile } from '@/features/prospecting-file/queries/get-prospecting-file';
import { OPPOSED_MESSAGE } from '@/features/prospecting/services/opposition';

const input = (version: 'owner' | 'colleague') => ({
  version,
  title: '',
  letter: '',
  keyMessage: '',
  proposals: ['', '', ''],
  contactHook: '',
  showPrices: false,
  photoPath: null,
  theirPhoto: { mode: 'none' },
});

beforeEach(() => {
  state.cardOpposedOn = '2026-10-20T09:00:00.000Z';
  state.writes = [];
});

describe('un courrier sur une copie dont la carte est opposée (mission 111)', () => {
  it('la page refuse, version propriétaire comme version confrère', async () => {
    for (const version of ['owner', 'colleague'] as const) {
      const context = await getProspectingFile('p2', 'c2', version);
      expect(context).toEqual({ status: 'blocked', version, blocker: 'opposed' });
    }
    const choose = await getProspectingFile('p2', 'c2', undefined);
    expect(choose.status).toBe('choose');
    if (choose.status === 'choose') {
      expect(choose.versions.every((entry) => entry.blocker === 'opposed')).toBe(true);
    }
  });

  it('l’enregistrement refuse, avec le message, et n’écrit rien', async () => {
    for (const version of ['owner', 'colleague'] as const) {
      expect(await saveProspectingFile('p2', 'c2', input(version))).toEqual({
        ok: false,
        error: OPPOSED_MESSAGE,
      });
    }
    expect(state.writes).toEqual([]);
  });

  it('sans opposition sur la carte, aucune version n’est bloquée par elle', async () => {
    state.cardOpposedOn = null;
    const choose = await getProspectingFile('p2', 'c2', undefined);
    expect(choose.status).toBe('choose');
    if (choose.status === 'choose') {
      expect(choose.versions.some((entry) => entry.blocker === 'opposed')).toBe(false);
    }
  });
});
