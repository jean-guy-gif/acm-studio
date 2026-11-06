import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { backLink } from '@/components/ui/styles';
import { OfferDocument } from '@/features/purchase-offer/components/offer-document';
import { OfferLinksPanel } from '@/features/purchase-offer/components/offer-links-panel';
import { loadSignedOffer } from '@/features/purchase-offer/queries/load-offer';
import { frenchDay } from '@/features/purchase-offer/services/offer-dates';
import { SynthesisPrintButton } from '@/features/seller-synthesis/components/synthesis-print-button';
import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const metadata: Metadata = { title: 'Offre d’achat signée — ACM Studio' };

type Props = { params: Promise<{ buyerId: string; documentId: string }> };

// Mission 137 (partie B) — une offre signée, à imprimer (A4, l'impression du navigateur, M84) ou à
// envoyer par ses liens ; la réponse du vendeur s'y lit dès qu'elle est donnée. Cadrée sur l'agence.
export default async function SignedOfferPage({ params }: Props) {
  const { buyerId, documentId } = await params;
  const profile = await getProfile();
  if (!profile || profile.removed_at) notFound();
  const admin = createServiceRoleClient();
  const offer = await loadSignedOffer(admin, documentId, profile.agency_id);
  if (!offer) notFound();
  const [{ data: buyer }, { data: project }] = await Promise.all([
    offer.buyerId
      ? admin
          .from('buyers')
          .select('email')
          .eq('id', offer.buyerId)
          .eq('agency_id', profile.agency_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    offer.fields?.projectId
      ? admin
          .from('projects')
          .select('seller_email, seller_phone')
          .eq('id', offer.fields.projectId)
          .eq('agency_id', profile.agency_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return (
    <div className="flex min-h-screen flex-col gap-6 bg-zinc-100 p-4 lg:p-6 print:block print:bg-white print:p-0">
      <header className="mx-auto flex w-full max-w-[210mm] flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 print:hidden">
        <Link href={`/acquereurs/${buyerId}`} className={backLink}>
          ← La fiche de l’acquéreur
        </Link>
        <SynthesisPrintButton />
        {offer.answer == null ? (
          <OfferLinksPanel
            documentId={offer.id}
            buyerEmail={buyer?.email ?? null}
            sellerEmail={project?.seller_email ?? null}
            sellerPhone={project?.seller_phone ?? null}
            validUntil={frenchDay(offer.validUntil)}
            advisorFirstName={profile.first_name ?? null}
          />
        ) : null}
      </header>
      <OfferDocument offer={offer} />
    </div>
  );
}
