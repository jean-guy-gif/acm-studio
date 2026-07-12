import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/queries/get-project';
import { statusLabel } from '@/features/projects/status-label';

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const project = await getProject(projectId);

  if (!project) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/builder" className="underline">
        Retour aux dossiers
      </Link>
      <h1 className="text-2xl font-semibold">Dossier vendeur</h1>
      <div className="flex flex-col gap-1">
        <p>Nom du vendeur : {project.seller_name}</p>
        <p>Email : {project.seller_email || '—'}</p>
        <p>Téléphone : {project.seller_phone || '—'}</p>
        <p>Statut : {statusLabel(project.status)}</p>
        <p>Date de création : {new Date(project.created_at).toLocaleDateString('fr-FR')}</p>
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Bien vendeur</h2>
        <Link href={`/builder/${projectId}/property`} className="underline">
          Compléter la fiche
        </Link>
      </div>
    </div>
  );
}
