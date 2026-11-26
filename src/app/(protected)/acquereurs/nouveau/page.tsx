import type { Metadata } from 'next';
import Link from 'next/link';

import {
  backLink,
  kickerLabel,
  pageSubtitle,
  pageTitle,
  socleSubtitle,
  socleTitle,
} from '@/components/ui/styles';
import { BuyerForm } from '@/features/buyers/components/buyer-form';
import { BuyerQuickForm } from '@/features/buyers/components/buyer-quick-form';
import { getAgencyCities } from '@/features/buyers/queries/get-agency-cities';
import { criteriaToBuyerDraft } from '@/features/buyers/services/buyer-criteria';
import { PhraseFlow } from '@/features/buyer-notes/components/phrase-flow';
import { getPosedAiCap } from '@/features/ai-budget/queries/get-ai-budgets';
import { notesReadingOpen } from '@/features/buyer-notes/services/reading-gate';
import { DEMO_NOTES_PHOTO, DEMO_NOTES_TEXT } from '@/features/demo/data/notes-arnaud';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import { getProfile } from '@/lib/auth/get-profile';

export const metadata: Metadata = { title: 'Nouvel acquéreur — ACM Studio' };

type NewBuyerPageProps = {
  searchParams: Promise<{
    type?: string;
    communes?: string;
    pieces?: string;
    surface?: string;
    budget?: string;
  }>;
};

const num = (value: string | undefined): number | null => {
  if (!value) return null;
  const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

// Mission 117 — une fiche neuve ; depuis le rapprochement du Suivi (« Enregistrer cette
// recherche »), elle arrive pré-remplie de ses critères, à nommer avant d'enregistrer.
// Mission 132 — sinon, la saisie rapide : un écran, en sortant d'un appel ; le reste se complète
// sur la fiche. Le rapprochement garde le formulaire complet (ses pièces et sa surface).
// La refonte, lot D (maquette REFONTE-2) — là où la lecture des notes est ouverte (M151), « Nouvel
// acquéreur » est une phrase : « Que cherche-t-il ? », puis « Ce que j'ai compris » en pastilles à
// corriger ; la saisie rapide reste derrière « Saisir à la main ». Là où elle est fermée, la
// saisie rapide, comme avant.
export default async function NewBuyerPage({ searchParams }: NewBuyerPageProps) {
  const params = await searchParams;
  // Mission 151 — la lecture des notes n'apparaît que là où elle est ouverte (`reading-gate.ts`).
  const profile = await getProfile();
  const isDemo = await isDemoAgency(profile?.agency_id);
  const readingOpen = notesReadingOpen({
    isDemo,
    email: profile?.email,
    agencyCapCents: await getPosedAiCap(profile?.agency_id),
  });
  const fromSearch = Object.values(params).some((value) => value != null && value !== '');
  const draft = fromSearch
    ? criteriaToBuyerDraft({
        propertyType: params.type?.trim() || null,
        city: params.communes?.trim() || null,
        roomsCount: num(params.pieces),
        surfaceArea: num(params.surface),
        budgetMin: null,
        budgetMax: num(params.budget),
      })
    : undefined;

  if (readingOpen && !fromSearch) {
    return (
      <div
        className="flex min-h-[calc(100dvh-4rem)] w-full max-w-[560px] flex-col gap-[18px] md:min-h-0"
        data-testid="new-buyer-phrase"
      >
        <Link
          href="/acquereurs"
          className="flex h-11 items-center gap-1 self-start text-[15px] font-bold text-brand-deep hover:text-brand-darker stage:text-brand"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-[18px] flex-none"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
          Acquéreurs
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className={socleTitle}>Que cherche-t-il ?</h1>
          <p className={socleSubtitle}>Écrivez-le comme il vous l’a dit. Une phrase suffit.</p>
        </div>
        <PhraseFlow demo={isDemo ? { text: DEMO_NOTES_TEXT, photo: DEMO_NOTES_PHOTO } : null}>
          <BuyerQuickForm cities={await getAgencyCities()} />
        </PhraseFlow>
      </div>
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-2">
        <Link href="/acquereurs" className={backLink}>
          ← Acquéreurs
        </Link>
        <span className={kickerLabel}>Acquéreurs</span>
        <h1 className={pageTitle}>Nouvel acquéreur</h1>
        <p className={pageSubtitle}>
          {fromSearch
            ? 'Les critères du rapprochement sont posés : nommez l’acquéreur, puis enregistrez.'
            : 'Qui il est, ce qu’il cherche, en quelques gestes ; le reste se complète plus tard.'}
        </p>
      </div>
      {fromSearch ? (
        <BuyerForm buyer={null} draft={draft} />
      ) : (
        <BuyerQuickForm cities={await getAgencyCities()} />
      )}
    </div>
  );
}
