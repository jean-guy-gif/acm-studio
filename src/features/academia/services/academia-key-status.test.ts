import { describe, expect, it, vi } from 'vitest';

import { academiaKeyLine } from '@/features/academia/services/academia-key-status';
import { fakeAcademia } from '@/test-fixtures/fake-academia';

vi.mock('server-only', () => ({}));
const { readAcademiaKeys } = await import('@/features/academia/queries/read-academia-keys');

// Mission 161 — `GET /etat` (Laurent, 18/11) : la vraie clé dit « ok » sans « essai ». Réponses
// simulées, aucune API réelle ; jamais la clé dans ce qui est rendu.
describe('la ligne « Clé Academia » des opérateurs', () => {
  it('la clé des agences doit être la vraie ; celle de la démo, la clé d’essai', () => {
    expect(academiaKeyLine('agencies', 'real')).toMatchObject({ text: 'vraie clé ✓', good: true });
    expect(academiaKeyLine('agencies', 'trial')).toMatchObject({
      text: 'clé d’essai ✗',
      good: false,
    });
    expect(academiaKeyLine('demo', 'trial')).toMatchObject({ text: 'clé d’essai ✓', good: true });
    expect(academiaKeyLine('agencies', 'missing').text).toBe('absente de Vercel ✗');
    expect(academiaKeyLine('agencies', 'unavailable').text).toBe('Academia ne répond pas');
  });

  it('chaque clé posée est vérifiée par GET /etat ; une clé absente ne part pas', async () => {
    const server = fakeAcademia({
      status: [{ status: 200, body: { ok: true } }],
    });
    const result = await readAcademiaKeys({ ACADEMIA_API_KEY: 'msk_vraie' }, server.fetch);
    expect(result).toEqual({ agencies: 'real', demo: 'missing' });
    expect(server.calls).toHaveLength(1);
    expect(server.calls[0]).toMatchObject({ method: 'GET', path: '/api/v1/etat' });
    expect(JSON.stringify(result)).not.toContain('msk_vraie');
  });
});
