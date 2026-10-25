import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase } from '@/test-fixtures/fake-supabase';

// Mission 122 (partie B) — « Envoyer ma réponse » sur le lien : le jeton relu, une seule
// transaction en base, une seule réponse ; sans compte ni e-mail ; un refus n'écrit rien.
const state = vi.hoisted(() => ({
  queue: [] as { data?: unknown; error?: unknown }[],
}));
const service = fakeSupabase(() => state.queue.shift() ?? { data: null });
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => service.client }));

const { submitDossierAnswers } =
  await import('@/features/buyer-dossier/actions/submit-dossier-answers');
const { DOSSIER_ALREADY_ANSWERED, DOSSIER_NO_ANSWER, DOSSIER_PRESENTED } =
  await import('@/features/buyer-dossier/types');

const TOKEN = 'A'.repeat(43);
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const link = { agency_id: 'agency-a', selection_id: 's1' };
const rpcArgs = () =>
  service.calls.find((call) => call.method === 'rpc')?.args[1] as Record<string, unknown>;

describe('submitDossierAnswers', () => {
  beforeEach(() => {
    service.reset();
    state.queue = [];
  });

  it('jeton mal formé, aucune réponse, réponse hors liste : rien n’atteint la base', async () => {
    expect((await submitDossierAnswers('court', [{ itemId: A, answer: 'visit' }], [])).ok).toBe(
      false,
    );
    expect(await submitDossierAnswers(TOKEN, [], [])).toEqual({
      ok: false,
      error: DOSSIER_NO_ANSWER,
    });
    expect((await submitDossierAnswers(TOKEN, [{ itemId: A, answer: 'oui' }], [])).ok).toBe(false);
    expect((await submitDossierAnswers(TOKEN, [{ itemId: 'x', answer: 'visit' }], [])).ok).toBe(
      false,
    );
    expect(service.calls).toEqual([]);
  });

  it('lien inconnu ou expiré : « Ce lien n’est plus valable », rien d’écrit', async () => {
    expect(await submitDossierAnswers(TOKEN, [{ itemId: A, answer: 'visit' }], [])).toEqual({
      ok: false,
      error: 'Ce lien n’est plus valable.',
    });
    expect(
      service.calls.some((call) => call.method === 'gt' && call.args[0] === 'expires_at'),
    ).toBe(true);
    expect(service.writes()).toEqual([]);
  });

  it('une transaction : la sélection du lien, une réponse par bien, des raisons à « Pas pour moi » seulement, les créneaux relus', async () => {
    state.queue = [{ data: link }, { data: 2 }];
    const result = await submitDossierAnswers(
      TOKEN,
      [
        { itemId: A, answer: 'maybe' },
        { itemId: A, answer: 'visit', reasons: ['surface'] },
        { itemId: B, answer: 'no', reasons: ['surface', 'le voisin', 'price'] },
      ],
      ['sunday', 'minuit', 'sat_morning'],
    );
    expect(result).toEqual({ ok: true, answered: 2 });
    expect(service.writes()).toEqual(['rpc submit_buyer_dossier_answers']);
    expect(rpcArgs()).toEqual({
      p_agency_id: 'agency-a',
      p_selection_id: 's1',
      p_answers: [
        { itemId: A, answer: 'visit', reasons: [] },
        { itemId: B, answer: 'no', reasons: ['surface', 'price'] },
      ],
      p_availability: ['sat_morning', 'sunday'],
    });
  });

  it('une seule réponse : un second envoi dit « Merci, j’ai bien reçu votre réponse »', async () => {
    state.queue = [{ data: link }, { data: null, error: { message: 'already_answered' } }];
    expect(await submitDossierAnswers(TOKEN, [{ itemId: A, answer: 'visit' }], [])).toEqual({
      ok: false,
      error: DOSSIER_ALREADY_ANSWERED,
      closed: 'answered',
    });
  });

  it('une présentation terminée : plus de réponse sur le lien, la page passe au récapitulatif', async () => {
    state.queue = [{ data: link }, { data: null, error: { message: 'presentation_finished' } }];
    expect(await submitDossierAnswers(TOKEN, [{ itemId: A, answer: 'visit' }], [])).toEqual({
      ok: false,
      error: DOSSIER_PRESENTED,
      closed: 'presented',
    });
  });

  it('un acquéreur archivé : le lien ne vaut plus', async () => {
    state.queue = [{ data: link }, { data: null, error: { message: 'buyer_archived' } }];
    expect(await submitDossierAnswers(TOKEN, [{ itemId: A, answer: 'visit' }], [])).toEqual({
      ok: false,
      error: 'Ce lien n’est plus valable.',
    });
  });
});
