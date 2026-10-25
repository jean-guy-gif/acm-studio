import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BuyerDossierDocument } from '@/features/buyer-dossier/components/buyer-dossier-document';
import { DossierPhoneDeck } from '@/features/buyer-dossier/components/dossier-phone-deck';
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
  // Mission 122 (partie B) — le déroulé sur téléphone, aux couleurs de l'agence ; sa réponse déjà
  // envoyée s'affiche à la seconde ouverture, sans pouvoir répondre deux fois ; la présentation
  // terminée, « Ce que nous avons vu ensemble ». « Télécharger en PDF » imprime le dossier, présent
  // dans la page et caché à l'écran (décision de Jean-Guy, 25/10).
  return (
    <div data-dossier="" className="print:bg-white">
      {dossier.brandDeclarations ? (
        <style
          dangerouslySetInnerHTML={{ __html: `[data-dossier]{${dossier.brandDeclarations}}` }}
        />
      ) : null}
      <div className="print:hidden">
        <DossierPhoneDeck
          token={token}
          deck={dossier.deck}
          answered={dossier.answered}
          initialAnswers={dossier.answers}
          initialAvailability={dossier.availability}
          meetingAnswers={dossier.meetingAnswers}
          meetingAvailability={dossier.meetingAvailability}
          agencyName={dossier.agency.name}
          logoUrl={dossier.agency.logoUrl}
          advisorName={dossier.agency.advisorName}
          advisorPhone={dossier.agency.advisorPhone}
        />
      </div>
      <div className="hidden print:block" data-testid="dossier-print">
        <BuyerDossierDocument dossier={dossier} />
      </div>
    </div>
  );
}
