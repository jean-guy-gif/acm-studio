import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { backLink, hintText } from '@/components/ui/styles';
import { SynthesisPrintButton } from '@/features/seller-synthesis/components/synthesis-print-button';
import { SellerSynthesisDocument } from '@/features/seller-synthesis/components/seller-synthesis-document';
import { SynthesisLinkButton } from '@/features/seller-synthesis/components/synthesis-link-button';
import { loadSellerSynthesis } from '@/features/seller-synthesis/queries/load-seller-synthesis';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Synthèse pour le vendeur',
  robots: { index: false, follow: false },
};

// Mission 110 — la synthèse à laisser au vendeur, côté conseiller : à imprimer, ou à envoyer par
// un lien valable 30 jours.
export default async function SellerSynthesisPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const profile = await getProfile();
  if (!profile) {
    notFound();
  }
  const supabase = await createClient();
  const synthesis = await loadSellerSynthesis(supabase, projectId, profile.agency_id);
  if (!synthesis) {
    notFound();
  }
  // Les liens encore valables de ce dossier, pour les retirer.
  const { data: links } = await supabase
    .from('seller_synthesis_links')
    .select('id, created_at, expires_at')
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  return (
    <div className="flex min-h-screen flex-col gap-6 bg-zinc-100 p-4 lg:p-6 print:block print:bg-white print:p-0">
      <header className="mx-auto flex w-full max-w-[210mm] flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/builder/${projectId}/conclusion`} className={backLink}>
            ← Retour à la conclusion
          </Link>
          <SynthesisPrintButton />
        </div>
        <p className={hintText}>
          Ce document reprend ce que le vendeur a dit, le marché vu ensemble et votre prix. Il ne
          contient ni adresse ni annonce de concurrent.
        </p>
        <SynthesisLinkButton
          projectId={projectId}
          links={(links ?? []).map((item) => ({
            id: item.id,
            createdAt: item.created_at,
            expiresAt: item.expires_at,
          }))}
        />
      </header>
      <SellerSynthesisDocument synthesis={synthesis} />
    </div>
  );
}
