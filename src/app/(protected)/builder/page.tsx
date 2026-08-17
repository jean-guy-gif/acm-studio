import Link from 'next/link';

import { SubmitButton } from '@/components/submit-button';
import { btnDanger, btnPrimary, card, link } from '@/components/ui/styles';
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
          <h1 className="text-2xl font-semibold">Préparation</h1>
          <p className="text-zinc-500">Dossiers vendeurs</p>
        </div>
        <Link href="/builder/new" className={btnPrimary}>
          Nouveau dossier vendeur
        </Link>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </p>
      ) : null}

      {projects.length === 0 ? (
        <div className={`flex flex-col gap-1 p-6 text-zinc-500 ${card}`}>
          <p className="font-medium text-zinc-700 dark:text-zinc-200">Aucun dossier vendeur.</p>
          <p>Créez votre premier dossier pour préparer un rendez-vous vendeur.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {projects.map((project) => (
            <li key={project.id} className={`flex items-center justify-between gap-4 p-4 ${card}`}>
              <div className="flex min-w-0 flex-col">
                <span className="font-medium">{project.seller_name}</span>
                <span className="truncate text-sm text-zinc-500">
                  {project.seller_email || '—'} · {project.seller_phone || '—'}
                </span>
                <span className="text-sm text-zinc-500">
                  {statusLabel(project.status)} ·{' '}
                  {new Date(project.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Link href={`/builder/${project.id}`} className={`text-sm font-medium ${link}`}>
                  Ouvrir
                </Link>
                <form action={deleteProject}>
                  <input type="hidden" name="projectId" value={project.id} />
                  <SubmitButton pendingLabel="Suppression…" className={btnDanger}>
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
