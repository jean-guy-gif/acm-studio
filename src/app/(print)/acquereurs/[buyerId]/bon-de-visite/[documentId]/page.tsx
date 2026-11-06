import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { backLink } from '@/components/ui/styles';
import { SynthesisPrintButton } from '@/features/seller-synthesis/components/synthesis-print-button';
import { VoucherDocument } from '@/features/visit-voucher/components/voucher-document';
import { VoucherShare } from '@/features/visit-voucher/components/voucher-share';
import { loadSignedVoucher } from '@/features/visit-voucher/queries/load-voucher';
import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const metadata: Metadata = { title: 'Bon de visite signé — ACM Studio' };

type Props = { params: Promise<{ buyerId: string; documentId: string }> };

// Mission 137 — un bon de visite signé, à imprimer (A4, l'impression du navigateur, rien n'est
// fabriqué côté serveur, M84) ou à envoyer au visiteur par un lien. Le texte est celui figé à la
// signature ; cadré sur l'agence de l'appelant.
export default async function SignedVoucherPage({ params }: Props) {
  const { buyerId, documentId } = await params;
  const profile = await getProfile();
  if (!profile || profile.removed_at) notFound();
  const admin = createServiceRoleClient();
  const voucher = await loadSignedVoucher(admin, documentId, profile.agency_id);
  if (!voucher) notFound();
  const { data: buyer } = voucher.buyerId
    ? await admin
        .from('buyers')
        .select('email')
        .eq('id', voucher.buyerId)
        .eq('agency_id', profile.agency_id)
        .maybeSingle()
    : { data: null };
  return (
    <div className="flex min-h-screen flex-col gap-6 bg-zinc-100 p-4 lg:p-6 print:block print:bg-white print:p-0">
      <header className="mx-auto flex w-full max-w-[210mm] flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 print:hidden">
        <Link href={`/acquereurs/${buyerId}`} className={backLink}>
          ← La fiche de l’acquéreur
        </Link>
        <SynthesisPrintButton />
        <VoucherShare documentId={voucher.id} initialLinkPath={null} email={buyer?.email ?? null} />
      </header>
      <VoucherDocument voucher={voucher} />
    </div>
  );
}
