import { describe, expect, it } from 'vitest';

import type { SuiviDossier } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import {
  prospectingCounts,
  suiviTaskInputs,
  type TaskVisit,
} from '@/features/meeting-conclusion/services/suivi-task-inputs';
import { dossierTasks } from '@/features/meeting-conclusion/services/suivi-tasks';

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

// La refonte, lot B — « à faire aujourd'hui », une carte par acquéreur : l'acquéreur d'une demande
// de visite arrive jusqu'à la tâche du mandat.
describe('les visites à organiser d’un mandat, avec leurs acquéreurs', () => {
  const dossier = (id: string): SuiviDossier => ({
    project: { id, seller_name: 'M. Lefebvre', is_example: false } as SuiviDossier['project'],
    property: null,
    conclusion: {
      outcome: 'signed',
      concludedAt: '2026-10-20T09:00:00Z',
      signedAt: '2026-10-20T09:00:00Z',
      nextFollowUpOn: null,
    } as SuiviDossier['conclusion'],
  });
  const visit = (over: Partial<TaskVisit>): TaskVisit => ({
    itemSource: 'project',
    itemReference: 'p-mougins',
    requestedAt: '2026-11-03T09:00:00Z',
    cancelledAt: null,
    visitedAt: null,
    buyerArchived: false,
    buyerName: 'Famille Keller',
    buyerId: 'keller',
    ...over,
  });

  it('chaque demande vivante garde son acquéreur ; annulée, faite ou d’une fiche archivée : aucune', () => {
    const [mougins, vence] = suiviTaskInputs({
      dossiers: [dossier('p-mougins'), dossier('p-vence')],
      contacts: new Map(),
      lastPoints: new Map(),
      cards: [],
      visits: [
        visit({}),
        visit({
          requestedAt: '2026-11-04T09:00:00Z',
          buyerName: 'M. et Mme Rossi',
          buyerId: 'rossi',
        }),
        visit({ buyerId: 'annulee', cancelledAt: '2026-11-04T10:00:00Z' }),
        visit({ buyerId: 'faite', visitedAt: '2026-11-04T10:00:00Z' }),
        visit({ buyerId: 'archivee', buyerArchived: true }),
        // Un bien du marché n'est le mandat de personne.
        visit({ itemSource: 'listing', itemReference: 'https://x/annonce/1', buyerId: 'marche' }),
      ],
    });
    expect(mougins!.visits).toEqual([
      { requestedAt: '2026-11-03T09:00:00Z', buyerName: 'Famille Keller', buyerId: 'keller' },
      { requestedAt: '2026-11-04T09:00:00Z', buyerName: 'M. et Mme Rossi', buyerId: 'rossi' },
    ]);
    expect(vence!.visits).toEqual([]);
    // Jusqu'à la tâche : une entrée par demande, dans l'ordre.
    const task = dossierTasks(mougins!).find((entry) => entry.kind === 'visit')!;
    expect(task.visitBuyers).toEqual([
      { id: 'keller', name: 'Famille Keller' },
      { id: 'rossi', name: 'M. et Mme Rossi' },
    ]);
  });
});
