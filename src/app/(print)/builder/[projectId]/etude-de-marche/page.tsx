import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { backLink, hintText } from '@/components/ui/styles';
import { MarketStudyDocument } from '@/features/market-study/components/market-study-document';
import { MarketStudyLinkButton } from '@/features/market-study/components/market-study-link-button';
import { loadMarketStudy } from '@/features/market-study/queries/load-market-study';
import { SynthesisPhotoChoices } from '@/features/seller-synthesis/components/synthesis-photo-choices';
import { SynthesisPrintButton } from '@/features/seller-synthesis/components/synthesis-print-button';
import { getProfile } from '@/lib/auth/get-profile';
import { clientTexts } from '@/lib/client-texts';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Étude de marché',
  robots: { index: false, follow: false },
};

const day = (value: string): string =>
  new Date(value).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });

// Mission 131 — l'Étude de marché, côté conseiller : le document du jour, à imprimer (« Enregistrer
// au format PDF ») ou à envoyer par un lien de 30 jours ; « Sans photo » par concurrent, le même
// choix que la synthèse (M113). Pour tout dossier non archivé de l'agence, sans attendre le Live.
// Ouverte depuis le Live (`?vue=live`), la tablette est tournée vers le vendeur : le document seul,
// avec « Télécharger en PDF » — rien de ce qui est réservé au conseiller (liens, « Sans photo »,
// retour au dossier), comme les écrans neutres du Live (M92).
export default async function MarketStudyPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ vue?: string }>;
}) {
  const { projectId } = await params;
  const { vue } = await searchParams;
  const profile = await getProfile();
  if (!profile) notFound();
  const supabase = await createClient();
  const document = await loadMarketStudy(supabase, projectId, profile.agency_id);
  if (!document) notFound();
  if (vue === 'live') {
    return (
      <div className="flex min-h-screen flex-col gap-6 bg-zinc-100 p-4 lg:p-6 print:block print:bg-white print:p-0">
        <div className="mx-auto flex w-full max-w-[210mm] justify-end print:hidden">
          <SynthesisPrintButton
            label={clientTexts(document.language).documents.marketStudy.print}
          />
        </div>
        <MarketStudyDocument document={document} />
      </div>
    );
  }
  const { data: links } = await supabase
    .from('market_study_links')
    .select('id, created_at, expires_at')
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  return (
    <div className="flex min-h-screen flex-col gap-6 bg-zinc-100 p-4 lg:p-6 print:block print:bg-white print:p-0">
      <header className="mx-auto flex w-full max-w-[210mm] flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/builder/${projectId}`} className={backLink}>
            ← Retour au dossier
          </Link>
          <SynthesisPrintButton />
        </div>
        <h1 className="font-title text-2xl font-bold text-brand-deep">Étude de marché</h1>
        <p className="text-sm text-zinc-600">
          {[document.sellerName || null, document.propertyLabel].filter(Boolean).join(' · ')}
        </p>
        <p className={hintText}>
          Ce document montre au vendeur, au jour d’aujourd’hui, chaque concurrent retenu — ses
          caractéristiques face à son bien, son prix affiché, depuis quand il est en vente — puis où
          se situe son prix. Ni adresse, ni titre, ni lien d’annonce, ni l’agence qui vend.
          {document.ranking.subject
            ? document.ranking.subject.source === 'agreed'
              ? ' Son bien y est classé au prix retenu ensemble.'
              : ' Son bien y est classé au prix de votre analyse de valeur.'
            : ' Sans prix retenu ni analyse de valeur, son bien n’est pas classé et aucun verdict n’est donné.'}
        </p>
        <SynthesisPhotoChoices
          projectId={projectId}
          hint="Cochez « Sans photo » pour retirer la photo du document imprimé et du lien ; c’est le même choix que sur la synthèse du rendez-vous et le Point marché. Rien ici n’est imprimé."
          competitors={document.competitors
            .filter((competitor) => competitor.hasPhoto)
            .map((competitor) => ({
              id: competitor.id,
              position: competitor.position,
              label: competitor.label,
              hidden: competitor.photoHidden,
            }))}
        />
        <MarketStudyLinkButton
          projectId={projectId}
          advisorFirstName={profile.first_name ?? null}
          studyDate={day(document.madeAt)}
          language={document.language}
          links={(links ?? []).map((item) => ({
            id: item.id,
            createdAt: item.created_at,
            expiresAt: item.expires_at,
          }))}
        />
      </header>
      <MarketStudyDocument document={document} />
    </div>
  );
}
