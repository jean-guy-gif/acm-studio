import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SellerSynthesisDocument } from '@/features/seller-synthesis/components/seller-synthesis-document';
import { loadSellerSynthesis } from '@/features/seller-synthesis/queries/load-seller-synthesis';
import {
  hashSynthesisToken,
  SYNTHESIS_TOKEN_PATTERN,
} from '@/features/seller-synthesis/services/synthesis-token';
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
  const { data } = SYNTHESIS_TOKEN_PATTERN.test(token)
    ? await admin
        .from('seller_synthesis_links')
        .select('project_id')
        .eq('token_hash', hashSynthesisToken(token))
        .maybeSingle()
    : { data: null };
  const language = await projectLanguage(admin, data?.project_id ?? null);
  return { ...ROBOTS, title: clientTexts(language).documents.synthesis.coverTitle };
}

// Mission 110 — la synthèse laissée au vendeur, ouverte par son lien, SANS compte : le jeton est
// relu ici (forme, condensat, 30 jours), puis la synthèse est construite par la clé de service,
// cadrée sur le dossier et l'agence du lien. Lien inconnu ou expiré : page introuvable, sans
// rien dire de plus.
export default async function PublicSynthesisPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!SYNTHESIS_TOKEN_PATTERN.test(token)) {
    notFound();
  }
  const admin = createServiceRoleClient();
  const { data: link } = await admin
    .from('seller_synthesis_links')
    .select('project_id, agency_id, expires_at, created_at')
    .eq('token_hash', hashSynthesisToken(token))
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (!link) {
    notFound();
  }
  // Mission 159 — le quartier tel qu'il était quand le lien a été créé.
  const synthesis = await loadSellerSynthesis(admin, link.project_id, link.agency_id, {
    quartierBefore: link.created_at,
  });
  if (!synthesis) {
    notFound();
  }
  return (
    <main className="min-h-screen bg-zinc-100 p-4 print:bg-white print:p-0">
      <SellerSynthesisDocument synthesis={synthesis} />
    </main>
  );
}
