import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { DossierPublicView } from '@/features/buyer-dossier/components/dossier-public-view';
import { loadBuyerDossier } from '@/features/buyer-dossier/queries/load-buyer-dossier';
import {
  DOSSIER_TOKEN_PATTERN,
  hashDossierToken,
} from '@/features/buyer-dossier/services/dossier-token';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

// Jamais indexée (l'en-tête X-Robots-Tag le redit, next.config.ts).
export const metadata: Metadata = {
  title: 'Votre sélection',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

// Mission 119 (partie B) — le dossier acquéreur ouvert par son lien, SANS compte : le jeton est relu
// (forme, condensat, 30 jours), puis le dossier est construit par la clé de service, cadré sur la
// fiche, la sélection et l'agence du lien. Lien inconnu ou expiré : page introuvable, sans rien dire.
export default async function PublicBuyerDossierPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!DOSSIER_TOKEN_PATTERN.test(token)) notFound();
  const admin = createServiceRoleClient();
  const { data: link } = await admin
    .from('buyer_dossier_links')
    .select('buyer_id, agency_id, selection_id, expires_at, created_by')
    .eq('token_hash', hashDossierToken(token))
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (!link) notFound();
  const dossier = await loadBuyerDossier(
    admin,
    link.buyer_id,
    link.agency_id,
    link.selection_id,
    link.created_by,
  );
  if (!dossier) notFound();
  return <DossierPublicView token={token} dossier={dossier} />;
}
