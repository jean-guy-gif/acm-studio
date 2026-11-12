import type { Metadata } from 'next';
import Link from 'next/link';

import { backLink, kickerLabel, pageSubtitle, pageTitle } from '@/components/ui/styles';
import { BuyerForm } from '@/features/buyers/components/buyer-form';
import { BuyerQuickForm } from '@/features/buyers/components/buyer-quick-form';
import { getAgencyCities } from '@/features/buyers/queries/get-agency-cities';
import { criteriaToBuyerDraft } from '@/features/buyers/services/buyer-criteria';
import { NotesFlow } from '@/features/buyer-notes/components/notes-flow';
import { notesReadingOpen } from '@/features/buyer-notes/services/reading-gate';
import { DEMO_NOTES_TEXT } from '@/features/demo/data/notes-arnaud';
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
export default async function NewBuyerPage({ searchParams }: NewBuyerPageProps) {
  const params = await searchParams;
  // Mission 151 — la lecture des notes n'apparaît que là où elle est ouverte (`reading-gate.ts`).
  const profile = await getProfile();
  const isDemo = await isDemoAgency(profile?.agency_id);
  const readingOpen = notesReadingOpen({ isDemo, email: profile?.email });
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

  return (
    <div
      className={`flex ${readingOpen && !fromSearch ? 'max-w-6xl' : 'max-w-3xl'} flex-col gap-6 md:gap-8`}
    >
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
      ) : readingOpen ? (
        // Mission 151 — « Depuis mes notes » en tête (planche 1), la saisie rapide dessous.
        <NotesFlow existing={null} demoText={isDemo ? DEMO_NOTES_TEXT : null}>
          <BuyerQuickForm cities={await getAgencyCities()} />
        </NotesFlow>
      ) : (
        <BuyerQuickForm cities={await getAgencyCities()} />
      )}
    </div>
  );
}
