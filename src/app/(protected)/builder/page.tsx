import Link from 'next/link';

import { SubmitButton } from '@/components/submit-button';
import { deleteProject } from '@/features/projects/actions/delete-project';
import { getProjects } from '@/features/projects/queries/get-projects';
import { statusLabel } from '@/features/projects/status-label';

type BuilderPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function BuilderPage({ searchParams }: BuilderPageProps) {
  const [projects, { error }] = await Promise.all([getProjects(), searchParams]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Builder</h1>
          <p className="text-zinc-500">Dossiers vendeurs</p>
        </div>
        <Link
          href="/builder/new"
          className="rounded border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Nouveau dossier vendeur
        </Link>
      </div>

      {error ? <p role="alert">{error}</p> : null}

      {projects.length === 0 ? (
        <div className="flex flex-col gap-1 text-zinc-500">
          <p>Aucun dossier vendeur.</p>
          <p>Créez votre premier dossier pour préparer un rendez-vous vendeur.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {projects.map((project) => (
            <li
              key={project.id}
              className="flex items-center justify-between gap-4 rounded border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <div className="flex flex-col">
                <span className="font-medium">{project.seller_name}</span>
                <span className="text-sm text-zinc-500">
                  {project.seller_email || '—'} · {project.seller_phone || '—'}
                </span>
                <span className="text-sm text-zinc-500">
                  {statusLabel(project.status)} ·{' '}
                  {new Date(project.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/builder/${project.id}`} className="underline">
                  Ouvrir
                </Link>
                <form action={deleteProject}>
                  <input type="hidden" name="projectId" value={project.id} />
                  <SubmitButton
                    pendingLabel="Suppression…"
                    className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    Supprimer
                  </SubmitButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
