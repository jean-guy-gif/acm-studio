import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  alertOk,
  backLink,
  btnSecondary,
  card,
  kickerLabel,
  pageSubtitle,
  pageTitle,
} from '@/components/ui/styles';
import { BuyerAnswers } from '@/features/buyer-deck/components/buyer-answers';
import { DeckPrepare } from '@/features/buyer-deck/components/deck-prepare';
import { getBuyerAnswers } from '@/features/buyer-deck/queries/get-buyer-answers';
import { loadDeck } from '@/features/buyer-deck/queries/load-deck';
import { answerSuggestions } from '@/features/buyer-deck/services/answer-suggestions';
import { BuyerArchiveButton } from '@/features/buyers/components/buyer-archive-button';
import { BuyerForm } from '@/features/buyers/components/buyer-form';
import { BuyerStatusActions } from '@/features/buyers/components/buyer-status-actions';
import { BuyerSteps } from '@/features/buyers/components/buyer-steps';
import { getBuyer } from '@/features/buyers/queries/get-buyers';
import { getBuyersProgress } from '@/features/buyers/queries/get-buyers-progress';
import { NO_PROGRESS } from '@/features/buyers/services/buyer-progress';
import { buyerDateLabel } from '@/features/buyers/services/buyer-criteria';
import { IdealSelectionList } from '@/features/ideal-properties/components/ideal-selection-list';
import { getIdealSelection } from '@/features/ideal-properties/queries/get-ideal-selection';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Fiche acquéreur — ACM Studio' };

type BuyerPageProps = {
  params: Promise<{ buyerId: string }>;
  searchParams: Promise<{ enregistre?: string }>;
};

// Mission 117 — la fiche d'un acquéreur : son statut, « Rapprocher » (le rapprochement du Suivi,
// pré-rempli, M86), la fiche à modifier, « Archiver ». Une fiche archivée ou d'une autre agence
// est introuvable (M93). Mission 118 — « Trouver les biens idéaux » et la sélection retenue.
export default async function BuyerPage({ params, searchParams }: BuyerPageProps) {
  const [{ buyerId }, { enregistre }] = await Promise.all([params, searchParams]);
  const buyer = await getBuyer(buyerId);
  if (!buyer) notFound();
  // Mission 118 — la dernière sélection de biens idéaux, si elle existe. Mission 122 — son
  // déroulé (« Avant de présenter ») et ses réponses, toutes sélections confondues.
  const [selection, profile] = await Promise.all([getIdealSelection(buyer.id), getProfile()]);
  const supabase = await createClient();
  const [loadedDeck, answers, progress] = await Promise.all([
    selection && !selection.presentedAt ? loadDeck(buyer.id) : Promise.resolve(null),
    profile
      ? getBuyerAnswers(supabase, buyer.id, profile.agency_id)
      : Promise.resolve({ lines: [], forSuggestions: [] }),
    profile
      ? getBuyersProgress(supabase, profile.agency_id, [buyer.id])
      : Promise.resolve(new Map()),
  ]);
  const facts = progress.get(buyer.id) ?? NO_PROGRESS;
  const suggestions = answerSuggestions(buyer, buyer.ignoredSuggestions, answers.forSuggestions);

  return (
    <div className="flex max-w-3xl flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-2">
        <Link href="/acquereurs" className={backLink}>
          ← Acquéreurs
        </Link>
        <span className={kickerLabel}>Acquéreur</span>
        <h1 className={pageTitle} data-testid="buyer-name">
          {buyer.name}
        </h1>
        <p className={pageSubtitle}>
          Fiche créée le {buyerDateLabel(buyer.createdAt)} · modifiée le{' '}
          {buyerDateLabel(buyer.updatedAt)}
        </p>
      </div>

      {enregistre ? (
        <p role="status" className={alertOk}>
          Fiche enregistrée.
        </p>
      ) : null}

      {/* Essai de Jean-Guy (26/10) : les trois étapes, dans l'ordre, en haut de la fiche. */}
      <BuyerSteps buyerId={buyer.id} facts={facts} answersShown={answers.lines.length > 0} />

      <section className={`${card} flex flex-wrap items-center justify-between gap-4 p-5`}>
        <BuyerStatusActions buyer={buyer} />
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/suivi?acquereur=${buyer.id}#rapprochement`} className={btnSecondary}>
            Rapprocher
          </Link>
          <BuyerArchiveButton buyerId={buyer.id} name={buyer.name} />
        </div>
      </section>

      {selection ? <IdealSelectionList selection={selection} /> : null}

      {loadedDeck ? <DeckPrepare deck={loadedDeck.deck} /> : null}

      {answers.lines.length > 0 ? (
        <div id="reponses" className="scroll-mt-6">
          <BuyerAnswers buyerId={buyer.id} answers={answers.lines} suggestions={suggestions} />
        </div>
      ) : null}

      <BuyerForm buyer={buyer} />
    </div>
  );
}
