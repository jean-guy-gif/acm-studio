import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { backLink, hintText } from '@/components/ui/styles';
import { MarketUpdateDocument } from '@/features/market-update/components/market-update-document';
import { MarketUpdateLinkButton } from '@/features/market-update/components/market-update-link-button';
import { loadMarketUpdate } from '@/features/market-update/queries/load-market-update';
import {
  marketUpdateLine,
  parseMarketUpdateSummary,
} from '@/features/market-update/services/market-update-summary';
import { SynthesisPhotoChoices } from '@/features/seller-synthesis/components/synthesis-photo-choices';
import { SynthesisPrintButton } from '@/features/seller-synthesis/components/synthesis-print-button';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Point marché',
  robots: { index: false, follow: false },
};

const day = (value: string): string =>
  new Date(value).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });

// Mission 127 — le Point marché, côté conseiller : le point choisi (le plus récent par défaut),
// à imprimer, ou à envoyer par un lien de 30 jours ; « Sans photo » par concurrent (M113).
export default async function MarketUpdatePage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ point?: string }>;
}) {
  const [{ projectId }, { point }] = await Promise.all([params, searchParams]);
  const profile = await getProfile();
  if (!profile) notFound();
  const supabase = await createClient();
  const { data: updates } = await supabase
    .from('project_market_updates')
    .select('id, made_at, summary')
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .order('made_at', { ascending: false });
  const points = (updates ?? []).flatMap((row) => {
    const summary = parseMarketUpdateSummary(row.summary);
    return summary ? [{ id: row.id, madeAt: row.made_at, line: marketUpdateLine(summary) }] : [];
  });
  const chosen = points.find((item) => item.id === point) ?? points[0];
  if (!chosen) notFound();
  const document = await loadMarketUpdate(supabase, projectId, profile.agency_id, chosen.id);
  if (!document) notFound();
  const { data: links } = await supabase
    .from('project_market_update_links')
    .select('id, created_at, expires_at')
    .eq('update_id', chosen.id)
    .eq('agency_id', profile.agency_id)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  const meeting = document.summary.meetingDate ? day(document.summary.meetingDate) : null;
  return (
    <div className="flex min-h-screen flex-col gap-6 bg-zinc-100 p-4 lg:p-6 print:block print:bg-white print:p-0">
      <header className="mx-auto flex w-full max-w-[210mm] flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/suivi" className={backLink}>
            ← Retour au Suivi
          </Link>
          <SynthesisPrintButton />
        </div>
        <h1 className="font-title text-2xl font-bold text-brand-deep">Point marché</h1>
        <p className="text-sm text-zinc-600">
          {[document.sellerName.trim() || null, document.propertyLabel].filter(Boolean).join(' · ')}
        </p>
        {points.length > 1 ? (
          <nav className="flex flex-wrap gap-2" aria-label="Les points marché de ce mandat">
            {points.map((item) => (
              <Link
                key={item.id}
                href={`/builder/${projectId}/point-marche?point=${item.id}`}
                aria-current={item.id === chosen.id ? 'page' : undefined}
                className={`rounded-full border px-3 py-1 text-sm ${
                  item.id === chosen.id
                    ? 'border-brand-deep bg-brand-deep text-white'
                    : 'border-zinc-200 text-zinc-600'
                }`}
              >
                Point du {day(item.madeAt)}
              </Link>
            ))}
          </nav>
        ) : null}
        <p className="text-sm font-semibold text-zinc-700" data-testid="market-update-chosen">
          Point du {day(chosen.madeAt)} — {chosen.line}
        </p>
        <p className={hintText}>
          Ce document montre au vendeur ce qui a bougé depuis le rendez-vous
          {meeting ? ` du ${meeting}` : ''} : chaque concurrent, son prix d’alors et d’aujourd’hui,
          les annonces disparues, puis où en est son prix. Ni adresse, ni titre, ni lien d’annonce ;
          « estimé » partout où l’outil déduit.
        </p>
        <SynthesisPhotoChoices
          projectId={projectId}
          hint="Cochez « Sans photo » pour retirer la photo du document imprimé et du lien ; c’est le même choix que sur la synthèse du rendez-vous. Rien ici n’est imprimé."
          competitors={document.competitors
            .filter((competitor) => competitor.hasPhoto)
            .map((competitor) => ({
              id: competitor.id,
              position: competitor.position,
              label: competitor.label,
              hidden: competitor.photoHidden,
            }))}
        />
        <MarketUpdateLinkButton
          projectId={projectId}
          updateId={chosen.id}
          advisorFirstName={profile.first_name ?? null}
          meetingDate={meeting}
          pointDate={day(chosen.madeAt)}
          links={(links ?? []).map((item) => ({
            id: item.id,
            createdAt: item.created_at,
            expiresAt: item.expires_at,
          }))}
        />
      </header>
      <MarketUpdateDocument document={document} />
    </div>
  );
}
