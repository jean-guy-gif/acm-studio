import Link from 'next/link';
import { notFound } from 'next/navigation';

import { backLink, hintText, sectionTitle } from '@/components/ui/styles';
import { BuyerLetterDocument } from '@/features/buyer-prospecting/components/buyer-letter-document';
import { getBuyerBatchLetters } from '@/features/buyer-prospecting/queries/get-buyer-batch-letters';
import {
  buyerLetterAddressee,
  colleagueAddressee,
} from '@/features/buyer-prospecting/services/buyer-letter';
import { savedBuyerLetter } from '@/features/buyer-prospecting/services/saved-buyer-letter';
import { ScaledSheet } from '@/components/document-editor/document-editor-layout';
import { PrintButton } from '@/features/competitor-locator/components/print-button';
import { MarkLettersHanded } from '@/features/prospecting/components/mark-letters-handed';

// Les documents se suivent : chacun commence sur une feuille neuve.
const BATCH_CSS =
  '@media print { .pf-batch .pf-doc { break-after: page; } .pf-batch .pf-doc:last-child { break-after: auto; } } @media screen { .pf-batch { display: flex; flex-direction: column; gap: 8mm; } }';

const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? 's' : ''}`;

// Mission 120 B — « Préparer tous les courriers » d'une recherche acquéreur (maquette M120B-3) :
// en tête ce qui n'est pas imprimé, avec sa raison ; puis chaque courrier ou dossier au confrère,
// tel qu'enregistré. « Marquer tous remis » ne touche que les biens démarchés de cette recherche.
export async function BuyerLettersBatch({ buyerId }: { buyerId: string }) {
  const batch = await getBuyerBatchLetters(buyerId);
  if (!batch) {
    notFound();
  }
  const { letters, held } = batch;
  const prospectIds = letters.flatMap(({ item }) => (item.prospectId ? [item.prospectId] : []));
  return (
    <div className="flex min-h-screen flex-col gap-6 bg-zinc-100 p-4 lg:p-6 print:block print:bg-white print:p-0">
      <header
        className="mx-auto flex w-full max-w-[210mm] flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 text-zinc-900 print:hidden"
        data-testid="buyer-letters-batch"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/acquereurs/${batch.buyerId}`} className={backLink}>
            ← Retour à la fiche
          </Link>
          {letters.length > 0 ? <PrintButton /> : null}
        </div>
        <div className="flex flex-col gap-1">
          <h1 className={sectionTitle}>Courriers de la recherche</h1>
          <p className={hintText}>
            Pour : {batch.buyerName} — {plural(letters.length, 'document')} prêt
            {letters.length > 1 ? 's' : ''} à imprimer, tel{letters.length > 1 ? 's' : ''}{' '}
            qu’enregistré{letters.length > 1 ? 's' : ''}. Pour modifier un texte ou une photo,
            ouvrez-le depuis sa visite.
          </p>
        </div>

        {held.length > 0 ? (
          <div
            className="flex flex-col gap-1.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
            data-testid="buyer-letters-held"
          >
            <p className="font-semibold">
              {plural(held.length, 'courrier')} non imprimé{held.length > 1 ? 's' : ''}&nbsp;:
            </p>
            <ul className="flex list-disc flex-col gap-1 pl-5">
              {held.map(({ item, reason }) => (
                <li key={item.originId}>
                  <span className="font-medium">{item.label}</span> — {reason}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {letters.length === 0 ? (
          <p className="text-sm text-zinc-600">
            Aucun document à imprimer : aucun courrier de cette recherche n’est « prêt à envoyer ».
          </p>
        ) : prospectIds.length > 0 ? (
          <MarkLettersHanded
            buyerProspectIds={prospectIds}
            note="Un dossier au confrère compte comme « contacté »."
          />
        ) : null}
      </header>

      <style dangerouslySetInnerHTML={{ __html: BATCH_CSS }} />
      {/* Les feuilles réduites à la largeur de l'écran, jamais coupées ni défilées de côté (R2). */}
      <div className="mx-auto w-full max-w-[210mm] print:max-w-none">
        <ScaledSheet>
          <div className="pf-batch">
            {letters.map(({ item, context }) => (
              <BuyerLetterDocument
                key={item.originId}
                version={context.version}
                exclusivityCard={context.version === 'colleague' ? context.exclusivityCard : null}
                addressee={
                  context.version === 'colleague' || context.address == null
                    ? colleagueAddressee(context.exclusivityCard.label)
                    : buyerLetterAddressee(context.facts, context.address)
                }
                addressSource={context.addressSource}
                {...savedBuyerLetter(context)}
                sender={context.sender}
                qr={context.qr}
              />
            ))}
          </div>
        </ScaledSheet>
      </div>
    </div>
  );
}
