import { describe, expect, it } from 'vitest';

import {
  buildManagerOverview,
  DEFAULT_DORMANCY_THRESHOLDS,
  type TeamConclusion,
  type TeamProfile,
  type TeamProject,
} from '@/features/team/services/build-manager-overview';

const NOW = new Date('2026-09-24T12:00:00Z');
const PREP = DEFAULT_DORMANCY_THRESHOLDS.preparationDays;
const FU = DEFAULT_DORMANCY_THRESHOLDS.followUpDays;

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 86_400_000).toISOString();
}

const OWNER: TeamProfile = { id: 'u1', firstName: 'Alice', lastName: 'Manager', role: 'owner' };
const ADVISOR: TeamProfile = {
  id: 'u2',
  firstName: 'Bob',
  lastName: 'Conseiller',
  role: 'advisor',
};

function project(over: Partial<TeamProject>): TeamProject {
  return {
    id: 'p',
    advisorId: 'u2',
    sellerName: 'Vendeur',
    status: 'draft',
    updatedAt: daysAgo(1),
    ...over,
  };
}

describe('buildManagerOverview (Mission 59)', () => {
  it('§6.4 — un conseiller sans dossier apparaît à ZÉRO, jamais absent', () => {
    const overview = buildManagerOverview({
      profiles: [OWNER, ADVISOR],
      projects: [],
      conclusions: [],
      now: NOW,
    });
    expect(overview.advisors.map((a) => a.name)).toEqual(['Alice Manager', 'Bob Conseiller']);
    for (const advisor of overview.advisors) {
      expect(advisor.inPreparation).toBe(0);
      expect(advisor.ready).toBe(0);
      expect(advisor.completed).toBe(0);
      expect(advisor.signed).toBe(0);
    }
    expect(overview.agency).toEqual({ inPreparation: 0, ready: 0, completed: 0, signed: 0 });
  });

  it('compte par conseiller, par état, et le rôle manager est marqué', () => {
    const projects = [
      project({ id: 'a', advisorId: 'u2', status: 'draft', updatedAt: daysAgo(1) }),
      project({ id: 'b', advisorId: 'u2', status: 'ready_for_meeting' }),
      project({ id: 'c', advisorId: 'u1', status: 'meeting_completed' }),
    ];
    const conclusions: TeamConclusion[] = [
      { projectId: 'c', outcome: 'signed', outcomeChangedAt: daysAgo(2) },
    ];
    const overview = buildManagerOverview({
      profiles: [OWNER, ADVISOR],
      projects,
      conclusions,
      now: NOW,
    });
    const alice = overview.advisors.find((a) => a.advisorId === 'u1')!;
    const bob = overview.advisors.find((a) => a.advisorId === 'u2')!;
    expect(alice.isManager).toBe(true);
    expect(bob.isManager).toBe(false);
    expect(bob.inPreparation).toBe(1);
    expect(bob.ready).toBe(1);
    expect(alice.completed).toBe(1);
    expect(alice.signed).toBe(1);
    expect(overview.agency.signed).toBe(1);
  });

  it('les mandats signés ne comptent que l’issue « signed » (pas follow_up/withdrawn)', () => {
    const projects = [
      project({ id: 'a', advisorId: 'u2', status: 'meeting_completed' }),
      project({ id: 'b', advisorId: 'u2', status: 'meeting_completed' }),
    ];
    const conclusions: TeamConclusion[] = [
      { projectId: 'a', outcome: 'follow_up', outcomeChangedAt: daysAgo(2) },
      { projectId: 'b', outcome: 'signed', outcomeChangedAt: daysAgo(2) },
    ];
    const overview = buildManagerOverview({ profiles: [ADVISOR], projects, conclusions, now: NOW });
    expect(overview.advisors[0].completed).toBe(2);
    expect(overview.advisors[0].signed).toBe(1);
  });

  it('ce qui dort : préparation ancienne et « à relancer » figé, du plus ancien au plus récent', () => {
    const projects = [
      project({ id: 'old', status: 'draft', sellerName: 'Vieux', updatedAt: daysAgo(PREP + 5) }),
      project({ id: 'fresh', status: 'draft', sellerName: 'Récent', updatedAt: daysAgo(2) }),
      project({ id: 'fu', status: 'meeting_completed', sellerName: 'Relance' }),
    ];
    const conclusions: TeamConclusion[] = [
      { projectId: 'fu', outcome: 'follow_up', outcomeChangedAt: daysAgo(FU + 10) },
    ];
    const overview = buildManagerOverview({ profiles: [ADVISOR], projects, conclusions, now: NOW });
    expect(overview.dormant.map((d) => d.projectId)).toEqual(['fu', 'old']);
    expect(overview.dormant.find((d) => d.projectId === 'old')?.kind).toBe('preparation');
    expect(overview.dormant.find((d) => d.projectId === 'fu')?.kind).toBe('follow_up');
    expect(overview.dormant.some((d) => d.projectId === 'fresh')).toBe(false);
  });

  it('les seuils par défaut sont échoués dans la sortie', () => {
    const overview = buildManagerOverview({ profiles: [ADVISOR], projects: [], conclusions: [] });
    expect(overview.thresholds).toEqual(DEFAULT_DORMANCY_THRESHOLDS);
  });

  // Mission 59 (seuils) — le seuil règle ce qui dort : le MÊME dossier dort ou non selon le seuil.
  it('des seuils réglés changent ce qui dort (et sont renvoyés tels quels)', () => {
    const projects = [
      project({ id: 'x', status: 'draft', updatedAt: daysAgo(15) }),
      project({ id: 'fu', status: 'meeting_completed' }),
    ];
    const conclusions: TeamConclusion[] = [
      { projectId: 'fu', outcome: 'follow_up', outcomeChangedAt: daysAgo(20) },
    ];

    // Défaut 21/30 : ni l'un ni l'autre ne dort à 15 j / 20 j.
    const asDefault = buildManagerOverview({
      profiles: [ADVISOR],
      projects,
      conclusions,
      now: NOW,
    });
    expect(asDefault.dormant).toHaveLength(0);

    // Seuils resserrés 10/14 : les deux dorment maintenant.
    const tightened = buildManagerOverview({
      profiles: [ADVISOR],
      projects,
      conclusions,
      thresholds: { preparationDays: 10, followUpDays: 14 },
      now: NOW,
    });
    expect(tightened.dormant.map((d) => d.projectId).sort()).toEqual(['fu', 'x']);
    expect(tightened.thresholds).toEqual({ preparationDays: 10, followUpDays: 14 });
  });

  it('un « à relancer » RÉCEMMENT changé ne dort pas', () => {
    const projects = [project({ id: 'fu', status: 'meeting_completed' })];
    const conclusions: TeamConclusion[] = [
      { projectId: 'fu', outcome: 'follow_up', outcomeChangedAt: daysAgo(3) },
    ];
    expect(
      buildManagerOverview({ profiles: [ADVISOR], projects, conclusions, now: NOW }).dormant,
    ).toHaveLength(0);
  });

  it('les dossiers archivés (soft delete) ne comptent nulle part', () => {
    const projects = [project({ id: 'arch', status: 'archived' })];
    const overview = buildManagerOverview({
      profiles: [ADVISOR],
      projects,
      conclusions: [],
      now: NOW,
    });
    expect(overview.advisors[0].inPreparation).toBe(0);
    expect(overview.agency.inPreparation).toBe(0);
    expect(overview.dormant).toHaveLength(0);
  });
});
