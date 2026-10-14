import type { Metadata } from 'next';
import Link from 'next/link';

import { backLink, hintText, sectionTitle } from '@/components/ui/styles';
import { PrintButton } from '@/features/competitor-locator/components/print-button';
import { getSuiviDossiers } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import { ProspectingFileDocument } from '@/features/prospecting-file/components/prospecting-file-document';
import { getProspectingFile } from '@/features/prospecting-file/queries/get-prospecting-file';
import {
  splitBatchLetters,
  excludedFromBatch,
} from '@/features/prospecting-file/services/batch-letters';
import { savedDocument } from '@/features/prospecting-file/services/saved-document';
import { MarkLettersHanded } from '@/features/prospecting/components/mark-letters-handed';
import { getAgencyProspecting } from '@/features/prospecting/queries/get-agency-prospecting';
import {
  parseSellerFilter,
  prospectionHref,
} from '@/features/prospecting/services/filter-prospecting';
import { cardCopy } from '@/features/prospecting/services/group-prospecting';

// Le titre de la page est le nom que le navigateur propose au fichier PDF.
export const metadata: Metadata = { title: 'Courriers de prospection' };

type LettersPageProps = {
  searchParams: Promise<{ bien?: string }>;
};

// Les documents se suivent : chacun commence sur une feuille neuve.
const BATCH_CSS =
  '@media print { .pf-batch .pf-doc { break-after: page; } .pf-batch .pf-doc:last-child { break-after: auto; } } @media screen { .pf-batch { display: flex; flex-direction: column; gap: 8mm; } }';

// Mission 98 — « Préparer tous les courriers » d'un bien vendeur : UN document à imprimer, avec
// le courrier de chaque concurrent « prêt à envoyer », dans sa version (propriétaire ou
// confrère), tel qu'enregistré — ou tel que proposé si le conseiller n'y a pas touché. Un
// courrier retenu (M90, liste « Ne plus solliciter ») est listé en tête avec sa raison, et
// n'est pas imprimé. Écran conseiller : chaque courrier passe par getProspectingFile, cadré sur
// l'agence de l'appelant.
export default async function LettersPage({ searchParams }: LettersPageProps) {
  const { bien } = await searchParams;
  const { sellers, cards } = await getAgencyProspecting(await getSuiviDossiers());
  const sellerId = parseSellerFilter(bien, sellers);
  const seller = sellers.find((item) => item.projectId === sellerId);

  if (!sellerId || !seller) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-4 bg-white px-6 py-10 text-zinc-900">
        <Link href="/prospection" className={backLink}>
          ← Retour à Prospection
        </Link>
        <h1 className={sectionTitle}>Courriers de prospection</h1>
        <p className={hintText}>
          Choisissez d’abord un bien vendeur dans Prospection : les courriers se préparent pour un
          mandat à la fois.
        </p>
      </main>
    );
  }

  const ready = cards.filter(
    (card) =>
      card.row.status === 'ready' &&
      card.row.opposedOn == null &&
      card.sellers.some((item) => item.projectId === sellerId),
  );
  const prepared = await Promise.all(
    ready.map(async (card) => {
      const { row } = cardCopy(card, sellerId);
      return { row, context: await getProspectingFile(sellerId, row.id, undefined) };
    }),
  );
  // Mission 102 — les mêmes blocages que le courrier unitaire, carte professionnelle comprise.
  const split = splitBatchLetters(prepared);
  const letters = split.letters.map(({ row, context }) => ({
    row,
    document: savedDocument(context),
  }));
  // Mission 105 — avec, en tête, les adresses écartées avant la préparation, et leur raison.
  const held = [
    ...excludedFromBatch(
      cards
        .filter((card) => card.sellers.some((item) => item.projectId === sellerId))
        .map((card) => ({
          row: cardCopy(card, sellerId).row,
          status: card.row.status,
          opposed: card.row.opposedOn != null,
        })),
    ),
    ...split.held,
  ];

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-zinc-100 p-4 lg:p-6 print:block print:bg-white print:p-0">
      <header className="mx-auto flex w-full max-w-[210mm] flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 text-zinc-900 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={prospectionHref(sellerId, 'all')} className={backLink}>
            ← Retour à Prospection
          </Link>
          {letters.length > 0 ? <PrintButton /> : null}
        </div>
        <div className="flex flex-col gap-1">
          <h1 className={sectionTitle}>Courriers de prospection</h1>
          <p className={hintText}>
            Pour : {seller.name}
            {seller.label ? ` · ${seller.label}` : ''} — {letters.length} courrier
            {letters.length > 1 ? 's' : ''} prêt{letters.length > 1 ? 's' : ''} à imprimer, tel
            {letters.length > 1 ? 's' : ''} qu’enregistré{letters.length > 1 ? 's' : ''}. Pour
            modifier un texte ou une photo, ouvrez le dossier depuis sa carte.
          </p>
        </div>

        {held.length > 0 ? (
          <div className="flex flex-col gap-1.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-semibold">
              {held.length} courrier{held.length > 1 ? 's' : ''} non imprimé
              {held.length > 1 ? 's' : ''}&nbsp;:
            </p>
            <ul className="flex list-disc flex-col gap-1 pl-5">
              {held.map(({ row, reason }) => (
                <li key={row.id}>
                  <span className="font-medium">{row.address ?? 'Adresse non localisée'}</span> —{' '}
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {letters.length > 0 ? (
          <MarkLettersHanded
            projectId={sellerId}
            competitorIds={letters.map(({ row }) => row.id)}
          />
        ) : (
          <p className="text-sm text-zinc-600">
            Aucun courrier à imprimer : aucun concurrent de ce bien n’est « prêt à envoyer ».
          </p>
        )}
      </header>

      <style dangerouslySetInnerHTML={{ __html: BATCH_CSS }} />
      <div className="pf-batch mx-auto">
        {letters.map(({ row, document }) => (
          <ProspectingFileDocument key={row.id} {...document} />
        ))}
      </div>
    </div>
  );
}
