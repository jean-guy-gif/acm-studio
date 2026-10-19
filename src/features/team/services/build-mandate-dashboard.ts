import { median } from '@/features/comparables/services/calculate-comparable-summary';
import { parseObjections } from '@/features/meeting-conclusion/services/objections';
import { OBJECTION_LABELS, type Objection } from '@/features/meeting-conclusion/types';

// Mission 110 — le tableau de la prise de mandat, pour le manager, à l'intérieur de SON agence
// seulement (remplace M56 et M85, « pas de tableau de bord avant d'avoir des données ») : jamais
// de comparaison entre agences (M59). Le dossier d'exemple n'y entre jamais (M97). Pur.
//
// Un rendez-vous mené = un dossier conclu (une conclusion, quelle que soit l'issue). Un mandat est
// signé « au rendez-vous » quand il l'est dans les 24 heures de la conclusion, « après relance »
// sinon. Le délai médian de signature porte sur les mandats signés après relance.

export type DashboardProject = { id: string; advisorId: string | null; isExample: boolean };
export type DashboardConclusion = {
  projectId: string;
  outcome: string | null;
  mandateType: string | null;
  concludedAt: string | null;
  signedAt: string | null;
  objections: unknown;
};
export type DashboardAdvisor = { id: string; name: string };

export type MandateFigures = {
  meetings: number;
  signed: number;
  signedAtMeeting: number;
  signedAfterFollowUp: number;
  // Part d'exclusifs parmi les mandats signés dont le type est connu ; null sans mandat typé.
  exclusiveShare: number | null;
  // En jours entiers ; null sans mandat signé après relance.
  medianDaysToSignature: number | null;
  // Les freins les plus fréquents, du plus au moins cité.
  objections: { objection: Objection; label: string; count: number }[];
};

export type MandateDashboard = {
  agency: MandateFigures;
  advisors: ({ advisorId: string; name: string } & MandateFigures)[];
};

const DAY_MS = 86_400_000;
const AT_MEETING_MS = DAY_MS;

function figures(conclusions: DashboardConclusion[]): MandateFigures {
  const signed = conclusions.filter((c) => c.outcome === 'signed');
  const delays = signed.map((c) =>
    c.concludedAt && c.signedAt ? Date.parse(c.signedAt) - Date.parse(c.concludedAt) : Number.NaN,
  );
  const atMeeting = delays.filter((ms) => Number.isFinite(ms) && ms <= AT_MEETING_MS).length;
  const afterFollowUp = delays.filter((ms) => Number.isFinite(ms) && ms > AT_MEETING_MS);
  const typed = signed.filter((c) => c.mandateType === 'exclusive' || c.mandateType === 'simple');
  const days = median(afterFollowUp.map((ms) => ms / DAY_MS));
  const counts = new Map<Objection, number>();
  for (const conclusion of conclusions) {
    for (const objection of parseObjections(conclusion.objections)) {
      counts.set(objection, (counts.get(objection) ?? 0) + 1);
    }
  }
  return {
    meetings: conclusions.length,
    signed: signed.length,
    signedAtMeeting: atMeeting,
    signedAfterFollowUp: afterFollowUp.length,
    exclusiveShare:
      typed.length > 0
        ? typed.filter((c) => c.mandateType === 'exclusive').length / typed.length
        : null,
    medianDaysToSignature: days == null ? null : Math.round(days),
    objections: [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([objection, count]) => ({ objection, label: OBJECTION_LABELS[objection], count })),
  };
}

export function buildMandateDashboard(input: {
  projects: DashboardProject[];
  conclusions: DashboardConclusion[];
  advisors: DashboardAdvisor[];
}): MandateDashboard {
  const real = new Map(
    input.projects.filter((project) => !project.isExample).map((project) => [project.id, project]),
  );
  const counted = input.conclusions.filter((conclusion) => real.has(conclusion.projectId));
  const advisors = input.advisors
    .map((advisor) => {
      const own = counted.filter(
        (conclusion) => real.get(conclusion.projectId)?.advisorId === advisor.id,
      );
      return { advisorId: advisor.id, name: advisor.name, ...figures(own) };
    })
    .filter((advisor) => advisor.meetings > 0)
    .sort((a, b) => b.meetings - a.meetings || a.name.localeCompare(b.name));
  return { agency: figures(counted), advisors };
}
