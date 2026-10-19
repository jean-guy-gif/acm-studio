import { DossierStepsBar } from '@/features/projects/components/dossier-steps-bar';
import { NextStepButton } from '@/features/projects/components/next-step-button';
import { nextDossierAction } from '@/features/projects/services/dossier-steps';
import { evaluateProjectReadiness } from '@/features/projects/services/project-readiness';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';
import { getProject } from '@/features/projects/queries/get-project';
import { ExampleBadge } from '@/features/welcome/components/example-badge';

// Mission 97 — tous les écrans d'un dossier portent la même barre d'étapes. Un dossier absent
// ou d'une autre agence n'en a pas : la page elle-même répond « introuvable ».
export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getProject(projectId);
  // Mission 110 — l'étape suivante, d'après l'état du dossier en base.
  const profile = project ? await getProfile() : null;
  const readiness =
    project && profile
      ? await evaluateProjectReadiness(await createClient(), projectId, profile.agency_id)
      : null;
  const action =
    project && readiness
      ? nextDossierAction(projectId, {
          status: project.status,
          hasProperty: readiness.hasProperty,
          exploitableCount: readiness.exploitableCount,
          hasDecision: readiness.hasPositioning,
          liveStarted: project.live_started_at != null,
          liveEnded: project.live_ended_at != null,
        })
      : null;

  return (
    <div className="flex flex-col gap-5">
      {project ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-zinc-200/80 pb-3 stage:border-white/10">
          <DossierStepsBar projectId={projectId} />
          {project.is_example ? (
            <span className="flex items-center gap-2 text-xs text-zinc-500 stage:text-white/60">
              <ExampleBadge />
              Données fictives, pour découvrir l’outil et s’entraîner.
            </span>
          ) : null}
          {action ? <NextStepButton projectId={projectId} action={action} /> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
