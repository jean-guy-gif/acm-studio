import { median } from '@/features/comparables/services/calculate-comparable-summary';
import { parseObjections } from '@/features/meeting-conclusion/services/objections';
import { OBJECTION_LABELS, type Objection } from '@/features/meeting-conclusion/types';

// Mission 110 — le tableau de la prise de mandat, pour le manager, à l'intérieur de SON agence
// seulement (remplace M56 et M85, « pas de tableau de bord avant d'avoir des données ») : jamais
// de comparaison entre agences (M59). Le dossier d'exemple n'y entre jamais (M97). Pur.
//
// Un rendez-vous mené = un dossier conclu (une conclusion avec une issue, quelle qu'elle soit). Un mandat est
// signé « au rendez-vous » quand la PREMIÈRE issue enregistrée est « Mandat signé », « après
// relance » sinon (décision de Laurent, 19/10) ; une conclusion dont la première issue n'est pas
// connue est comptée à part, « parcours inconnu ». Le délai médian porte sur les seuls mandats
// signés après relance, compté depuis le rendez-vous (la conclusion).

export type DashboardProject = { id: string; advisorId: string | null; isExample: boolean };
export type DashboardConclusion = {
  projectId: string;
  outcome: string | null;
  mandateType: string | null;
  concludedAt: string | null;
  signedAt: string | null;
  // La première issue enregistrée ; null = parcours inconnu.
  firstOutcome: string | null;
  objections: unknown;
};
export type DashboardAdvisor = { id: string; name: string };

export type MandateFigures = {
  meetings: number;
  signed: number;
  signedAtMeeting: number;
  signedAfterFollowUp: number;
  // Mandats signés dont la première issue n'est pas connue.
  signedUnknownPath: number;
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

function figures(rows: DashboardConclusion[]): MandateFigures {
  // Mission 111 — une ligne créée par la seule saisie du prix au Live, sur un dossier non conclu,
  // n'est pas un rendez-vous mené : seules comptent les conclusions qui ont une issue.
  const conclusions = rows.filter((c) => c.outcome != null);
  const signed = conclusions.filter((c) => c.outcome === 'signed');
  const atMeeting = signed.filter((c) => c.firstOutcome === 'signed').length;
  const afterFollowUpRows = signed.filter(
    (c) => c.firstOutcome != null && c.firstOutcome !== 'signed',
  );
  const afterFollowUp = afterFollowUpRows
    .map((c) =>
      c.concludedAt && c.signedAt ? Date.parse(c.signedAt) - Date.parse(c.concludedAt) : Number.NaN,
    )
    .filter((ms) => Number.isFinite(ms) && ms >= 0);
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
    signedAfterFollowUp: afterFollowUpRows.length,
    signedUnknownPath: signed.filter((c) => c.firstOutcome == null).length,
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
