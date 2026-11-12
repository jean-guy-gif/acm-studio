import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase, type FakeCall, type FakeResponse } from '@/test-fixtures/fake-supabase';
import { DEMO_NOTES_OUTPUT } from '@/features/demo/data/notes-arnaud';

// Mission 151 — les actions « Depuis mes notes », avec la base et Bedrock SIMULÉS : aucun test
// n'appelle le vrai modèle (décision de Jean-Guy, 12/11 ; seul l'essai manuel qu'il déclenche le
// fait). Ce qui compte : ce que l'action a écrit — et surtout ce qu'elle n'a PAS écrit.

const state = vi.hoisted(() => ({
  profile: null as null | {
    id: string;
    agency_id: string;
    email: string;
    removed_at: string | null;
  },
  isDemo: false,
  respond: (() => ({})) as (calls: FakeCall[]) => FakeResponse,
  answer: null as unknown,
  aiCalls: 0,
  reported: [] as string[],
}));

let fake = fakeSupabase();

vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => fake.client }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/features/demo/services/is-demo-agency', () => ({
  isDemoAgency: async () => state.isDemo,
}));
vi.mock('@/features/demo/services/demo-delay', () => ({ demoDelay: async () => undefined }));
vi.mock('@/features/buyer-notes/services/agency-communes', () => ({
  agencyOfficialCommunes: async () => [
    { nom: 'Vence', code: '06157' },
    { nom: 'Saint-Paul-de-Vence', code: '06128' },
    { nom: 'Tourrettes-sur-Loup', code: '06148' },
  ],
}));
vi.mock('@/lib/app-errors/report-server-error', () => ({
  reportServerError: async (_where: string, error: unknown) => {
    state.reported.push(error instanceof Error ? error.message : String(error));
  },
}));
vi.mock('@/lib/ai/bedrock', () => ({
  aiModel: () => 'eu.anthropic.claude-sonnet-4-6',
  aiConfigured: () => true,
  callStructured: async () => {
    state.aiCalls += 1;
    return state.answer;
  },
}));

const { readBuyerNotes } = await import('@/features/buyer-notes/actions/read-notes');
const { saveBuyerFromNotes, cancelNotesReading } =
  await import('@/features/buyer-notes/actions/save-from-notes');

const NOTES = 'ARNAUD (M. et Mme) 06 39 98 27 14\nMme enceinte → plain-pied\nvisites le samedi';

function notesForm(kind = 'text', text = NOTES, images: Blob[] = []): FormData {
  const form = new FormData();
  form.set('kind', kind);
  form.set('text', text);
  for (const image of images) form.append('images', image);
  return form;
}

// Tout ce que la base a reçu, en un seul texte : pour y chercher une ligne des notes.
const everythingWritten = () => JSON.stringify(fake.calls);

beforeEach(() => {
  state.profile = {
    id: 'u1',
    agency_id: 'agency-a',
    email: 'conseiller@agence.fr',
    removed_at: null,
  };
  state.isDemo = false;
  state.respond = () => ({});
  state.answer = null;
  state.aiCalls = 0;
  state.reported = [];
  process.env.ACM_OPERATOR_EMAILS = 'operateur@exemple.fr';
  fake = fakeSupabase((calls) => state.respond(calls));
});

describe('readBuyerNotes', () => {
  it('reste fermée pour un conseiller : ni budget ni appel', async () => {
    expect(await readBuyerNotes(notesForm())).toEqual({ ok: false, cause: 'closed' });
    expect(fake.writes()).toEqual([]);
    expect(state.aiCalls).toBe(0);
  });

  it('démo : la lecture simulée des Arnaud, sans budget ni appel', async () => {
    state.isDemo = true;
    const result = await readBuyerNotes(notesForm());
    expect(result.ok && result.proposal.values.name).toBe('M. et Mme Arnaud');
    expect(result.ok && result.usageId).toBeNull();
    expect(result.ok && result.proposal.communes.map((check) => check.status)).toEqual([
      'official',
      'official',
      'official',
    ]);
    expect(fake.writes()).toEqual([]);
    expect(state.aiCalls).toBe(0);
  });

  it('opérateur : réserve, lit, règle — et n’écrit rien des notes', async () => {
    state.profile!.email = 'operateur@exemple.fr';
    state.respond = (calls) =>
      calls.at(-1)?.method === 'rpc' && calls.at(-1)?.args[0] === 'reserve_ai_budget'
        ? { data: 'usage-1' }
        : {};
    state.answer = {
      ok: true,
      json: { ...DEMO_NOTES_OUTPUT, cities: ['Vence', 'St-Paul-de-Vence', 'Tourrettes'] },
      model: 'eu.anthropic.claude-sonnet-4-6',
      usage: { input_tokens: 4000, output_tokens: 1200 },
    };
    const result = await readBuyerNotes(notesForm());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.usageId).toBe('usage-1');
    expect(fake.writes()).toEqual(['rpc reserve_ai_budget', 'rpc settle_ai_budget']);
    // Les sources partent vers l'écran…
    expect(result.proposal.sources.name).toBe('ARNAUD (M. et Mme)');
    // … mais rien de ce qui a été lu n'arrive à la base : ni nom, ni téléphone, ni source.
    expect(everythingWritten()).not.toMatch(/Arnaud|ARNAUD|39 98|enceinte|samedi|Jardin/);
    const settle = fake.calls.find((call) => call.args[0] === 'settle_ai_budget');
    expect(settle?.args[1]).toMatchObject({ p_outcome: 'pending', p_personal_mentions_skipped: 2 });
    // La commune lue « St-Paul-de-Vence » est rattachée à son nom officiel ; « Tourrettes » n'est
    // pas devinée.
    expect(result.proposal.values.cities).toEqual(['Vence', 'Saint-Paul-de-Vence']);
    expect(result.proposal.communes.map((check) => check.status)).toEqual([
      'official',
      'corrected',
      'unknown',
    ]);
  });

  it('budget du mois atteint : aucun appel', async () => {
    state.profile!.email = 'operateur@exemple.fr';
    state.respond = () => ({ data: null });
    expect(await readBuyerNotes(notesForm())).toEqual({ ok: false, cause: 'budget_reached' });
    expect(state.aiCalls).toBe(0);
  });

  it('budget illisible : ce n’est pas un budget libre', async () => {
    state.profile!.email = 'operateur@exemple.fr';
    state.respond = () => ({ error: { message: 'panne' } });
    expect(await readBuyerNotes(notesForm())).toEqual({ ok: false, cause: 'budget_unavailable' });
    expect(state.aiCalls).toBe(0);
  });

  it('un échec du fournisseur règle la lecture « échouée » ; le journal n’a que la cause', async () => {
    state.profile!.email = 'operateur@exemple.fr';
    state.respond = (calls) =>
      calls.at(-1)?.args[0] === 'reserve_ai_budget' ? { data: 'usage-2' } : {};
    state.answer = {
      ok: false,
      cause: 'invalid_output',
      model: 'm',
      usage: { input_tokens: 10, output_tokens: 10 },
    };
    expect(await readBuyerNotes(notesForm())).toEqual({ ok: false, cause: 'unreadable' });
    const settle = fake.calls.find((call) => call.args[0] === 'settle_ai_budget');
    expect(settle?.args[1]).toMatchObject({ p_outcome: 'failed' });
    expect(state.reported).toEqual(['lecture des notes : invalid_output']);
  });

  it('une photo HEIC est refusée avant tout, avec sa consigne', async () => {
    state.profile!.email = 'operateur@exemple.fr';
    const heic = new Blob([
      new Uint8Array([0, 0, 0, 24, ...[...'ftypheic'].map((c) => c.charCodeAt(0))]),
    ]);
    expect(await readBuyerNotes(notesForm('photo', '', [heic]))).toEqual({
      ok: false,
      cause: 'unsupported_file',
      heic: true,
    });
    expect(fake.writes()).toEqual([]);
  });
});

describe('saveBuyerFromNotes', () => {
  function proposalForm(): FormData {
    const form = new FormData();
    form.set('name', 'M. et Mme Arnaud');
    form.set('phone', '06 39 98 27 14');
    form.set('cities', 'Vence, Saint-Paul-de-Vence');
    form.append('cities_add', 'Tourrettes-sur-Loup');
    form.append('property_types', 'house');
    form.set('budget_max', '750000');
    form.set('outdoor', 'yes');
    form.append('must_have', 'outdoor');
    form.set('financing', 'validated');
    form.set(
      'soft_criteria',
      JSON.stringify([
        { key: 'calme', words: 'AU CALME — pas de route' },
        { key: 'inventé', words: 'x' },
      ]),
    );
    for (const name of ['name', 'cities', 'budget_max', 'sources'])
      form.append('fields_to_verify', name);
    form.set('usage_id', 'usage-1');
    // Même si l'écran les envoyait, les sources ne s'écrivent pas.
    form.set('sources', JSON.stringify([{ field: 'name', quote: 'ARNAUD (M. et Mme)' }]));
    form.set('source_name', 'ARNAUD (M. et Mme)');
    return form;
  }

  it('crée la fiche : champs relus, critères doux filtrés, financement daté, sources jamais écrites', async () => {
    state.respond = (calls) =>
      calls.some((call) => call.method === 'insert') ? { data: { id: 'b-1' } } : {};
    const result = await saveBuyerFromNotes(proposalForm());
    expect(result).toEqual({ ok: true, buyerId: 'b-1' });
    expect(fake.writes()).toEqual(['insert buyers', 'update ai_usage']);
    const insert = fake.calls.find((call) => call.method === 'insert')?.args[0] as Record<
      string,
      unknown
    >;
    expect(insert).toMatchObject({
      name: 'M. et Mme Arnaud',
      cities: ['Vence', 'Saint-Paul-de-Vence', 'Tourrettes-sur-Loup'],
      budget_max: 750000,
      must_have: ['outdoor'],
      financing: 'validated',
      soft_criteria: [{ key: 'calme', words: 'AU CALME — pas de route' }],
      fields_to_verify: ['name', 'cities', 'budget_max'],
      agency_id: 'agency-a',
      advisor_id: 'u1',
    });
    expect(everythingWritten()).not.toContain('ARNAUD (M. et Mme)');
    const close = fake.calls.find((call) => call.method === 'update')?.args[0];
    expect(close).toMatchObject({ outcome: 'created', buyer_id: 'b-1' });
  });

  it('« Compléter » : une fiche d’une autre agence ou archivée n’est pas touchée', async () => {
    const form = proposalForm();
    form.set('buyer_id', 'b-autre');
    state.respond = () => ({ data: null });
    expect(await saveBuyerFromNotes(form)).toEqual({
      ok: false,
      error: 'Cette fiche acquéreur n’existe plus.',
    });
    expect(fake.writes()).toEqual([]);
    const filters = fake.calls.filter((call) => call.method === 'eq').map((call) => call.args);
    expect(filters).toEqual(expect.arrayContaining([['agency_id', 'agency-a']]));
    expect(fake.calls.some((call) => call.method === 'is' && call.args[0] === 'archived_at')).toBe(
      true,
    );
  });

  it('« Compléter » n’écrit que les champs validés : la modification d’un collègue reste', async () => {
    // La fiche telle qu'elle est EN BASE au moment d'enregistrer : un collègue vient d'y changer
    // l'e-mail et les notes pendant que le conseiller vérifiait la proposition.
    const row = {
      id: 'b-1',
      agency_id: 'agency-a',
      advisor_id: 'u2',
      created_at: '2026-11-01T09:00:00Z',
      updated_at: '2026-11-12T10:05:00Z',
      archived_at: null,
      status: 'searching',
      status_changed_at: '2026-11-01T09:00:00Z',
      demo: false,
      ignored_suggestions: [],
      financing: 'unknown',
      financing_changed_at: null,
      contacted_at: null,
      language: 'fr',
      name: 'M. et Mme Arnaud',
      phone: null,
      email: 'nouvel.email@example.com',
      purpose: null,
      timeline: null,
      notes: 'Changé par un collègue à 10 h 05',
      property_types: ['house'],
      cities: ['Vence'],
      budget_ideal: null,
      budget_max: 650000,
      rooms_min: null,
      bedrooms_min: null,
      surface_min: '120.00',
      outdoor: null,
      parking: null,
      pool: true,
      floor_min: null,
      elevator: null,
      energy_rating_max: null,
      works_accepted: null,
      must_have: ['pool'],
      deal_breakers: null,
      condominium_accepted: null,
      condominium_must_have: false,
      soft_criteria: [{ key: 'vue', words: 'une vue' }],
      fields_to_verify: ['email'],
    };
    state.respond = (calls) => (calls.at(-1)?.method === 'maybeSingle' ? { data: row } : {});
    // L'écran n'envoie que ce que le conseiller a coché : le téléphone, une ★ et un critère doux.
    const form = new FormData();
    form.set('buyer_id', 'b-1');
    form.set('usage_id', 'usage-1');
    form.set('phone', '06 39 98 27 14');
    form.set('outdoor', 'yes');
    form.append('must_have', 'outdoor');
    form.set('soft_criteria', JSON.stringify([{ key: 'calme', words: 'AU CALME' }]));
    for (const name of ['phone', 'must_have', 'soft_criteria'])
      form.append('fields_to_verify', name);
    expect(await saveBuyerFromNotes(form)).toEqual({ ok: true, buyerId: 'b-1' });
    const update = fake.calls.find((call) => call.method === 'update')?.args[0] as Record<
      string,
      unknown
    >;
    expect(Object.keys(update).sort()).toEqual([
      'fields_to_verify',
      'must_have',
      'outdoor',
      'phone',
      'soft_criteria',
      'updated_at',
    ]);
    expect(update).toMatchObject({
      phone: '06 39 98 27 14',
      outdoor: true,
      must_have: ['pool', 'outdoor'],
      soft_criteria: [
        { key: 'vue', words: 'une vue' },
        { key: 'calme', words: 'AU CALME' },
      ],
      fields_to_verify: ['email', 'phone', 'must_have', 'soft_criteria'],
    });
    // Ni l'e-mail ni les notes du collègue ne sont réécrits.
    expect(update).not.toHaveProperty('email');
    expect(update).not.toHaveProperty('notes');
  });

  it('refuse une fiche invalide sans rien écrire', async () => {
    const form = proposalForm();
    form.set('cities', '');
    form.delete('cities_add');
    const result = await saveBuyerFromNotes(form);
    expect(result.ok).toBe(false);
    expect(fake.writes()).toEqual([]);
  });

  it('« Annuler » : la lecture dit « annulée », aucune fiche n’est touchée', async () => {
    expect(await cancelNotesReading('usage-1')).toEqual({ ok: false });
    expect(fake.writes()).toEqual(['update ai_usage']);
    const update = fake.calls.find((call) => call.method === 'update')?.args[0];
    expect(update).toMatchObject({ outcome: 'cancelled' });
    const filters = fake.calls.filter((call) => call.method === 'eq').map((call) => call.args);
    expect(filters).toEqual(
      expect.arrayContaining([
        ['agency_id', 'agency-a'],
        ['user_id', 'u1'],
        ['outcome', 'pending'],
      ]),
    );
  });
});
