import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { backLink, btnSecondary, sectionTitle } from '@/components/ui/styles';
import { BuyerLetterEditor } from '@/features/buyer-prospecting/components/buyer-letter-editor';
import { getBuyerLetter } from '@/features/buyer-prospecting/queries/get-buyer-letter';
import { buyerLetterAddressee } from '@/features/buyer-prospecting/services/buyer-letter';
import { FILE_BLOCKER_MESSAGES } from '@/features/prospecting-file/services/file-access';

// Le titre de la page est le nom que le navigateur propose au fichier PDF.
export const metadata: Metadata = { title: 'Courrier au propriétaire' };

// Mission 120 — le courrier au propriétaire né d'une recherche acquéreur : édition et impression
// A4. Écran conseiller : une origine de l'agence, sur une fiche non archivée, sinon 404. Les
// blocages de tout courrier propriétaire s'y disent, avec le geste qui les lève.
export default async function BuyerLetterPage({
  params,
}: {
  params: Promise<{ originId: string }>;
}) {
  const { originId } = await params;
  const context = await getBuyerLetter(originId);
  if (context.status === 'not_found') {
    notFound();
  }
  if (context.status === 'ready') {
    return (
      <BuyerLetterEditor
        originId={context.originId}
        buyerId={context.buyerId}
        addressee={buyerLetterAddressee(context.facts, context.address)}
        addressSource={context.addressSource}
        defaults={context.defaults}
        initial={{
          title: context.overrides.title ?? context.defaults.title,
          letter: context.overrides.letter ?? context.defaults.letter,
          contactHook: context.overrides.contactHook ?? context.defaults.contactHook,
        }}
        sender={context.sender}
        theirPhoto={context.theirPhoto}
        qr={context.qr}
      />
    );
  }
  return (
    <main
      className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-4 bg-white px-6 py-10 text-zinc-900"
      data-testid="buyer-letter-blocked"
    >
      <Link href={`/acquereurs/${context.buyerId}`} className={backLink}>
        ← Retour à la fiche
      </Link>
      <h1 className={sectionTitle}>Courrier au propriétaire</h1>
      <p className="text-sm font-medium text-amber-700">{FILE_BLOCKER_MESSAGES[context.blocker]}</p>
      {context.blocker === 'address_unconfirmed' ? (
        <Link href="/prospection?origine=acquereur" className={`${btnSecondary} self-start`}>
          Confirmer l’adresse dans Prospection
        </Link>
      ) : null}
      {context.blocker === 'agency_address_missing' ||
      context.blocker === 'professional_card_missing' ? (
        <Link href="/admin/identite" className={`${btnSecondary} self-start`}>
          Ouvrir Administration → Identité
        </Link>
      ) : null}
      {context.blocker === 'phone_missing' ? (
        <Link href="/profil" className={`${btnSecondary} self-start`}>
          Ouvrir « Mon profil »
        </Link>
      ) : null}
    </main>
  );
}
