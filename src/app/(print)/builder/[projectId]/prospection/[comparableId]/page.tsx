import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { backLink, btnSecondary, hintText, sectionTitle } from '@/components/ui/styles';
import { ProspectingFileEditor } from '@/features/prospecting-file/components/prospecting-file-editor';
import { getProspectingFile } from '@/features/prospecting-file/queries/get-prospecting-file';
import { FILE_BLOCKER_MESSAGES } from '@/features/prospecting-file/services/file-access';
import { PROSPECTING_FILE_VERSION_LABELS } from '@/features/prospecting-file/types';

// Le titre de la page est le nom que le navigateur propose au fichier PDF.
export const metadata: Metadata = { title: 'Dossier de prospection' };

type ProspectingFilePageProps = {
  params: Promise<{ projectId: string; comparableId: string }>;
  searchParams: Promise<{ version?: string | string[] }>;
};

// Mission 84 — le dossier de prospection d'un concurrent : édition et impression A4. Écran
// conseiller : dossier de l'agence, conclu « mandat signé », concurrent retenu, sinon 404.
export default async function ProspectingFilePage({
  params,
  searchParams,
}: ProspectingFilePageProps) {
  const { projectId, comparableId } = await params;
  const { version } = await searchParams;

  const context = await getProspectingFile(projectId, comparableId, version);
  if (context.status === 'not_found') {
    notFound();
  }

  if (context.status === 'ready') {
    return (
      <ProspectingFileEditor
        projectId={projectId}
        competitorId={comparableId}
        version={context.version}
        facts={context.facts}
        sender={context.sender}
        overrides={context.overrides}
        photos={context.photos}
        qr={context.qr}
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-4 bg-white px-6 py-10 text-zinc-900">
      <Link href={`/builder/${projectId}`} className={backLink}>
        ← Retour au dossier
      </Link>
      <h1 className={sectionTitle}>Dossier de prospection</h1>
      {context.status === 'blocked' ? (
        <>
          <p className="text-sm font-medium text-amber-700">
            {FILE_BLOCKER_MESSAGES[context.blocker]}
          </p>
          {context.blocker === 'phone_missing' ? (
            <Link href="/profil" className={`${btnSecondary} self-start`}>
              Ouvrir « Mon profil »
            </Link>
          ) : null}
        </>
      ) : (
        <>
          <p className={hintText}>
            ACM ne sait pas si ce bien est en exclusivité : choisissez à qui s’adresse le dossier.
          </p>
          <ul className="flex flex-col gap-2">
            {context.versions.map(({ version: candidate, blocker }) => (
              <li key={candidate} className="flex flex-wrap items-center gap-3">
                {blocker ? (
                  <span className="text-sm text-zinc-600">
                    {PROSPECTING_FILE_VERSION_LABELS[candidate]} : {FILE_BLOCKER_MESSAGES[blocker]}
                  </span>
                ) : (
                  <Link
                    href={`/builder/${projectId}/prospection/${comparableId}?version=${candidate}`}
                    className={btnSecondary}
                  >
                    Dossier {PROSPECTING_FILE_VERSION_LABELS[candidate].toLowerCase()}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
