import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { MarketUpdateDownloadButton } from '@/features/market-update/components/market-update-download-button';
import { MarketStudyDocument } from '@/features/market-study/components/market-study-document';
import { findMarketStudyLink } from '@/features/market-study/queries/find-market-study-link';
import { loadMarketStudy } from '@/features/market-study/queries/load-market-study';
import { clientTexts } from '@/lib/client-texts';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

// Jamais indexée (l'en-tête X-Robots-Tag le redit, next.config.ts).
export const metadata: Metadata = {
  title: 'Étude de marché',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

// Mission 131 — l'Étude de marché ouverte par son lien, SANS compte : le jeton est relu ici (forme,
// condensat, 30 jours), puis le document est construit par la clé de service, cadré sur le dossier
// et l'agence du lien. Lien inconnu, retiré ou expiré : « Ce lien n'est plus valable ».
export default async function PublicMarketStudyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createServiceRoleClient();
  const link = await findMarketStudyLink(admin, token);
  if (!link) notFound();
  const document = await loadMarketStudy(admin, link.projectId, link.agencyId);
  if (!document) notFound();
  return (
    <main className="min-h-screen bg-zinc-100 p-4 pb-20 print:bg-white print:p-0">
      <MarketStudyDocument document={document} />
      <MarketUpdateDownloadButton
        label={clientTexts(document.language).documents.marketUpdate.download}
      />
    </main>
  );
}
