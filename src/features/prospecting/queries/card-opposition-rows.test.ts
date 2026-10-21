import { describe, expect, it, vi } from 'vitest';

// Mission 111 — la liste « Concurrents à prospecter » d'un dossier lit l'opposition de la CARTE :
// la copie sans adresse d'un bien inscrit « Ne plus solliciter » n'y propose plus « Préparer le
// dossier » (la liste masque ce bouton dès qu'une ligne porte une opposition).
vi.mock('@/features/meeting-conclusion/queries/get-suivi-dossiers', () => ({
  getSuiviDossiers: async () => [],
}));
vi.mock('@/features/prospecting/queries/get-agency-prospecting', () => ({
  getAgencyProspecting: async () => ({
    cards: [
      {
        row: { opposedOn: '2026-10-20T09:00:00.000Z' },
        copies: [
          { row: { id: 'c1' }, seller: { projectId: 'p1' } },
          { row: { id: 'c2' }, seller: { projectId: 'p2' } },
        ],
      },
    ],
  }),
}));

import { withCardOpposition } from '@/features/prospecting/queries/prospecting-card-store';

describe('la liste du dossier (mission 111)', () => {
  it('reprend l’opposition de la carte entière', async () => {
    const rows = await withCardOpposition('p2', [
      { id: 'c2', opposedOn: null },
      { id: 'other', opposedOn: null },
    ]);
    expect(rows).toEqual([
      { id: 'c2', opposedOn: '2026-10-20T09:00:00.000Z' },
      { id: 'other', opposedOn: null },
    ]);
  });
});
