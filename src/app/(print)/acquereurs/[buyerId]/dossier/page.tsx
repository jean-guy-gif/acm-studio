import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { backLink, hintText } from '@/components/ui/styles';
import { BuyerDossierDocument } from '@/features/buyer-dossier/components/buyer-dossier-document';
import { DossierLinkButton } from '@/features/buyer-dossier/components/dossier-link-button';
import { DossierPhotoChoices } from '@/features/buyer-dossier/components/dossier-photo-choices';
import { loadBuyerDossier } from '@/features/buyer-dossier/queries/load-buyer-dossier';
import { SynthesisPrintButton } from '@/features/seller-synthesis/components/synthesis-print-button';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Dossier acquéreur',
  robots: { index: false, follow: false },
};

// Mission 119 (partie B) — le dossier acquéreur, côté conseiller : à imprimer (un bien par page), ou
// à envoyer par un lien valable 30 jours ; « Sans photo » par bien.
export default async function BuyerDossierPage({
  params,
}: {
  params: Promise<{ buyerId: string }>;
}) {
  const { buyerId } = await params;
  const profile = await getProfile();
  if (!profile || !/^[0-9a-f-]{36}$/i.test(buyerId)) notFound();
  const supabase = await createClient();
  const dossier = await loadBuyerDossier(supabase, buyerId, profile.agency_id, null, profile.id);
  if (!dossier) notFound();
  const { data: links } = await supabase
    .from('buyer_dossier_links')
    .select('id, created_at, expires_at')
    .eq('buyer_id', buyerId)
    .eq('agency_id', profile.agency_id)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  return (
    <div className="flex min-h-screen flex-col gap-6 bg-zinc-100 p-4 lg:p-6 print:block print:bg-white print:p-0">
      <header className="mx-auto flex w-full max-w-[210mm] flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/acquereurs/${buyerId}`} className={backLink}>
            ← Retour à la fiche
          </Link>
          <SynthesisPrintButton />
        </div>
        <p className={hintText}>
          Ce dossier suit sa recherche&nbsp;: ses mots, la grille de ses critères, un bien par page
          décrit par ses critères, puis «&nbsp;Mes choix&nbsp;», à cocher au stylo. Il ne contient
          ni adresse, ni titre, ni lien d’annonce. Sur le lien, l’acquéreur répond depuis son
          téléphone&nbsp;: une seule réponse, qui arrive sur sa fiche et sur Visites.
        </p>
        <DossierPhotoChoices
          buyerId={buyerId}
          items={dossier.photoChoices
            .filter((choice) => choice.hasPhoto)
            .map((choice) => ({
              id: choice.itemId,
              position: choice.letter,
              label: choice.label,
              hidden: choice.photoHidden,
            }))}
        />
        <DossierLinkButton
          buyerId={buyerId}
          advisorFirstName={profile.first_name}
          language={dossier.deck.language ?? 'fr'}
          links={(links ?? []).map((item) => ({
            id: item.id,
            createdAt: item.created_at,
            expiresAt: item.expires_at,
          }))}
        />
      </header>
      <BuyerDossierDocument dossier={dossier} />
    </div>
  );
}
