import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { MarketUpdateDocument } from '@/features/market-update/components/market-update-document';
import { MarketUpdateDownloadButton } from '@/features/market-update/components/market-update-download-button';
import { loadMarketUpdate } from '@/features/market-update/queries/load-market-update';
import {
  hashMarketUpdateToken,
  MARKET_UPDATE_TOKEN_PATTERN,
} from '@/features/market-update/services/market-update-token';
import { clientTexts } from '@/lib/client-texts';
import { projectLanguage } from '@/lib/client-texts/link-language';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

// Jamais indexée (l'en-tête X-Robots-Tag le redit, next.config.ts).
const ROBOTS: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

// Mission 140 — le titre d'onglet dans la langue du client que le lien désigne.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const admin = createServiceRoleClient();
  const { data } = MARKET_UPDATE_TOKEN_PATTERN.test(token)
    ? await admin
        .from('project_market_update_links')
        .select('project_id')
        .eq('token_hash', hashMarketUpdateToken(token))
        .maybeSingle()
    : { data: null };
  const language = await projectLanguage(admin, data?.project_id ?? null);
  return { ...ROBOTS, title: clientTexts(language).documents.marketUpdate.coverTitle };
}

// Mission 127 — le Point marché ouvert par son lien, SANS compte : le jeton est relu ici (forme,
// condensat, 30 jours), puis le document est construit par la clé de service, cadré sur le
// dossier, le point et l'agence du lien. Lien inconnu ou expiré : page introuvable.
export default async function PublicMarketUpdatePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!MARKET_UPDATE_TOKEN_PATTERN.test(token)) notFound();
  const admin = createServiceRoleClient();
  const { data: link } = await admin
    .from('project_market_update_links')
    .select('project_id, agency_id, update_id, expires_at')
    .eq('token_hash', hashMarketUpdateToken(token))
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (!link) notFound();
  const document = await loadMarketUpdate(admin, link.project_id, link.agency_id, link.update_id);
  if (!document) notFound();
  return (
    <main className="min-h-screen bg-zinc-100 p-4 pb-20 print:bg-white print:p-0">
      <MarketUpdateDocument document={document} />
      <MarketUpdateDownloadButton
        label={clientTexts(document.language).documents.marketUpdate.download}
      />
    </main>
  );
}
