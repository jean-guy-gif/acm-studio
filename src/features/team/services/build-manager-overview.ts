import { isManagerRole } from '@/features/team/services/role';

// Mission 59 jalon 1 — la vue manager, PURE et testable. On agrège l'activité de l'agence
// « orientée action, pas statistique » (§3) : où en est chacun, ce qui dort, les mandats
// signés. Aucune moyenne, aucune tendance (§3 : des stats sur cinq dossiers ne disent rien).
// Rien d'inventé : un conseiller sans dossier apparaît à ZÉRO, jamais absent de la liste.

// « Depuis des semaines » / « depuis longtemps » (§3), en jours — désormais RÉGLABLES par le
// manager, par agence (Mission 59, seuils). Ces valeurs restent les DÉFAUTS produit : une agence
// qui n'a rien réglé les hérite (colonnes agencies NOT NULL DEFAULT 21/30).
export type DormancyThresholds = {
  preparationDays: number; // un dossier en préparation qui n'avance plus
  followUpDays: number; // un « à relancer » dont l'issue n'a pas bougé
};

export const DEFAULT_DORMANCY_THRESHOLDS: DormancyThresholds = {
  preparationDays: 21,
  followUpDays: 30,
};

export type TeamProfile = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
};

export type TeamProject = {
  id: string;
  advisorId: string;
  sellerName: string;
  status: string;
  updatedAt: string;
};

export type TeamConclusion = {
  projectId: string;
  outcome: string | null;
  outcomeChangedAt: string | null;
};

export type AdvisorActivity = {
  advisorId: string;
  name: string;
  isManager: boolean;
  inPreparation: number; // status 'draft'
  ready: number; // 'ready_for_meeting'
  completed: number; // 'meeting_completed'
  signed: number; // conclusions outcome 'signed'
};

export type DormantDossier = {
  projectId: string;
  sellerName: string;
  advisorName: string;
  kind: 'preparation' | 'follow_up';
  daysSinceChange: number;
};

export type ManagerOverview = {
  advisors: AdvisorActivity[];
  dormant: DormantDossier[];
  agency: { inPreparation: number; ready: number; completed: number; signed: number };
  // Les seuils EFFECTIVEMENT appliqués : la section les affiche et les rend réglables.
  thresholds: DormancyThresholds;
};

function fullName(profile: TeamProfile): string {
  return `${profile.firstName} ${profile.lastName}`.trim() || 'Sans nom';
}

function daysBetween(fromIso: string, now: Date): number {
  const from = new Date(fromIso).getTime();
  if (!Number.isFinite(from)) {
    return 0;
  }
  return Math.max(0, Math.floor((now.getTime() - from) / 86_400_000));
}

export function buildManagerOverview(args: {
  profiles: TeamProfile[];
  projects: TeamProject[];
  conclusions: TeamConclusion[];
  thresholds?: DormancyThresholds;
  now?: Date;
}): ManagerOverview {
  const { profiles, projects, conclusions } = args;
  const thresholds = args.thresholds ?? DEFAULT_DORMANCY_THRESHOLDS;
  const now = args.now ?? new Date();
  const outcomeByProject = new Map(conclusions.map((c) => [c.projectId, c]));
  const nameById = new Map(profiles.map((p) => [p.id, fullName(p)]));

  // Une ligne par conseiller — TOUS les profils, même sans dossier (zéro, pas absent).
  const activityById = new Map<string, AdvisorActivity>();
  for (const profile of profiles) {
    activityById.set(profile.id, {
      advisorId: profile.id,
      name: fullName(profile),
      isManager: isManagerRole(profile.role),
      inPreparation: 0,
      ready: 0,
      completed: 0,
      signed: 0,
    });
  }

  const dormant: DormantDossier[] = [];

  for (const project of projects) {
    if (project.status === 'archived') {
      continue; // soft delete : invisible par conception.
    }
    const activity = activityById.get(project.advisorId);
    const advisorName = nameById.get(project.advisorId) ?? 'Conseiller retiré';

    if (project.status === 'draft') {
      if (activity) activity.inPreparation += 1;
      // Ce qui dort : en préparation depuis des semaines sans avancer.
      const idle = daysBetween(project.updatedAt, now);
      if (idle >= thresholds.preparationDays) {
        dormant.push({
          projectId: project.id,
          sellerName: project.sellerName,
          advisorName,
          kind: 'preparation',
          daysSinceChange: idle,
        });
      }
    } else if (project.status === 'ready_for_meeting') {
      if (activity) activity.ready += 1;
    } else if (project.status === 'meeting_completed') {
      if (activity) activity.completed += 1;
      const conclusion = outcomeByProject.get(project.id);
      if (conclusion?.outcome === 'signed') {
        if (activity) activity.signed += 1;
      }
      // Ce qui dort : un « à relancer » dont l'issue n'a pas bougé depuis longtemps.
      if (conclusion?.outcome === 'follow_up' && conclusion.outcomeChangedAt) {
        const idle = daysBetween(conclusion.outcomeChangedAt, now);
        if (idle >= thresholds.followUpDays) {
          dormant.push({
            projectId: project.id,
            sellerName: project.sellerName,
            advisorName,
            kind: 'follow_up',
            daysSinceChange: idle,
          });
        }
      }
    }
  }

  const advisors = [...activityById.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  dormant.sort((a, b) => b.daysSinceChange - a.daysSinceChange);

  const agency = advisors.reduce(
    (total, a) => ({
      inPreparation: total.inPreparation + a.inPreparation,
      ready: total.ready + a.ready,
      completed: total.completed + a.completed,
      signed: total.signed + a.signed,
    }),
    { inPreparation: 0, ready: 0, completed: 0, signed: 0 },
  );

  return { advisors, dormant, agency, thresholds };
}
