import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { backLink, errorText, hintText } from '@/components/ui/styles';
import {
  LivingHereChoices,
  type LivingHereChoice,
} from '@/features/academia/components/living-here-choices';
import { loadLivingHereRows } from '@/features/academia/queries/living-here-rows';
import { livingHereAgeLine } from '@/features/academia/services/living-here-age';
import { livingHereEverywhereOpen } from '@/features/academia/services/living-here-switch';
import { BuyerDossierDocument } from '@/features/buyer-dossier/components/buyer-dossier-document';
import { DossierLinkButton } from '@/features/buyer-dossier/components/dossier-link-button';
import { DossierPhotoChoices } from '@/features/buyer-dossier/components/dossier-photo-choices';
import { loadBuyerDossier } from '@/features/buyer-dossier/queries/load-buyer-dossier';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import { SynthesisPrintButton } from '@/features/seller-synthesis/components/synthesis-print-button';
import { ACADEMIA_PRESENTATION_URL, ACADEMIA_URL, academiaLinkView } from '@/lib/academia';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Dossier acquéreur',
  robots: { index: false, follow: false },
};

// Mission 119 (partie B) — le dossier acquéreur, côté conseiller : à imprimer (un bien par page), ou
// à envoyer par un lien valable 30 jours ; « Sans photo » par bien. Mission 156 — et le lien
// « Vivre ici » d'Academia de chaque bien hors mandat (planche A3-1), derrière l'interrupteur qui le
// garde éteint en production tant que le texte A3 de `/confidentialite` n'est pas en ligne.
export default async function BuyerDossierPage({
  params,
}: {
  params: Promise<{ buyerId: string }>;
}) {
  const { buyerId } = await params;
  const profile = await getProfile();
  if (!profile || !/^[0-9a-f-]{36}$/i.test(buyerId)) notFound();
  const supabase = await createClient();
  const dossier = await loadBuyerDossier(supabase, buyerId, profile.agency_id, null, profile.id);
  if (!dossier) notFound();
  const { data: links } = await supabase
    .from('buyer_dossier_links')
    .select('id, created_at, expires_at')
    .eq('buyer_id', buyerId)
    .eq('agency_id', profile.agency_id)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  const living = livingHereEverywhereOpen()
    ? await livingHereChoices(
        supabase,
        profile.agency_id,
        dossier.photoChoices.map((choice) => ({
          itemId: choice.itemId,
          letter: choice.letter,
          label: choice.label,
        })),
      )
    : null;
  return (
    <div className="flex min-h-screen flex-col gap-6 bg-zinc-100 p-4 lg:p-6 print:block print:bg-white print:p-0">
      <header className="mx-auto flex w-full max-w-[210mm] flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/acquereurs/${buyerId}`} className={backLink}>
            ← Retour à la fiche
          </Link>
          <SynthesisPrintButton />
        </div>
        <p className={hintText}>
          Ce dossier suit sa recherche : ses mots, la grille de ses critères, un bien par page
          décrit par ses critères, puis « Mes choix », à cocher au stylo. Il ne contient ni adresse,
          ni titre, ni lien d’annonce. Sur le lien, l’acquéreur répond depuis son téléphone : une
          seule réponse, qui arrive sur sa fiche et sur Visites.
        </p>
        <DossierPhotoChoices
          buyerId={buyerId}
          items={dossier.photoChoices
            .filter((choice) => choice.hasPhoto)
            .map((choice) => ({
              id: choice.itemId,
              position: choice.letter,
              label: choice.label,
              hidden: choice.photoHidden,
            }))}
        />
        {living?.ok === false ? (
          <p className={errorText} role="alert" data-testid="living-here-unread">
            Les liens « Vivre ici » des biens n’ont pas pu être lus : rechargez la page.
          </p>
        ) : living ? (
          <LivingHereChoices buyerId={buyerId} choices={living.choices} />
        ) : null}
        <DossierLinkButton
          buyerId={buyerId}
          livingHereLetters={living?.ok ? living.sharedLetters : []}
          advisorFirstName={profile.first_name}
          language={dossier.deck.language ?? 'fr'}
          links={(links ?? []).map((item) => ({
            id: item.id,
            createdAt: item.created_at,
            expiresAt: item.expires_at,
          }))}
        />
      </header>
      <BuyerDossierDocument dossier={dossier} />
    </div>
  );
}

const ORIGIN: Record<'competitor' | 'listing', string> = {
  competitor: 'Concurrent',
  listing: 'Annonce du marché',
};

async function livingHereChoices(
  supabase: Awaited<ReturnType<typeof createClient>>,
  agencyId: string,
  items: { itemId: string; letter: string; label: string }[],
): Promise<{ ok: true; choices: LivingHereChoice[]; sharedLetters: string[] } | { ok: false }> {
  const [read, demo] = await Promise.all([
    loadLivingHereRows(
      supabase,
      agencyId,
      items.map((item) => item.itemId),
    ),
    isDemoAgency(agencyId),
  ]);
  if (!read.ok) return { ok: false };
  const now = new Date();
  const rows = new Map(read.rows.map((row) => [row.itemId, row]));
  const choices = items.flatMap((item): LivingHereChoice[] => {
    const row = rows.get(item.itemId);
    if (!row) return [];
    const savedLine = row.link ? livingHereAgeLine(row.link.pastedAt, now) : null;
    if (row.kind === 'mandate') {
      return [
        {
          ...item,
          kind: 'mandate',
          signed: row.signed,
          propertyHref: `/builder/${row.projectId}/property`,
          savedLine,
          hasLink: row.link !== null,
        },
      ];
    }
    // Démo : la présentation d'Academia, rien de copié (M147 A) ; sinon l'adresse confirmée, ou
    // l'accueil d'Academia sans rien à copier.
    const academia = demo
      ? { href: ACADEMIA_PRESENTATION_URL, copy: null }
      : (academiaLinkView({ target: 'living', address: row.address, demo: false }) ?? {
          href: ACADEMIA_URL,
          copy: null,
        });
    return [
      {
        ...item,
        kind: 'outside',
        origin: ORIGIN[row.source],
        savedUrl: row.link?.url ?? null,
        savedLine,
        academia,
        academiaNote: demo
          ? 'S’ouvre sur la présentation d’Academia.'
          : academia.copy
            ? 'l’adresse du bien est copiée, collez-la dans Academia.'
            : 'ACM ne connaît pas l’adresse de cette annonce : cherchez le bien dans Academia.',
      },
    ];
  });
  const sharedLetters = choices.flatMap((choice) =>
    choice.kind === 'outside' && choice.savedUrl ? [choice.letter] : [],
  );
  return { ok: true, choices, sharedLetters };
}
