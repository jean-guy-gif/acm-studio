import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { backLink } from '@/components/ui/styles';
import { PrintButton } from '@/features/competitor-locator/components/print-button';
import { ProspectingList } from '@/features/competitor-locator/components/prospecting-list';
import { getProspectingRows } from '@/features/competitor-locator/queries/get-prospecting-rows';
import { isProspectingOpen } from '@/features/competitor-locator/services/build-prospecting-rows';
import { getConclusion } from '@/features/meeting-conclusion/queries/get-conclusion';
import { getProject } from '@/features/projects/queries/get-project';

export const metadata: Metadata = { title: 'Liste de tournée — ACM Studio' };

type ProspectionPageProps = {
  params: Promise<{ projectId: string }>;
};

// Mission 75 — la liste de tournée, version imprimable A4 de « Concurrents à prospecter ».
// Écran conseiller : dossier de l'agence, conclu « mandat signé », sinon 404.
export default async function ProspectionPage({ params }: ProspectionPageProps) {
  const { projectId } = await params;

  const project = await getProject(projectId);
  if (!project) {
    notFound();
  }
  const conclusion = await getConclusion(projectId);
  if (!isProspectingOpen(project.status, conclusion?.outcome)) {
    notFound();
  }
  const rows = await getProspectingRows(projectId);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[210mm] flex-col gap-5 bg-white px-6 py-8 text-zinc-900 print:max-w-none print:p-0">
      <style>{'@page { size: A4; margin: 15mm; }'}</style>
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link href={`/builder/${projectId}`} className={backLink}>
          ← Retour au dossier
        </Link>
        <PrintButton />
      </div>

      <header className="flex flex-col gap-1 border-b border-zinc-300 pb-3">
        <h1 className="text-xl font-bold text-black">Concurrents à prospecter</h1>
        <p className="text-sm text-zinc-700">
          Dossier {project.seller_name} · liste éditée le {new Date().toLocaleDateString('fr-FR')}
        </p>
        <p className="text-xs text-zinc-500">Document interne à l’agence.</p>
      </header>

      {rows.length > 0 ? (
        <ProspectingList rows={rows} />
      ) : (
        <p className="text-sm text-zinc-600">Aucun concurrent retenu dans ce dossier.</p>
      )}
    </main>
  );
}
