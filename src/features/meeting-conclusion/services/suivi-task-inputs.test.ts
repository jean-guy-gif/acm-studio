import { describe, expect, it } from 'vitest';

import { prospectingCounts } from '@/features/meeting-conclusion/services/suivi-task-inputs';

// Mission 130 — depuis quand le démarchage attend : la plus ancienne adresse d'une carte PRÊTE,
// jamais celle d'une carte à confirmer ou opposée.
describe('les concurrents d’un mandat, pour la frise et le démarchage', () => {
  it('compte les cartes et date la plus ancienne adresse prête', () => {
    const counts = prospectingCounts([
      {
        row: { status: 'ready', opposedOn: null, addressAt: '2026-10-28T09:00:00Z' },
        sellers: [{ projectId: 'p' }],
      },
      {
        row: { status: 'ready', opposedOn: null, addressAt: '2026-10-20T09:00:00Z' },
        sellers: [{ projectId: 'p' }],
      },
      {
        row: { status: 'to_confirm', opposedOn: null, addressAt: '2026-09-01T09:00:00Z' },
        sellers: [{ projectId: 'p' }],
      },
      {
        row: { status: 'ready', opposedOn: '2026-10-01', addressAt: '2026-09-01T09:00:00Z' },
        sellers: [{ projectId: 'p' }],
      },
      { row: { status: 'declined', opposedOn: null }, sellers: [{ projectId: 'p' }] },
    ]);
    expect(counts.get('p')).toEqual({
      total: 4,
      ready: 2,
      toConfirm: 1,
      done: 1,
      declined: 1,
      readySince: '2026-10-20T09:00:00Z',
    });
  });

  it('une carte prête sans date d’adresse ne date rien', () => {
    const counts = prospectingCounts([
      { row: { status: 'ready', opposedOn: null }, sellers: [{ projectId: 'p' }] },
    ]);
    expect(counts.get('p')?.readySince).toBeNull();
  });
});
