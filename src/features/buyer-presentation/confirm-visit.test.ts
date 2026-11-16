import { beforeEach, describe, expect, it, vi } from 'vitest';

import { visitMoment } from '@/features/buyer-presentation/services/visit-moment';
import { fakeSupabase, type FakeCall, type FakeResponse } from '@/test-fixtures/fake-supabase';

// Mission 142 — « Confirmer la visite », appelé POUR DE VRAI avec un client factice (modèle de
// `sensitive-actions.test.ts`, M100) : un appel refusé n'écrit rien. Mission 147 (partie A) — le
// message reprend le lien client « Vivre ici » d'Academia du mandat, s'il est collé ; sinon, la
// sélection seule.

const state = vi.hoisted(() => ({
  profile: null as Record<string, unknown> | null,
  visit: null as Record<string, unknown> | null,
  item: null as Record<string, unknown> | null,
  projectLink: null as string | null,
  signed: true,
  readFails: false,
  // Mission 156 — l'interrupteur du hors mandat, et le lien collé sur un bien hors mandat.
  open: true,
  outsideLink: null as { property_key: string; url: string; pasted_at: string } | null,
}));

function lastTable(calls: FakeCall[]): string {
  const from = [...calls].reverse().find((call) => call.method === 'from');
  return from ? String(from.args[0]) : '';
}

const service = fakeSupabase((calls): FakeResponse => {
  switch (lastTable(calls)) {
    case 'buyer_visit_requests':
      return { data: state.visit };
    case 'buyer_selection_items':
      return { data: state.item };
    case 'projects':
      return state.readFails
        ? { error: { message: 'lecture impossible' } }
        : { data: [{ id: 'p1', academia_living_here_url: state.projectLink }] };
    case 'project_meeting_conclusions':
      return { data: state.signed ? [{ project_id: 'p1' }] : [] };
    case 'property_living_here_links':
      return { data: state.outsideLink ? [state.outsideLink] : [] };
    default:
      return {};
  }
});

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => service.client }));
vi.mock('@/lib/app-errors/report-server-error', () => ({
  reportServerError: vi.fn(async () => {}),
}));
vi.mock('@/features/academia/services/living-here-switch', () => ({
  livingHereEverywhereOpen: () => state.open,
}));
vi.mock('@/features/ideal-properties/services/ideal-selection', () => ({
  toSelectionItem: (row: unknown) => row,
}));
vi.mock('@/features/buyer-presentation/queries/load-presentation', () => ({
  presentedItems: vi.fn(async () => [{ propertyType: 'house', city: 'Mougins' }]),
}));
vi.mock('@/features/buyer-dossier/actions/dossier-links', () => ({
  createDossierLink: vi.fn(async () => ({
    ok: true,
    url: 'https://x.test/dossier/abc',
    linkId: 'l',
    expiresAt: 'e',
  })),
}));

const AGENCY = '11111111-1111-4111-8111-111111111111';
const VISIT = '44444444-4444-4444-8444-444444444444';
const advisor = { id: 'u-advisor', agency_id: AGENCY, removed_at: null, first_name: 'Camille' };
const liveVisit = {
  id: VISIT,
  buyer_id: 'b1',
  buyer_selection_item_id: 'i1',
  cancelled_at: null,
  visited_at: null,
  buyers: { name: 'Famille Keller', phone: null, email: null, language: 'fr', archived_at: null },
};
const mandateItem = {
  id: 'i1',
  selection_id: 's1',
  source: 'project',
  reference: 'p1',
  removed_at: null,
};

// Demain, à Paris.
const tomorrow = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(
    new Date(Date.now() + 86_400_000),
  );

beforeEach(() => {
  service.reset();
  state.profile = advisor;
  state.visit = liveVisit;
  state.item = mandateItem;
  state.projectLink = null;
  state.signed = true;
  state.readFails = false;
  state.open = true;
  state.outsideLink = null;
});

describe('« Confirmer la visite »', () => {
  it('refusé sans session, à un membre retiré, sur un identifiant douteux, une visite annulée ou d’un acquéreur archivé', async () => {
    const { confirmVisit } = await import('@/features/buyer-presentation/actions/confirm-visit');
    state.profile = null;
    expect((await confirmVisit(VISIT, tomorrow(), '10:00')).ok).toBe(false);
    state.profile = { ...advisor, removed_at: '2026-10-01T00:00:00Z' };
    expect((await confirmVisit(VISIT, tomorrow(), '10:00')).ok).toBe(false);
    state.profile = advisor;
    expect((await confirmVisit('pas-un-uuid', tomorrow(), '10:00')).ok).toBe(false);
    state.visit = { ...liveVisit, cancelled_at: '2026-11-01T00:00:00Z' };
    expect((await confirmVisit(VISIT, tomorrow(), '10:00')).ok).toBe(false);
    state.visit = {
      ...liveVisit,
      buyers: { ...liveVisit.buyers, archived_at: '2026-11-01T00:00:00Z' },
    };
    expect((await confirmVisit(VISIT, tomorrow(), '10:00')).ok).toBe(false);
    expect(service.writes()).toEqual([]);
  });

  it('un jour mal saisi n’écrit rien', async () => {
    const { confirmVisit } = await import('@/features/buyer-presentation/actions/confirm-visit');
    expect(await confirmVisit(VISIT, '14/11', '10:00')).toEqual({
      ok: false,
      error: 'Indiquez le jour et l’heure de la visite.',
    });
    expect(service.writes()).toEqual([]);
  });

  it('sans lien collé sur le mandat : la sélection seule', async () => {
    const { confirmVisit } = await import('@/features/buyer-presentation/actions/confirm-visit');
    const result = await confirmVisit(VISIT, tomorrow(), '10:30');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.message).toContain('Votre sélection : https://x.test/dossier/abc');
    expect(result.message).not.toContain('Vivre ici');
    expect(result.message).not.toContain('ce qui l’entoure');
    expect(service.writes()).toEqual(['update buyer_visit_requests']);
  });

  it('avec le lien collé sur le mandat : « Vivre ici, autour du bien », en français et en anglais', async () => {
    const { confirmVisit } = await import('@/features/buyer-presentation/actions/confirm-visit');
    state.projectLink = 'https://app.myacademia.ai/l/v3k9-2mq7.8f2c1a9e4b7d';
    const fr = await confirmVisit(VISIT, tomorrow(), '10:30');
    expect(fr.ok && fr.message).toContain(
      'Vivre ici, autour du bien : https://app.myacademia.ai/l/v3k9-2mq7.8f2c1a9e4b7d',
    );
    state.visit = { ...liveVisit, buyers: { ...liveVisit.buyers, language: 'en' } };
    const en = await confirmVisit(VISIT, tomorrow(), '10:30');
    expect(en.ok && en.message).toContain(
      'Living here, around the property: https://app.myacademia.ai/l/v3k9-2mq7.8f2c1a9e4b7d',
    );
    expect(en.ok && en.message).toContain('Your selection: https://x.test/dossier/abc');
  });

  it('un lien d’un autre site en base ne part jamais ; une annonce du marché sans lien collé n’en a pas', async () => {
    const { confirmVisit } = await import('@/features/buyer-presentation/actions/confirm-visit');
    state.projectLink = 'https://evil.test/l/x';
    const strange = await confirmVisit(VISIT, tomorrow(), '10:30');
    expect(strange.ok && strange.message).not.toContain('evil.test');
    state.projectLink = 'https://app.myacademia.ai/l/abc';
    state.item = { ...mandateItem, source: 'listing', reference: 'seloger:1' };
    service.reset();
    const listing = await confirmVisit(VISIT, tomorrow(), '10:30');
    expect(listing.ok && listing.message).not.toContain('myacademia');
    expect(
      service.calls.some((call) => call.method === 'from' && call.args[0] === 'projects'),
    ).toBe(false);
  });
});

describe('« Confirmer la visite » : le lien Academia, sur preuve', () => {
  it('un mandat qui n’est pas signé (un vendeur à relancer) : la sélection seule', async () => {
    const { confirmVisit } = await import('@/features/buyer-presentation/actions/confirm-visit');
    state.projectLink = 'https://app.myacademia.ai/l/abc';
    state.signed = false;
    const result = await confirmVisit(VISIT, tomorrow(), '10:30');
    expect(result.ok && result.message).not.toContain('myacademia');
  });

  it('le lien illisible ne bloque pas la visite : l’écran le dit, rien n’est écrit, puis « sans le lien »', async () => {
    const { confirmVisit } = await import('@/features/buyer-presentation/actions/confirm-visit');
    const { reportServerError } = await import('@/lib/app-errors/report-server-error');
    state.projectLink = 'https://app.myacademia.ai/l/abc';
    state.readFails = true;
    expect(await confirmVisit(VISIT, tomorrow(), '10:30')).toEqual({
      ok: false,
      error:
        'Le lien « Vivre ici » du bien n’a pas pu être lu. Réessayez, ou préparez le message sans lui.',
      livingHereUnread: true,
    });
    expect(service.writes()).toEqual([]);
    expect(reportServerError).toHaveBeenCalled();
    // « Préparer le message sans le lien » : la lecture n'est pas refaite, le message part sans lui.
    service.reset();
    const without = await confirmVisit(VISIT, tomorrow(), '10:30', true);
    expect(without.ok).toBe(true);
    expect(without.ok && without.message).toContain('Votre sélection : https://x.test/dossier/abc');
    expect(without.ok && without.message).not.toContain('Vivre ici');
    expect(
      service.calls.some((call) => call.method === 'from' && call.args[0] === 'projects'),
    ).toBe(false);
    expect(service.writes()).toEqual(['update buyer_visit_requests']);
    // « Réessayer » : la lecture revenue, le lien est dans le message.
    state.readFails = false;
    const retried = await confirmVisit(VISIT, tomorrow(), '10:30');
    expect(retried.ok && retried.message).toContain(
      'Vivre ici, autour du bien : https://app.myacademia.ai/l/abc',
    );
  });
});

describe('le jour de la visite', () => {
  const now = new Date('2026-11-07T10:00:00Z');
  it('saisi à Paris, dit dans sa langue ; jamais dans le passé ni à plus d’un an', () => {
    const moment = visitMoment('2026-11-14', '10:30', now);
    expect(moment.ok).toBe(true);
    if (!moment.ok) return;
    expect(moment.at).toBe('2026-11-14T09:30:00.000Z');
    expect(moment.day('fr')).toBe('samedi 14 novembre');
    expect(moment.time('fr')).toBe('10 h 30');
    expect(moment.day('en')).toBe('Saturday 14 November');
    expect(moment.time('en')).toBe('10:30 am');
    expect(visitMoment('2026-11-01', '10:30', now).ok).toBe(false);
    expect(visitMoment('2028-11-14', '10:30', now).ok).toBe(false);
    expect(visitMoment('2026-02-30', '10:30', now).ok).toBe(false);
    expect(visitMoment('2026-11-14', '25:00', now).ok).toBe(false);
  });
});

// Mission 156 — le lien « Vivre ici » d'un bien HORS MANDAT, collé sur le dossier acquéreur : dans
// le message (planche A3-2), avec la ligne d'information au-dessus des boutons de partage et l'âge
// du lien ; jamais en production avant le texte A3 de `/confidentialite` (l'interrupteur).
describe('« Confirmer la visite » d’un bien hors mandat', () => {
  const LISTING = 'https://www.seloger.com/annonces/achat/maison/mougins-06/123456789.htm';
  const LINK = 'https://app.myacademia.ai/l/k7Qx2mRv9a';
  const listingItem = { ...mandateItem, source: 'listing', reference: LISTING };
  const key = async () => {
    const { dismissalKey } = await import('@/features/buyer-dismissals/services/dismissal-key');
    return dismissalKey({ source: 'listing', url: LISTING });
  };

  it('le lien collé entre dans le message ; la ligne d’information est demandée', async () => {
    const { confirmVisit } = await import('@/features/buyer-presentation/actions/confirm-visit');
    state.item = listingItem;
    state.outsideLink = {
      property_key: await key(),
      url: LINK,
      pasted_at: new Date().toISOString(),
    };
    const result = await confirmVisit(VISIT, tomorrow(), '10:00');
    expect(result.ok && result.message).toContain(`Vivre ici, autour du bien : ${LINK}`);
    expect(result.ok && result.livingHere).toEqual({
      shared: true,
      ageLine: { tone: 'hint', text: 'Collé aujourd’hui' },
      missing: false,
    });
    // Ni l'adresse de l'annonce ni la clé du bien ne partent dans le message.
    expect(result.ok && result.message).not.toContain('seloger');
  });

  it('un lien collé il y a 34 jours reste dans le message ; l’écran prévient en orange', async () => {
    const { confirmVisit } = await import('@/features/buyer-presentation/actions/confirm-visit');
    state.item = listingItem;
    state.outsideLink = {
      property_key: await key(),
      url: LINK,
      pasted_at: new Date(Date.now() - 34 * 86_400_000).toISOString(),
    };
    const result = await confirmVisit(VISIT, tomorrow(), '10:00');
    expect(result.ok && result.message).toContain(LINK);
    expect(result.ok && result.livingHere.ageLine?.tone).toBe('warn');
  });

  it('sans lien collé : la sélection seule, et « Le coller sur le dossier acquéreur »', async () => {
    const { confirmVisit } = await import('@/features/buyer-presentation/actions/confirm-visit');
    state.item = listingItem;
    const result = await confirmVisit(VISIT, tomorrow(), '10:00');
    expect(result.ok && result.message).not.toContain('Vivre ici');
    expect(result.ok && result.livingHere).toEqual({ shared: false, ageLine: null, missing: true });
  });

  it('interrupteur éteint (production avant le texte A3) : aucun lien hors mandat lu ni envoyé', async () => {
    const { confirmVisit } = await import('@/features/buyer-presentation/actions/confirm-visit');
    state.open = false;
    state.item = listingItem;
    state.outsideLink = {
      property_key: await key(),
      url: LINK,
      pasted_at: new Date().toISOString(),
    };
    const result = await confirmVisit(VISIT, tomorrow(), '10:00');
    expect(result.ok && result.message).not.toContain('myacademia');
    expect(result.ok && result.livingHere).toEqual({
      shared: false,
      ageLine: null,
      missing: false,
    });
    expect(
      service.calls.some(
        (call) => call.method === 'from' && call.args[0] === 'property_living_here_links',
      ),
    ).toBe(false);
  });

  it('le mandat garde son lien, et son âge vient de sa date ; jamais la ligne d’information', async () => {
    const { confirmVisit } = await import('@/features/buyer-presentation/actions/confirm-visit');
    state.projectLink = 'https://app.myacademia.ai/l/abc';
    const result = await confirmVisit(VISIT, tomorrow(), '10:00');
    expect(result.ok && result.livingHere.shared).toBe(false);
    // Un lien de mandat d'avant la mission n'a pas de date : aucune ligne d'âge.
    expect(result.ok && result.livingHere.ageLine).toBeNull();
  });
});
