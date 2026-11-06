import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { MarketUpdateDownloadButton } from '@/features/market-update/components/market-update-download-button';
import { VoucherDocument } from '@/features/visit-voucher/components/voucher-document';
import { findVoucherByToken } from '@/features/visit-voucher/queries/load-voucher';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

// Jamais indexée (l'en-tête X-Robots-Tag le redit, next.config.ts).
export const metadata: Metadata = {
  title: 'Bon de visite',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

// Mission 137 — le bon de visite signé, ouvert par son lien SANS compte : le jeton est relu ici
// (forme, condensat, 30 jours), puis le document de son agence, tel qu'il a été figé à la
// signature. Lien inconnu ou expiré : « Ce lien n'est plus valable ».
export default async function PublicVoucherPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const voucher = await findVoucherByToken(createServiceRoleClient(), token);
  if (!voucher) notFound();
  return (
    <main className="min-h-screen bg-zinc-100 p-4 pb-20 print:bg-white print:p-0">
      <VoucherDocument voucher={voucher} />
      <MarketUpdateDownloadButton />
    </main>
  );
}
