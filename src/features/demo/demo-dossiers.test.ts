import { beforeEach, describe, expect, it, vi } from 'vitest';

import { oneMonthAgo } from '@/features/demo/services/demo-seed';
import { fakeSupabase, type FakeCall, type FakeResponse } from '@/test-fixtures/fake-supabase';

// Mission 114 (partie B) — « Préparer ma démo » et « Remettre ma démo à zéro » : réservés à un
// closer de l'agence de démonstration, et la remise à zéro ne touche qu'à SES dossiers marqués.
// Mission 147 (partie B) — en étapes : une lecture en échec n'est jamais une absence, chaque
// suppression lit son erreur, la suppression recompte à zéro, et « prête » se dit sur preuve.
// Les actions sont appelées pour de vrai ; la session, le repère et les clients sont remplacés.

const state = vi.hoisted(() => ({
  demo: true,
  // Mission 155 — le repère relu par `deleteDemoBuyers` elle-même (le second verrou).
  agencyRow: { is_demo: true } as { is_demo: boolean } | null,
  agencyError: false,
  profile: null as Record<string, unknown> | null,
  respond: (() => ({})) as (table: string, calls: FakeCall[]) => FakeResponse,
  reported: [] as string[],
}));
const service = fakeSupabase((calls) => {
  const fromIndex = calls.map((call) => call.method).lastIndexOf('from');
  const table = fromIndex >= 0 ? String(calls[fromIndex]!.args[0]) : '';
  const own = calls.slice(Math.max(fromIndex, 0));
  const methodsOf = own.map((call) => call.method);
  if (
    table === 'agencies' &&
    methodsOf.includes('select') &&
    methodsOf.includes('maybeSingle') &&
    !methodsOf.includes('update')
  ) {
    return state.agencyError ? { error: { message: 'timeout' } } : { data: state.agencyRow };
  }
  return state.respond(table, own);
});

vi.mock('@/features/demo/services/is-demo-agency', () => ({
  isDemoAgency: async () => state.demo,
}));
vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => service.client }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({}) }));
vi.mock('@/lib/app-errors/report-server-error', () => ({
  reportServerError: async (scope: string) => {
    state.reported.push(scope);
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT ${path}`);
  },
}));

const AGENCY = '11111111-1111-4111-8111-111111111111';
const closer = { id: 'u-closer', agency_id: AGENCY, role: 'advisor', removed_at: null };
const CLOSER = { id: 'u-closer', agencyId: AGENCY };
const methods = (calls: FakeCall[]) => calls.map((call) => call.method);
const isDelete = (calls: FakeCall[]) => methods(calls).includes('delete');
const isCount = (calls: FakeCall[]) =>
  calls.some(
    (call) => call.method === 'select' && JSON.stringify(call.args[1] ?? {}).includes('head'),
  );
// Mission 155 — douze dossiers, dont huit mandats signés.
const SIX = [
  'to_prepare',
  'ready',
  'direct',
  ...Array.from({ length: 8 }, () => 'signed'),
  'follow_up',
];

beforeEach(() => {
  service.reset();
  state.demo = true;
  state.agencyRow = { is_demo: true };
  state.agencyError = false;
  state.profile = closer;
  state.reported = [];
  state.respond = () => ({ data: [] });
});

describe('qui peut préparer ou remettre à zéro', () => {
  // Mission 155 — la remise à zéro supprime toutes les fiches acquéreur de l'agence : ce refus,
  // au serveur, est ce qui la garde hors de toute agence qui n'est pas de démonstration.
  it('hors de l’agence de démonstration : renvoyé vers ses dossiers, sans rien écrire', async () => {
    const actions = await import('@/features/demo/actions/demo-setup');
    state.demo = false;
    await expect(actions.startDemoSetup('prepare')).rejects.toThrow('REDIRECT /builder');
    await expect(actions.startDemoSetup('reset')).rejects.toThrow('REDIRECT /builder');
    await expect(actions.seedDemoProjectStep('ready', new Date().toISOString())).rejects.toThrow(
      'REDIRECT /builder',
    );
    await expect(actions.seedDemoBuyersStep(new Date().toISOString())).rejects.toThrow(
      'REDIRECT /builder',
    );
    await expect(actions.verifyDemoSetup()).rejects.toThrow('REDIRECT /builder');
    await expect(
      actions.seedDemoProjectsStep(
        ['to_prepare', 'ready', 'direct', 'signed', 'signed_vence', 'signed_antibes'],
        new Date().toISOString(),
      ),
    ).rejects.toThrow('REDIRECT /builder');
    expect(service.writes()).toEqual([]);
  });

  it('sans session, ou membre retiré : vers l’ouverture d’agence, sans rien écrire', async () => {
    const { startDemoSetup } = await import('@/features/demo/actions/demo-setup');
    for (const profile of [null, { ...closer, removed_at: '2026-10-01T00:00:00Z' }]) {
      state.profile = profile;
      await expect(startDemoSetup('reset')).rejects.toThrow('REDIRECT /onboarding');
    }
    expect(service.writes()).toEqual([]);
  });

  it('une demande inconnue, un dossier inconnu ou un « maintenant » périmé : refusés, rien d’écrit', async () => {
    const actions = await import('@/features/demo/actions/demo-setup');
    expect(await actions.startDemoSetup('tout')).toMatchObject({ ok: false });
    expect(await actions.seedDemoProjectStep('villa', new Date().toISOString())).toMatchObject({
      ok: false,
    });
    const stale = new Date(Date.now() - 20 * 60_000).toISOString();
    expect(await actions.seedDemoProjectStep('ready', stale)).toMatchObject({ ok: false });
    expect(await actions.seedDemoBuyersStep('hier')).toMatchObject({ ok: false });
    // Mission 155 — seul un groupe connu, dans son ordre.
    for (const keys of [['ready', 'to_prepare'], ['signed', 'villa'], 'signed', []]) {
      expect(await actions.seedDemoProjectsStep(keys, new Date().toISOString())).toMatchObject({
        ok: false,
      });
    }
    expect(service.writes()).toEqual([]);
  });
});

describe('la première étape : supprimer, recompter à zéro, préparer l’agence', () => {
  it('une lecture en échec n’est jamais « aucun dossier » : rien n’est supprimé ni semé', async () => {
    const { startDemoSetup } = await import('@/features/demo/actions/demo-setup');
    state.respond = (table) =>
      table === 'projects' ? { data: null, error: { message: 'timeout' } } : { data: [] };
    for (const mode of ['prepare', 'reset']) {
      expect(await startDemoSetup(mode)).toEqual({
        ok: false,
        error: 'Vos dossiers de démo n’ont pas pu être lus : rechargez la page.',
      });
    }
    expect(service.writes()).toEqual([]);
  });

  it('une suppression en échec arrête tout et le dit : rien n’est semé', async () => {
    const { startDemoSetup } = await import('@/features/demo/actions/demo-setup');
    state.respond = (table, calls) =>
      table === 'projects' && !isDelete(calls)
        ? { data: [{ id: 'p1' }] }
        : table === 'comparables' && isDelete(calls)
          ? { error: { message: 'refusé' } }
          : { data: [] };
    const result = await startDemoSetup('reset');
    expect(result).toMatchObject({ ok: false });
    expect(!result.ok && result.error).toContain('n’ont pas pu être supprimés');
    expect(service.writes()).not.toContain('delete projects');
    expect(service.writes().some((write) => write.startsWith('insert'))).toBe(false);
    expect(state.reported).toContain('demoReset.delete');
  });

  it('des dossiers restés après la suppression (une autre remise à zéro) : rien n’est semé', async () => {
    const { startDemoSetup } = await import('@/features/demo/actions/demo-setup');
    let deleted = false;
    state.respond = (table, calls) => {
      if (isDelete(calls)) {
        if (table === 'projects') deleted = true;
        return { data: [] };
      }
      if (table === 'projects') {
        return deleted ? { data: [{ demo_stage: 'ready' }] } : { data: [{ id: 'p1' }] };
      }
      if (table === 'buyers' && isCount(calls)) return { count: 0 };
      return { data: [] };
    };
    const result = await startDemoSetup('reset');
    expect(!result.ok && result.error).toContain('1 dossier(s) et 0 acquéreur(s)');
    expect(service.writes().some((write) => write.startsWith('insert'))).toBe(false);
    expect(service.writes()).not.toContain('update agencies');
  });

  it('tout supprimé et recompté à zéro : l’agence est préparée et le « maintenant » rendu', async () => {
    const { startDemoSetup } = await import('@/features/demo/actions/demo-setup');
    state.respond = (table, calls) =>
      table === 'buyers' && isCount(calls)
        ? { count: 0 }
        : table === 'profiles'
          ? { data: { phone: '06 12 34 56 78' } }
          : table === 'agency_branding' && !methods(calls).includes('update')
            ? { data: { logo_light_path: 'x/logo-light.png', logo_dark_path: null } }
            : { data: [] };
    const result = await startDemoSetup('reset');
    expect(result).toMatchObject({ ok: true, now: expect.any(String) });
    // L'adresse, puis la carte professionnelle si l'agence n'en a pas ou garde le premier numéro
    // inventé (M155) ; jamais celle d'un manager.
    expect(service.writes()).toEqual([
      'delete buyers',
      'delete property_living_here_links',
      'update agencies',
      'update agency_branding',
      'update agency_branding',
      'update agency_branding',
    ]);
    expect(
      service.calls.some((call) => call.method === 'is' && call.args[0] === 'professional_card'),
    ).toBe(true);
  });
});

describe('une étape en échec arrête tout et le dit', () => {
  it('un dossier qui ne s’écrit pas : son nom dans le message, jamais « prête »', async () => {
    const { seedDemoProjectStep } = await import('@/features/demo/actions/demo-setup');
    state.respond = (table, calls) =>
      table === 'projects' && methods(calls).includes('insert')
        ? { error: { message: 'refusé' } }
        : { data: [] };
    expect(await seedDemoProjectStep('ready', new Date().toISOString())).toEqual({
      ok: false,
      error:
        'La remise à zéro n’a pas abouti : le dossier de Mme Garcia, prêt pour le Live n’a pas pu être créé. Rien n’est prêt.',
    });
    expect(state.reported).toContain('demoReset.dossier');
    // En « Préparer », le même échec dit « La préparation de la démo ».
    const prepared = await seedDemoProjectStep('ready', new Date().toISOString(), 'prepare');
    expect(!prepared.ok && prepared.error).toMatch(/^La préparation de la démo n’a pas abouti : /);
  });

  it('les acquéreurs : le mandat de Mougins absent, en double ou illisible, rien n’est semé', async () => {
    const { seedDemoBuyersStep } = await import('@/features/demo/actions/demo-setup');
    const now = new Date().toISOString();
    // Mission 155 — chaque mandat est retrouvé par sa marque ET son vendeur, une fois.
    const mougins = { id: 'm1', seller_name: 'M. Lefebvre' };
    for (const [answer, words] of [
      [{ data: [] }, 'mandat signé de Mougins est introuvable'],
      [
        { data: [{ id: 'm9', seller_name: 'Mme Ferrand' }] },
        'mandat signé de Mougins est introuvable',
      ],
      [{ data: [mougins, { ...mougins, id: 'm2' }] }, 'un mandat signé est en double'],
    ] as const) {
      state.respond = (table) => (table === 'projects' ? answer : { data: [] });
      const result = await seedDemoBuyersStep(now);
      expect(!result.ok && result.error).toContain(words);
    }
    state.respond = (table) =>
      table === 'projects' ? { error: { message: 'timeout' } } : { data: [] };
    expect(await seedDemoBuyersStep(now)).toEqual({
      ok: false,
      error: 'Vos dossiers de démo n’ont pas pu être lus : rechargez la page.',
    });
    expect(service.writes()).toEqual([]);
  });

  it('les acquéreurs qui ne s’écrivent pas : le message le dit', async () => {
    const { seedDemoBuyersStep } = await import('@/features/demo/actions/demo-setup');
    state.respond = (table, calls) =>
      table === 'projects'
        ? { data: [{ id: 'm1', seller_name: 'M. Lefebvre' }] }
        : table === 'buyers' && methods(calls).includes('insert')
          ? { error: { message: 'refusé' } }
          : { data: [] };
    const result = await seedDemoBuyersStep(new Date().toISOString());
    expect(!result.ok && result.error).toContain('les acquéreurs n’ont pas pu être créés');
    expect(state.reported).toContain('demoReset.buyers');
  });
});

describe('le logo et le téléphone de la démo (mission 147)', () => {
  it('sans logo, les deux versions sont déposées et enregistrées', async () => {
    const { prepareDemoAgency } = await import('@/features/demo/services/demo-dossiers');
    state.respond = (table, calls) =>
      table === 'profiles'
        ? { data: { phone: '06 12 34 56 78' } }
        : table === 'agency_branding' && methods(calls).includes('maybeSingle')
          ? { data: { logo_light_path: null, logo_dark_path: null } }
          : { data: [] };
    expect(await prepareDemoAgency(service.client as never, CLOSER)).toBe(true);
    const uploads = service.calls.filter((call) => call.method === 'upload');
    expect(uploads.map((call) => call.args[0])).toEqual([
      `${AGENCY}/logo-light.svg`,
      `${AGENCY}/logo-dark.svg`,
    ]);
    for (const upload of uploads) {
      const svg = new TextDecoder().decode(upload.args[1] as Uint8Array);
      expect(svg).toContain('<svg');
      // Tracé en chemins : aucune police, aucun texte à rendre.
      expect(svg).not.toContain('<text');
      expect(svg).not.toMatch(/d[ée]mo/i);
    }
    const saved = service.calls.find(
      (call, index) =>
        call.method === 'update' &&
        service.calls
          .slice(0, index)
          .reverse()
          .find((c) => c.method === 'from')?.args[0] === 'agency_branding' &&
        'logo_light_path' in (call.args[0] as object),
    );
    expect(saved?.args[0]).toEqual({
      logo_light_path: `${AGENCY}/logo-light.svg`,
      logo_dark_path: `${AGENCY}/logo-dark.svg`,
    });
  });

  it('le logo d’un manager n’est jamais remplacé, même une seule version', async () => {
    const { prepareDemoAgency } = await import('@/features/demo/services/demo-dossiers');
    state.respond = (table, calls) =>
      table === 'profiles'
        ? { data: { phone: '06 12 34 56 78' } }
        : table === 'agency_branding' && methods(calls).includes('maybeSingle')
          ? { data: { logo_light_path: null, logo_dark_path: `${AGENCY}/logo-dark.png` } }
          : { data: [] };
    expect(await prepareDemoAgency(service.client as never, CLOSER)).toBe(true);
    expect(service.calls.some((call) => call.method === 'upload')).toBe(false);
  });

  // Mission 155 — la carte professionnelle de la démo : visiblement fictive, aucun chiffre qui
  // pourrait désigner un confrère (Jean-Guy, 13/11).
  it('la carte professionnelle inventée n’a que des zéros', async () => {
    const { DEMO_PROFESSIONAL_CARD } = await import('@/features/demo/data/demo-legal-identity');
    expect(DEMO_PROFESSIONAL_CARD.professional_card.replace(/\D/g, '')).toMatch(/^0+$/);
  });

  it('le téléphone du closer : posé s’il est vide ou vaut l’ancien numéro, jamais sinon', async () => {
    const { replacesCloserPhone, DEMO_CLOSER_PHONE } =
      await import('@/features/demo/services/demo-dossiers');
    expect(DEMO_CLOSER_PHONE).toBe('06 39 98 00 01');
    expect(replacesCloserPhone(null)).toBe(true);
    expect(replacesCloserPhone('  ')).toBe(true);
    expect(replacesCloserPhone('06 00 00 00 01')).toBe(true);
    expect(replacesCloserPhone('0600000001')).toBe(true);
    expect(replacesCloserPhone('06 12 34 56 78')).toBe(false);
    expect(replacesCloserPhone('06 39 98 00 01')).toBe(false);
  });
});

describe('la vérification : « prête » seulement sur preuve', () => {
  const answer = (stages: string[], buyers: number) => (table: string, calls: FakeCall[]) =>
    table === 'projects'
      ? { data: stages.map((demo_stage) => ({ demo_stage })) }
      : table === 'buyers' && isCount(calls)
        ? { count: buyers }
        : { data: [] };

  it('douze dossiers, un par étape attendue, et neuf acquéreurs : prête', async () => {
    const { verifyDemoSetup } = await import('@/features/demo/actions/demo-setup');
    state.respond = answer(SIX, 9);
    expect(await verifyDemoSetup()).toEqual({ ok: true });
    expect(service.writes()).toEqual([]);
  });

  it('onze dossiers : « 11 dossiers sur 12 », ce qui manque, jamais « prête »', async () => {
    const { verifyDemoSetup } = await import('@/features/demo/actions/demo-setup');
    state.respond = answer(
      SIX.filter((stage) => stage !== 'direct'),
      9,
    );
    expect(await verifyDemoSetup()).toEqual({
      ok: false,
      error:
        'La remise à zéro n’a pas abouti : 11 dossiers sur 12 (il manque « Prêt, en présentation directe »). Rien n’est prêt.',
    });
    expect(state.reported).toContain('demoReset.verify');
  });

  it('vingt-quatre dossiers : deux remises à zéro en même temps, et le message le dit', async () => {
    const { verifyDemoSetup } = await import('@/features/demo/actions/demo-setup');
    state.respond = answer([...SIX, ...SIX], 18);
    const result = await verifyDemoSetup();
    expect(!result.ok && result.error).toContain('24 dossiers au lieu de 12');
    expect(!result.ok && result.error).toContain('18 acquéreurs au lieu de 9');
    expect(!result.ok && result.error).toContain('lancée en même temps');
  });

  it('une lecture en échec : jamais « prête »', async () => {
    const { verifyDemoSetup } = await import('@/features/demo/actions/demo-setup');
    state.respond = (table) =>
      table === 'buyers'
        ? { error: { message: 'timeout' } }
        : { data: SIX.map((s) => ({ demo_stage: s })) };
    expect(await verifyDemoSetup()).toMatchObject({ ok: false });
  });
});

describe('la remise à zéro ne touche qu’aux dossiers de démo du closer connecté', () => {
  it('lit ses dossiers marqués, dans son agence, et supprime ce qui en dépend', async () => {
    const { deleteDemoDossiers } = await import('@/features/demo/services/demo-dossiers');
    state.respond = (table) =>
      table === 'projects'
        ? { data: [{ id: 'p1' }, { id: 'p2' }] }
        : table === 'subject_properties'
          ? { data: [{ id: 'sp1', photo_urls: [`${AGENCY}/p1/property/a.jpg`] }] }
          : { data: [] };
    expect(await deleteDemoDossiers(service.client as never, CLOSER)).toBe(true);
    // Le périmètre : SON identifiant, SON agence, la marque.
    const scoped = service.calls.filter(
      (call) =>
        call.method === 'eq' && call.args[0] === 'advisor_id' && call.args[1] === 'u-closer',
    );
    expect(scoped.length).toBeGreaterThanOrEqual(2);
    expect(
      service.calls.some(
        (call) => call.method === 'not' && call.args[0] === 'demo_stage' && call.args[2] === null,
      ),
    ).toBe(true);
    expect(
      service.calls.every(
        (call) => call.method !== 'eq' || call.args[0] !== 'agency_id' || call.args[1] === AGENCY,
      ),
    ).toBe(true);
    // Les photos déposées partent du stockage ; les dépendances puis les dossiers sont supprimés.
    expect(service.calls.find((call) => call.method === 'remove')?.args[0]).toEqual([
      `${AGENCY}/p1/property/a.jpg`,
    ]);
    const deleted = service.writes().filter((write) => write.startsWith('delete '));
    expect(deleted).toContain('delete comparables');
    expect(deleted).toContain('delete subject_properties');
    expect(deleted).toContain('delete project_meeting_conclusions');
    expect(deleted[deleted.length - 1]).toBe('delete projects');
    // Jamais une table hors de la liste (ni les oppositions de l'agence, communes à tous).
    expect(deleted).not.toContain('delete prospecting_oppositions');
  });

  it('sans dossier marqué, rien n’est supprimé', async () => {
    const { deleteDemoDossiers } = await import('@/features/demo/services/demo-dossiers');
    expect(await deleteDemoDossiers(service.client as never, CLOSER)).toBe(true);
    expect(service.writes()).toEqual([]);
  });

  it('une suppression en échec s’arrête là : faux, et les dossiers ne sont pas supprimés', async () => {
    const { deleteDemoDossiers } = await import('@/features/demo/services/demo-dossiers');
    state.respond = (table, calls) =>
      table === 'projects'
        ? { data: [{ id: 'p1' }] }
        : table === 'live_seller_responses' && isDelete(calls)
          ? { error: { message: 'refusé' } }
          : { data: [] };
    expect(await deleteDemoDossiers(service.client as never, CLOSER)).toBe(false);
    expect(service.writes()).not.toContain('delete projects');
  });
});

// Mission 117 — les acquéreurs de la démo vont et viennent avec les dossiers : semés par
// « Préparer ma démo », retirés par la remise à zéro, dans le seul périmètre du closer.
describe('les acquéreurs de la démo', () => {
  // Mission 155 — toutes les fiches de l'agence de démonstration, marquées ou non (décision de
  // Jean-Guy, 13/11) ; jamais hors de cette agence (le garde : « qui peut préparer ou remettre à
  // zéro », plus haut, refuse toute agence qui n'est pas de démonstration, sans rien écrire).
  it('la remise à zéro retire toutes les fiches de SON agence, marquées ou non, et rien d’autre', async () => {
    const { deleteDemoBuyers } = await import('@/features/demo/services/demo-dossiers');
    state.respond = (table) =>
      table === 'buyers' ? { data: [{ id: 'b1' }, { id: 'b2' }] } : { data: [] };
    expect(await deleteDemoBuyers(service.client as never, CLOSER)).toBe(true);
    // Mission 156 — et les liens « Vivre ici » collés dans l'agence de démonstration.
    expect(service.writes()).toEqual(['delete buyers', 'delete property_living_here_links']);
    const living = service.calls.findIndex(
      (call) => call.method === 'from' && call.args[0] === 'property_living_here_links',
    );
    expect(service.calls.slice(living, living + 3)).toContainEqual({
      method: 'eq',
      args: ['agency_id', AGENCY],
    });
    // Les filtres de la suppression des fiches : de son `from('buyers')` à la suivante.
    const deletion = service.calls.findIndex((call) => call.method === 'delete');
    const from = service.calls
      .slice(0, deletion)
      .map((call) => call.method)
      .lastIndexOf('from');
    const next = service.calls.findIndex(
      (call, index) => index > deletion && call.method === 'from',
    );
    const filters = service.calls
      .slice(from, next < 0 ? undefined : next)
      .filter((call) => call.method === 'eq')
      .map((call) => `${String(call.args[0])}=${String(call.args[1])}`);
    // Le repère de l'agence relu d'abord (le second verrou).
    expect(service.calls.find((call) => call.method === 'from')?.args[0]).toBe('agencies');
    expect(filters).toEqual([`agency_id=${AGENCY}`]);
  });

  // Le second verrou (Jean-Guy, 13/11) : la fonction relit le repère elle-même.
  it('hors d’une agence de démonstration, ou repère illisible : faux, rien n’est supprimé', async () => {
    const { deleteDemoBuyers } = await import('@/features/demo/services/demo-dossiers');
    state.respond = (table) =>
      table === 'buyers' ? { data: [{ id: 'b1' }, { id: 'b2' }] } : { data: [] };
    for (const setup of [
      () => (state.agencyRow = { is_demo: false }),
      () => (state.agencyRow = null),
      () => (state.agencyError = true),
    ]) {
      service.reset();
      state.agencyRow = { is_demo: true };
      state.agencyError = false;
      setup();
      expect(await deleteDemoBuyers(service.client as never, CLOSER)).toBe(false);
      expect(service.writes()).toEqual([]);
      // Rien n'est lu des fiches non plus : la relecture du repère vient d'abord.
      expect(
        service.calls.some((call) => call.method === 'from' && call.args[0] === 'buyers'),
      ).toBe(false);
    }
  });

  it('une lecture des acquéreurs en échec : faux, rien n’est supprimé', async () => {
    const { deleteDemoBuyers } = await import('@/features/demo/services/demo-dossiers');
    state.respond = (table) =>
      table === 'buyers' ? { error: { message: 'timeout' } } : { data: [] };
    expect(await deleteDemoBuyers(service.client as never, CLOSER)).toBe(false);
    expect(service.writes()).toEqual([]);
  });

  it('la remise à zéro retire les biens démarchés du closer que plus aucune recherche ne vise (M120)', async () => {
    const { deleteDemoBuyers } = await import('@/features/demo/services/demo-dossiers');
    state.respond = (table) =>
      table === 'buyer_prospects'
        ? { data: [{ id: 'p-orphelin' }, { id: 'p-vise' }] }
        : table === 'buyer_prospect_origins'
          ? { data: [{ prospect_id: 'p-vise' }] }
          : { data: [] };
    expect(await deleteDemoBuyers(service.client as never, CLOSER)).toBe(true);
    expect(service.writes()).toEqual([
      'delete buyers',
      'delete property_living_here_links',
      'delete buyer_prospects',
    ]);
    const deletion = service.calls.slice(
      service.calls.map((call) => call.method).lastIndexOf('delete'),
    );
    expect(deletion.find((call) => call.method === 'in')?.args).toEqual(['id', ['p-orphelin']]);
    expect(deletion.find((call) => call.method === 'eq')?.args).toEqual(['agency_id', AGENCY]);
  });

  it('« Préparer ma démo » sème neuf acquéreurs marqués, au closer, dans son agence', async () => {
    const { seedDemoBuyers } = await import('@/features/demo/services/demo-dossiers');
    const now = new Date();
    expect(await seedDemoBuyers(service.client as never, CLOSER, now)).toBe(true);
    expect(service.writes()).toEqual(['insert buyers']);
    const rows = service.calls.find((call) => call.method === 'insert')?.args[0] as Record<
      string,
      unknown
    >[];
    expect(rows).toHaveLength(9);
    for (const row of rows) {
      expect(row).toMatchObject({ agency_id: AGENCY, advisor_id: 'u-closer', demo: true });
      expect(row).not.toHaveProperty('status');
    }
    expect(rows.slice(0, 2).map((row) => row.name)).toEqual(['M. et Mme Rossi', 'Famille Keller']);
    // Mission 132 — cinq financements validés, chacun avec son dernier contact.
    const validated = rows.filter((row) => row.financing === 'validated');
    // Mission 136 — et les Keller, prêts à visiter : la veille cherche pour eux.
    // Mission 145 (partie B) — et les Rossi, pour l'alerte « rentrer le mandat » d'Antibes.
    expect(validated).toHaveLength(7);
    for (const row of validated) expect(row.contacted_at).toEqual(expect.any(String));
    // Mission 133 — chaque ligne porte ses deux dates (une colonne absente d'une seule ligne
    // vaudrait NULL dans l'insertion groupée) ; les fiches de Vence datent de 1 à 7 semaines.
    for (const row of rows) {
      expect(row.created_at).toEqual(expect.any(String));
      expect(row.status_changed_at).toBe(row.created_at);
    }
    const weeks = new Set(
      rows
        .slice(2)
        .map((row) =>
          Math.floor((now.getTime() - Date.parse(row.created_at as string)) / 604_800_000),
        ),
    );
    expect(weeks.size).toBeGreaterThan(3);
  });
});

describe('le mandat signé de la démo, il y a un mois calendaire (mission 130)', () => {
  it('le même jour du mois précédent ; le dernier jour quand il n’existe pas', () => {
    expect(oneMonthAgo(new Date('2026-11-05T10:00:00Z'))).toBe('2026-10-05T10:00:00.000Z');
    expect(oneMonthAgo(new Date('2026-03-31T10:00:00Z'))).toBe('2026-02-28T10:00:00.000Z');
    expect(oneMonthAgo(new Date('2027-01-15T10:00:00Z'))).toBe('2026-12-15T10:00:00.000Z');
  });
});
