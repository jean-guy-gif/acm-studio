import { describe, expect, it } from 'vitest';

import {
  visitLetterState,
  visitWaitingLabel,
} from '@/features/buyer-prospecting/services/visit-letter-state';
import { buildBuyerSearchFigures } from '@/features/team/services/build-buyer-search-figures';

// Mission 120 B — la visite relit la collaboration ; la fiche compte ses courriers ; le tableau du
// manager compte les recherches acquéreur à part.

const card = (overrides: Partial<Parameters<typeof visitLetterState>[0] & object> = {}) => ({
  status: 'ready' as const,
  step: 'colleague' as const,
  handedAt: null,
  meetingAt: null,
  opposedOn: null,
  collaborationDeclinedAt: null,
  ...overrides,
});

describe('la visite relit la collaboration au confrère', () => {
  it('dossier prêt, puis contacté, puis collaboration obtenue : « À planifier »', () => {
    expect(visitLetterState(card())).toEqual({ kind: 'ready', label: 'Dossier prêt' });
    expect(visitLetterState(card({ status: 'to_confirm' }))).toEqual({
      kind: 'ready',
      label: 'Dossier prêt',
    });
    const handed = visitLetterState(card({ status: 'handed', handedAt: '2026-10-30T10:00:00Z' }));
    expect(handed).toEqual({ kind: 'handed', label: 'Contacté le 30/10' });
    expect(visitWaitingLabel(handed, 'colleague')).toBe('En attente du confrère');
    const done = visitLetterState(card({ status: 'collaboration' }));
    expect(done).toEqual({ kind: 'done', label: 'Collaboration obtenue' });
    expect(visitWaitingLabel(done, 'colleague')).toBeNull();
  });

  it('collaboration refusée : le bien repasse en courrier au propriétaire, et la visite l’attend', () => {
    const refused = visitLetterState(
      card({
        step: 'owner',
        status: 'to_confirm',
        collaborationDeclinedAt: '2026-10-30T10:00:00Z',
      }),
    );
    expect(refused).toEqual({
      kind: 'address',
      label: 'Collaboration refusée : courrier au propriétaire',
    });
    expect(visitWaitingLabel(refused, 'owner')).toBe('En attente du propriétaire');
  });
});

describe('le tableau du manager : les recherches acquéreur', () => {
  it('des faits cumulés, chaque bien une fois, au conseiller du premier courrier', () => {
    const figures = buildBuyerSearchFigures(
      [
        {
          advisorId: 'a1',
          handedAt: '2026-10-28',
          meetingAt: null,
          mandateAt: null,
          collaborationAt: null,
        },
        {
          advisorId: 'a1',
          handedAt: null,
          meetingAt: null,
          mandateAt: null,
          collaborationAt: '2026-10-29',
        },
        {
          advisorId: 'a2',
          handedAt: '2026-10-20',
          meetingAt: '2026-10-22',
          mandateAt: '2026-10-25',
          collaborationAt: null,
        },
        {
          advisorId: null,
          handedAt: null,
          meetingAt: null,
          mandateAt: null,
          collaborationAt: null,
        },
      ],
      [
        { id: 'a1', name: 'Jean-Guy Ourmières' },
        { id: 'a2', name: 'Natacha' },
        { id: 'a3', name: 'Personne' },
      ],
    );
    expect(figures.agency).toEqual({
      prepared: 4,
      handed: 3,
      meetings: 1,
      mandates: 1,
      collaborations: 1,
    });
    expect(figures.advisors.map((advisor) => [advisor.name, advisor.prepared])).toEqual([
      ['Jean-Guy Ourmières', 2],
      ['Natacha', 1],
    ]);
  });

  it('sans courrier : zéro partout, aucun conseiller', () => {
    expect(buildBuyerSearchFigures([], [{ id: 'a1', name: 'X' }])).toEqual({
      agency: { prepared: 0, handed: 0, meetings: 0, mandates: 0, collaborations: 0 },
      advisors: [],
    });
  });
});
