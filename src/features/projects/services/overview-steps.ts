import { MIN_READY_COMPARABLES } from '@/features/projects/services/project-readiness';
import type { NextDossierAction } from '@/features/projects/services/dossier-steps';
import { formatEuro, formatRelativeDay } from '@/lib/format';

// Mission 143 (B4, maquette AUDIT-garcia.png) — la Vue d'ensemble dit vrai : cinq étapes, coché vert
// = fait, bleu = maintenant, gris = plus tard ; lues sur les mêmes faits que la liste d'« Avant le
// rendez-vous » (M91, M110) et que l'étape suivante (M110). Pur.
// La refonte, lot E (maquette REFONTE-8) — « Son dossier » : leurs titres sont ceux de la maquette
// (Le bien, Les concurrents, Le prix, Le rendez-vous, Conclure) ; ce que chacune dit ne change pas.

export type OverviewStepKey = 'property' | 'competitors' | 'decision' | 'live' | 'conclude';
export type OverviewStepStatus = 'done' | 'current' | 'later';

export type OverviewStep = {
  key: OverviewStepKey;
  number: 1 | 2 | 3 | 4 | 5;
  title: string;
  fact: string;
  status: OverviewStepStatus;
  href: string;
};

export type OverviewInput = {
  status: string;
  hasProperty: boolean;
  photoCount: number;
  exploitableCount: number;
  // Le prix de la décision enregistrée (« Prix des concurrents » retenu), null sans décision.
  decisionPrice: number | null;
  hasDecision: boolean;
  liveStartedAt: string | null;
  liveEndedAt: string | null;
  documentOnly: boolean;
};

const plural = (count: number, one: string, many: string) => `${count} ${count > 1 ? many : one}`;

export function overviewSteps(
  projectId: string,
  input: OverviewInput,
  now: Date = new Date(),
): OverviewStep[] {
  const base = `/builder/${projectId}`;
  const concluded = input.status === 'meeting_completed';
  const liveDone = concluded || input.liveEndedAt != null;
  const steps: Omit<OverviewStep, 'status'>[] = [
    {
      key: 'property',
      number: 1,
      title: 'Le bien',
      fact: input.hasProperty
        ? input.photoCount > 0
          ? `fiche saisie · ${plural(input.photoCount, 'photo', 'photos')}`
          : 'fiche saisie, sans photo'
        : 'à saisir',
      href: `${base}/property`,
    },
    {
      key: 'competitors',
      number: 2,
      title: 'Les concurrents',
      fact:
        input.exploitableCount >= MIN_READY_COMPARABLES
          ? plural(input.exploitableCount, 'retenu', 'retenus')
          : `${input.exploitableCount}/${MIN_READY_COMPARABLES} retenus`,
      href: `${base}/comparables`,
    },
    {
      key: 'decision',
      number: 3,
      title: 'Le prix',
      fact:
        input.hasDecision && input.decisionPrice != null
          ? formatEuro(input.decisionPrice)
          : input.hasDecision
            ? 'enregistrée'
            : 'à décider',
      href: `${base}/avant-rendez-vous`,
    },
    {
      key: 'live',
      number: 4,
      title: input.documentOnly ? 'Étude de marché' : 'Le rendez-vous',
      fact: input.documentOnly
        ? 'remise au vendeur, sans Live'
        : input.liveEndedAt
          ? `fait ${formatRelativeDay(input.liveEndedAt, now)}`
          : concluded
            ? 'conclu sans Live'
            : input.liveStartedAt
              ? 'commencé, à reprendre'
              : 'à faire devant le vendeur',
      href: input.documentOnly ? `${base}/etude-de-marche` : `${base}/avant-rendez-vous`,
    },
    {
      key: 'conclude',
      number: 5,
      title: 'Conclure',
      fact: concluded ? 'conclu, dans le Suivi' : 'après le rendez-vous',
      href: `${base}/conclusion`,
    },
  ];
  const isDone: Record<OverviewStepKey, boolean> = {
    property: input.hasProperty,
    competitors: input.exploitableCount >= MIN_READY_COMPARABLES,
    decision: input.hasDecision,
    live: liveDone,
    conclude: concluded,
  };
  // « Maintenant » : la première étape qui n'est pas faite ; tout ce qui la suit est « plus tard ».
  const current = steps.find((step) => !isDone[step.key])?.key ?? null;
  return steps.map((step) => ({
    ...step,
    status: isDone[step.key] ? 'done' : step.key === current ? 'current' : 'later',
  }));
}

// La phrase sous le titre du bloc « Prochaine étape », selon l'étape suivante (M110).
export const NEXT_STEP_PHRASES: Record<string, string> = {
  property: 'Importez l’annonce ou la fiche du bien, puis relisez-la.',
  competitors: 'Trouvez au moins trois biens en vente qui ressemblent au sien.',
  decision: 'Le marché en un coup d’œil, puis votre prix, sur « Avant le rendez-vous ».',
  launch: 'Sur la tablette. Ses réponses sont enregistrées pour de bon.',
  resume: 'Le Live a commencé : il reprend là où il s’est arrêté.',
  conclude: 'L’issue du rendez-vous : mandat signé, à relancer, vendu ailleurs ou retiré.',
  market_study: 'Le vendeur ne fait pas le Live : remettez-lui l’Étude de marché.',
  suivi: 'Le dossier est conclu : sa suite vit dans le Suivi.',
};

// « Tablette, environ 37 minutes. Ses réponses sont enregistrées pour de bon. » (maquette
// AUDIT-garcia.png) : la durée estimée du Live (M95) quand elle est connue.
export function nextStepPhrase(key: string, estimatedMinutes: number | null): string | null {
  if (key === 'launch' && estimatedMinutes != null) {
    return `Tablette, environ ${estimatedMinutes} minutes. Ses réponses sont enregistrées pour de bon.`;
  }
  return NEXT_STEP_PHRASES[key] ?? null;
}

export function nextStepTitle(action: NextDossierAction, sellerName: string): string {
  return action.key === 'launch' ? `Faire le Live avec ${sellerName}` : action.label;
}

// Mission 145 (partie B) — un vendeur à relancer que veulent des acquéreurs prêts : la Prochaine
// étape devient la relance, avec l'argument, et c'est le seul bouton plein de la page (M143). La
// relance s'ouvre dans la carte du Suivi (M130 A).
export function followUpNextStep(
  projectId: string,
  sellerName: string,
  readyBuyers: number,
): { action: NextDossierAction; title: string; phrase: string } | null {
  if (readyBuyers < 1) return null;
  const count =
    readyBuyers > 1
      ? `${readyBuyers} acquéreurs prêts correspondent à ce bien`
      : '1 acquéreur prêt correspond à ce bien';
  return {
    action: {
      key: 'follow_up',
      label: 'Relancer',
      href: `/suivi?relancer=${projectId}#suivi-${projectId}`,
    },
    title: `Relancer ${sellerName}`,
    phrase: `${count} : rentrez le mandat pour pouvoir le proposer.`,
  };
}
