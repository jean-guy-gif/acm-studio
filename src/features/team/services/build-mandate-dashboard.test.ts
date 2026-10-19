import { describe, expect, it } from 'vitest';

import { buildMandateDashboard } from '@/features/team/services/build-mandate-dashboard';

// Mission 110 — le tableau de la prise de mandat, à l'intérieur de l'agence.
const T0 = '2026-10-01T10:00:00.000Z';
const at = (days: number) => new Date(Date.parse(T0) + days * 86_400_000).toISOString();

const projects = [
  { id: 'a1', advisorId: 'anne', isExample: false },
  { id: 'a2', advisorId: 'anne', isExample: false },
  { id: 'b1', advisorId: 'bruno', isExample: false },
  { id: 'b2', advisorId: 'bruno', isExample: false },
  { id: 'b3', advisorId: 'bruno', isExample: false },
  { id: 'b4', advisorId: 'bruno', isExample: false },
  // Le dossier d'exemple : jamais compté, même conclu « signé ».
  { id: 'ex', advisorId: 'anne', isExample: true },
];
const conclusions = [
  {
    projectId: 'a1',
    outcome: 'signed',
    mandateType: 'exclusive',
    concludedAt: T0,
    signedAt: T0,
    firstOutcome: 'signed',
    objections: [],
  },
  {
    projectId: 'a2',
    outcome: 'signed',
    mandateType: 'simple',
    concludedAt: T0,
    signedAt: at(10),
    firstOutcome: 'follow_up',
    objections: ['price'],
  },
  {
    projectId: 'b1',
    outcome: 'follow_up',
    mandateType: null,
    concludedAt: T0,
    signedAt: null,
    firstOutcome: 'follow_up',
    objections: ['price', 'timing'],
  },
  // Première issue « vendu ailleurs », puis signé : après relance (tout sauf « signé »).
  {
    projectId: 'b2',
    outcome: 'signed',
    mandateType: null,
    concludedAt: T0,
    signedAt: at(20),
    firstOutcome: 'sold_elsewhere',
    objections: ['nimporte'],
  },
  // Signé quelques heures après une première issue « à relancer » : après relance.
  {
    projectId: 'b3',
    outcome: 'signed',
    mandateType: 'exclusive',
    concludedAt: T0,
    signedAt: at(0.1),
    firstOutcome: 'follow_up',
    objections: [],
  },
  // Parcours inconnu : compté à part.
  {
    projectId: 'b4',
    outcome: 'signed',
    mandateType: null,
    concludedAt: T0,
    signedAt: T0,
    firstOutcome: null,
    objections: [],
  },
  {
    projectId: 'ex',
    outcome: 'signed',
    mandateType: 'exclusive',
    concludedAt: T0,
    signedAt: T0,
    firstOutcome: 'signed',
    objections: ['exclusivity'],
  },
  // Une conclusion d'un dossier inconnu (autre agence, archivé) : ignorée.
  {
    projectId: 'autre',
    outcome: 'signed',
    mandateType: 'exclusive',
    concludedAt: T0,
    signedAt: T0,
    firstOutcome: 'signed',
    objections: [],
  },
];
const advisors = [
  { id: 'anne', name: 'Anne' },
  { id: 'bruno', name: 'Bruno' },
  { id: 'claire', name: 'Claire' },
];

describe('le tableau de la prise de mandat', () => {
  const dashboard = buildMandateDashboard({ projects, conclusions, advisors });

  it('pour l’agence : sans l’exemple, ni un dossier qui n’est pas le sien', () => {
    expect(dashboard.agency).toMatchObject({
      meetings: 6,
      signed: 5,
      signedAtMeeting: 1,
      signedAfterFollowUp: 3,
      signedUnknownPath: 1,
      // 2 exclusifs sur 3 mandats typés.
      exclusiveShare: 2 / 3,
      // 0,1, 10 et 20 jours après le rendez-vous : médiane 10.
      medianDaysToSignature: 10,
    });
    expect(dashboard.agency.objections).toEqual([
      { objection: 'price', label: 'Le prix', count: 2 },
      { objection: 'timing', label: 'Le délai', count: 1 },
    ]);
  });

  it('par conseiller, sans celui qui n’a mené aucun rendez-vous', () => {
    expect(
      dashboard.advisors.map((advisor) => [advisor.name, advisor.meetings, advisor.signed]),
    ).toEqual([
      ['Bruno', 4, 3],
      ['Anne', 2, 2],
    ]);
    expect(dashboard.advisors[1].exclusiveShare).toBe(0.5);
  });
});
