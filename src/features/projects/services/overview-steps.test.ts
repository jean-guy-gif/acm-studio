import { describe, expect, it } from 'vitest';

import { formatEuro } from '@/lib/format';
import { nextDossierAction } from '@/features/projects/services/dossier-steps';
import {
  NEXT_STEP_PHRASES,
  nextStepPhrase,
  nextStepTitle,
  overviewSteps,
  type OverviewInput,
  followUpNextStep,
} from '@/features/projects/services/overview-steps';

// Mission 143 (B4) — la Vue d'ensemble dit vrai : ce qui est fait est coché, la première étape
// qui ne l'est pas est « maintenant », le reste « plus tard ».
const NOW = new Date('2026-11-07T15:00:00Z');
const READY: OverviewInput = {
  status: 'ready_for_meeting',
  hasProperty: true,
  photoCount: 4,
  exploitableCount: 5,
  decisionPrice: 779000,
  hasDecision: true,
  liveStartedAt: null,
  liveEndedAt: null,
  documentOnly: false,
};
const statuses = (input: OverviewInput) =>
  overviewSteps('p1', input, NOW).map((step) => `${step.key}:${step.status}`);

describe('les cinq étapes de la Vue d’ensemble (mission 143)', () => {
  it('un dossier prêt : trois étapes faites, le Live maintenant, la conclusion plus tard', () => {
    expect(statuses(READY)).toEqual([
      'property:done',
      'competitors:done',
      'decision:done',
      'live:current',
      'conclude:later',
    ]);
    const steps = overviewSteps('p1', READY, NOW);
    // La refonte, lot E (maquette REFONTE-8) — les titres de « Son dossier ».
    expect(steps.map((step) => step.title)).toEqual([
      'Le bien',
      'Les concurrents',
      'Le prix',
      'Le rendez-vous',
      'Conclure',
    ]);
    expect(steps.map((step) => step.fact)).toEqual([
      'fiche saisie · 4 photos',
      '5 retenus',
      formatEuro(779000),
      'à faire devant le vendeur',
      'après le rendez-vous',
    ]);
  });

  it('un dossier neuf : le bien maintenant, rien de coché', () => {
    expect(
      statuses({
        ...READY,
        hasProperty: false,
        photoCount: 0,
        exploitableCount: 0,
        decisionPrice: null,
        hasDecision: false,
      }),
    ).toEqual([
      'property:current',
      'competitors:later',
      'decision:later',
      'live:later',
      'conclude:later',
    ]);
  });

  it('il manque des concurrents : « 2/3 retenus », jamais coché', () => {
    const steps = overviewSteps('p1', { ...READY, exploitableCount: 2 }, NOW);
    expect(steps[1]).toMatchObject({ status: 'current', fact: '2/3 retenus' });
    // Une décision déjà prise reste cochée : l'étape dit vrai, même avant les concurrents.
    expect(steps[2]?.status).toBe('done');
    expect(steps[3]?.status).toBe('later');
  });

  it('le Live fait : daté, la conclusion maintenant ; conclu : tout est coché', () => {
    const ended = overviewSteps(
      'p1',
      { ...READY, liveStartedAt: '2026-11-07T09:00:00Z', liveEndedAt: '2026-11-07T10:00:00Z' },
      NOW,
    );
    expect(ended[3]).toMatchObject({ status: 'done', fact: 'fait aujourd’hui' });
    expect(ended[4]?.status).toBe('current');
    expect(
      statuses({ ...READY, status: 'meeting_completed' }).every((s) => s.endsWith(':done')),
    ).toBe(true);
  });

  it('« Document seul » : l’Étude de marché tient la place du Live', () => {
    const steps = overviewSteps('p1', { ...READY, documentOnly: true }, NOW);
    expect(steps[3]).toMatchObject({
      title: 'Étude de marché',
      href: '/builder/p1/etude-de-marche',
    });
  });

  it('un dossier conclu sans Live (M81) le dit, sans « à faire »', () => {
    const steps = overviewSteps('p1', { ...READY, status: 'meeting_completed' }, NOW);
    expect(steps[3]).toMatchObject({ status: 'done', fact: 'conclu sans Live' });
  });

  it('une fiche sans photo le dit', () => {
    expect(overviewSteps('p1', { ...READY, photoCount: 0 }, NOW)[0]?.fact).toBe(
      'fiche saisie, sans photo',
    );
  });
});

describe('la prochaine étape (mission 143)', () => {
  it('« Faire le Live avec … » pour un dossier prêt, et une phrase pour chaque étape', () => {
    const action = nextDossierAction('p1', {
      status: 'ready_for_meeting',
      hasProperty: true,
      exploitableCount: 5,
      hasDecision: true,
      liveStarted: false,
      liveEnded: false,
    });
    expect(nextStepTitle(action, 'Mme Garcia')).toBe('Faire le Live avec Mme Garcia');
    expect(nextStepPhrase('launch', 37)).toBe(
      'Tablette, environ 37 minutes. Ses réponses sont enregistrées pour de bon.',
    );
    expect(nextStepPhrase('launch', null)).toBe(NEXT_STEP_PHRASES.launch);
    for (const key of [
      'property',
      'competitors',
      'decision',
      'launch',
      'resume',
      'conclude',
      'market_study',
      'suivi',
    ]) {
      expect(NEXT_STEP_PHRASES[key]).toBeTruthy();
    }
  });
});

// Mission 145 (partie B) — un vendeur à relancer que veulent des acquéreurs prêts : la Prochaine
// étape est la relance, avec l'argument, seul bouton plein de la Vue d'ensemble (M143).
describe('la relance, Prochaine étape d’un vendeur à relancer', () => {
  it('« Relancer M. et Mme … », l’argument, la carte du Suivi ouverte sur la relance', () => {
    expect(followUpNextStep('p1', 'M. et Mme Lambert-Duval', 1)).toEqual({
      action: {
        key: 'follow_up',
        label: 'Préparer la relance',
        href: '/suivi?relancer=p1#suivi-p1',
      },
      title: 'Relancer M. et Mme Lambert-Duval',
      phrase:
        '1 acquéreur prêt correspond à ce bien\u00a0: rentrez le mandat pour pouvoir le proposer.',
    });
    expect(followUpNextStep('p1', 'M. Roux', 3)?.phrase).toMatch(
      /^3 acquéreurs prêts correspondent à ce bien/,
    );
  });

  it('sans acquéreur prêt, la Prochaine étape reste celle du dossier', () => {
    expect(followUpNextStep('p1', 'M. Roux', 0)).toBeNull();
  });
});
