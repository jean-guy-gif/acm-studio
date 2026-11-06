import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { MarketUpdateDownloadButton } from '@/features/market-update/components/market-update-download-button';
import { OfferDocument } from '@/features/purchase-offer/components/offer-document';
import { SellerResponse } from '@/features/purchase-offer/components/seller-response';
import { findOfferByToken } from '@/features/purchase-offer/queries/load-offer';
import { frenchDay } from '@/features/purchase-offer/services/offer-input';
import { parisDateLabel } from '@/features/visit-voucher/services/voucher-fields';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

// Jamais indexée (l'en-tête X-Robots-Tag le redit, next.config.ts).
export const metadata: Metadata = {
  title: 'Offre d’achat',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

const parisToday = (): string => {
  const [day, month, year] = parisDateLabel(new Date()).split('/');
  return `${year}-${month}-${day}`;
};

// Mission 137 (partie B) — l'offre d'achat signée, ouverte par son lien SANS compte : le jeton est
// relu ici (forme, condensat, 30 jours). Le lien des offrants montre leur copie ; celui du vendeur,
// tant que l'offre est valable et sans réponse, propose « Bon pour acceptation » ou « Je refuse ».
export default async function PublicOfferPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await findOfferByToken(createServiceRoleClient(), token);
  if (!found) notFound();
  const { offer, audience } = found;
  const open = audience === 'seller' && !offer.answer && offer.validUntil >= parisToday();
  return (
    <main className="flex min-h-screen flex-col gap-4 bg-zinc-100 p-4 pb-20 print:bg-white print:p-0">
      {audience === 'seller' && !offer.answer && !open ? (
        <p
          role="status"
          className="mx-auto max-w-[210mm] text-sm font-semibold text-zinc-700 print:hidden"
          data-testid="offer-expired"
        >
          Cette offre n’est plus valable : elle l’était jusqu’au {frenchDay(offer.validUntil)}{' '}
          inclus.
        </p>
      ) : null}
      <OfferDocument offer={offer} />
      {open ? <SellerResponse token={token} validUntil={frenchDay(offer.validUntil)} /> : null}
      <MarketUpdateDownloadButton />
    </main>
  );
}
