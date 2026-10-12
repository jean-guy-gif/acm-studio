import { DossierStepsBar } from '@/features/projects/components/dossier-steps-bar';
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
        </div>
      ) : null}
      {children}
    </div>
  );
}
