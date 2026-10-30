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
import { VisitRow } from '@/features/buyer-presentation/components/visit-row';
import { getVisitLines } from '@/features/buyer-presentation/queries/get-visit-requests';
import { getVisitLetters } from '@/features/buyer-prospecting/queries/get-visit-letters';
import { letterCounts } from '@/features/buyer-prospecting/services/letter-counts';
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
  // Mission 120 — ses visites demandées, chacune avec l'action qui convient et l'état du courrier.
  const visits = (await getVisitLines()).filter(
    (line) => line.buyerId === buyer.id && line.visitedAt == null,
  );
  const letters = await getVisitLetters(visits);
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
      <BuyerSteps
        buyerId={buyer.id}
        facts={facts}
        answersShown={answers.lines.length > 0}
        letters={letterCounts([...letters.values()])}
      />

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

      {/* Essai de Jean-Guy (26/10) : « Avant de présenter » se replie une fois le lien répondu ;
          une fois la présentation faite, le déroulé est figé et n'a plus rien à relire. */}
      {loadedDeck ? <DeckPrepare deck={loadedDeck.deck} folded={facts.answeredOnLink} /> : null}

      {answers.lines.length > 0 ? (
        <div id="reponses" className="scroll-mt-6">
          <BuyerAnswers buyerId={buyer.id} answers={answers.lines} suggestions={suggestions} />
        </div>
      ) : null}

      {visits.length > 0 ? (
        <section className={`${card} flex flex-col gap-3 p-5`} data-testid="buyer-visits-section">
          <h2 className="font-title text-lg font-semibold text-brand-deep stage:text-white">
            Ses visites à organiser
          </h2>
          <ul className="flex flex-col gap-2">
            {visits.map((line) => (
              <VisitRow key={line.id} line={line} letter={letters.get(line.id) ?? null} />
            ))}
          </ul>
        </section>
      ) : null}

      {/* Essai de Jean-Guy (26/10) : la recherche se modifie sur demande, repliée. */}
      <details className="group" data-testid="buyer-form-details">
        <summary className="cursor-pointer font-title text-lg font-semibold text-brand-deep stage:text-white">
          Modifier sa recherche
        </summary>
        <div className="mt-5">
          <BuyerForm buyer={buyer} />
        </div>
      </details>
    </div>
  );
}
