import Link from 'next/link';

import {
  alertError,
  alertOk,
  backLink,
  btnPrimary,
  kickerLabel,
  pageSubtitle,
  pageTitle,
} from '@/components/ui/styles';
import { BuyerList, type BuyerListRow } from '@/features/buyers/components/buyer-list';
import { getBuyers } from '@/features/buyers/queries/get-buyers';
import { getBuyerLoopProposals } from '@/features/buyers/queries/get-loop-properties';
import { getBuyersMonth } from '@/features/buyers/queries/get-buyers-month';
import { getBuyersProgress } from '@/features/buyers/queries/get-buyers-progress';
import { getRelaunchFacts } from '@/features/buyers/queries/get-relaunch-facts';
import { buyersMonthLine, lastAnswerLabel } from '@/features/buyers/services/buyers-month';
import {
  buyerBudgetLabel,
  buyerCitiesLabel,
  buyerRoomsLabel,
  buyerStatusLabel,
  buyerTypesLabel,
} from '@/features/buyers/services/buyer-criteria';
import { parseBuyerFilter } from '@/features/buyers/services/buyer-filters';
import { buyerNextAction, saleInProgress } from '@/features/buyers/services/buyer-journey';
import { NO_PROGRESS } from '@/features/buyers/services/buyer-progress';
import { buyerReadiness } from '@/features/buyers/services/buyer-readiness';
import {
  buyerUrgency,
  compareBuyerUrgency,
  urgencyLabel,
} from '@/features/buyers/services/buyer-urgency';
import { relaunchDue } from '@/features/buyers/services/link-relaunch';
import { parisDay } from '@/features/meeting-conclusion/services/follow-up-contacts';
import { getProfile } from '@/lib/auth/get-profile';
import { formatRelativeSince } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';

export type AllBuyersQuery = { q?: string; archive?: string; vue?: string; etat?: string };

// Mission 117 — l'espace « Acquéreurs » : les fiches de l'agence, une recherche par nom, « Nouvel
// acquéreur ». Les fiches archivées n'y sont pas (M93). Mission 146 (partie B, I4) — « Mes fiches »
// d'abord, « Toute l'agence » à un geste ; triées par urgence (`buyerUrgency`) ; la recherche et
// les filtres d'état dans le navigateur.
//
// La refonte, lot B — c'est la liste entière, derrière « Tous mes acquéreurs » : la page s'ouvre
// désormais sur « à faire aujourd'hui » (`buyers-today-view.tsx`). Son contenu ne change pas.
export async function AllBuyers({ q, archive, vue, etat }: AllBuyersQuery) {
  const [profile, all] = await Promise.all([getProfile(), getBuyers()]);
  const buyers = all;
  const supabase = await createClient();
  const now = new Date();
  // Mission 135 — « Ce mois-ci » se compte sur toutes les fiches de l'agence, la recherche par nom
  // n'y change rien.
  const [progress, month, loopProposals, relaunch, followUps] = profile
    ? await Promise.all([
        getBuyersProgress(
          supabase,
          profile.agency_id,
          buyers.map((buyer) => buyer.id),
        ),
        getBuyersMonth(
          supabase,
          profile.agency_id,
          all.map((buyer) => buyer.id),
          new Date(),
        ),
        // Mission 145 (partie A, I2) — les mandats signés à proposer à chacun.
        getBuyerLoopProposals(profile.agency_id, new Date()),
        // Mission 146 (partie B) — la relance d'une sélection sans réponse : une échéance du tri.
        getRelaunchFacts(supabase, profile.agency_id, buyers),
        // La réponse du vendeur à une offre, tant que le conseiller ne l'a pas traitée (M138).
        supabase
          .from('buyer_offer_follow_ups')
          .select('document_id')
          .eq('agency_id', profile.agency_id),
      ])
    : [new Map(), null, null, null, null];
  // Une lecture en échec ne fait remonter aucune fiche (M98).
  const followedOffers = followUps?.error
    ? null
    : new Set((followUps?.data ?? []).map((row) => row.document_id));

  const today = parisDay(now);
  const lastAnswers = month?.lastAnswers ?? new Map();
  const rows: BuyerListRow[] = buyers
    .map((buyer) => {
      const facts = progress.get(buyer.id) ?? NO_PROGRESS;
      const next = buyerNextAction(buyer, facts, now, loopProposals?.byBuyer.get(buyer.id) ?? []);
      const readiness = buyerReadiness(buyer, facts, now);
      const relaunchFacts = relaunch?.failed ? undefined : relaunch?.facts.get(buyer.id);
      const input = {
        sale:
          saleInProgress(facts, buyer.status) ||
          (facts.latestOffer?.decision != null &&
            followedOffers != null &&
            !followedOffers.has(facts.latestOffer.documentId)),
        relaunchDueOn: relaunchFacts ? (relaunchDue(relaunchFacts, now)?.dueOn ?? null) : null,
        recontactOn: readiness.state === 'recontact' ? readiness.recontactOn : null,
        since: facts.unread ? null : next.since,
        updatedAt: buyer.updatedAt,
      };
      const urgency = buyerUrgency(input, today);
      const answer = lastAnswers.get(buyer.id);
      const row: BuyerListRow = {
        id: buyer.id,
        name: buyer.name,
        status: buyer.status,
        statusLabel: buyerStatusLabel(buyer),
        facts: [
          buyerTypesLabel(buyer),
          buyerCitiesLabel(buyer),
          buyerBudgetLabel(buyer),
          buyerRoomsLabel(buyer),
        ]
          .filter((fact): fact is string => fact != null && fact !== '')
          .join(' · '),
        readiness: readiness.state,
        lastAnswer: answer ? lastAnswerLabel(answer) : null,
        mine: buyer.advisorId === profile?.id,
        next: facts.unread
          ? null
          : {
              title: next.title,
              since: next.since ? formatRelativeSince(next.since) : null,
              label: next.primary.label,
              href: next.primary.href,
            },
        late: facts.unread ? null : urgencyLabel(urgency.due, next.title),
        overdue: !facts.unread && (urgency.due?.lateDays ?? 0) > 0,
      };
      return { ...input, urgency, row };
    })
    .sort(compareBuyerUrgency)
    .map((entry) => entry.row);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <Link href="/acquereurs" className={backLink} data-testid="buyers-back-to-today">
        ← À faire aujourd’hui
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className={kickerLabel}>Acquéreurs</span>
          <h1 className={pageTitle}>Les acquéreurs de l’agence</h1>
          <p className={pageSubtitle}>
            Ce que chacun cherche, noté en découverte ; « Rapprocher » le confronte à vos mandats,
            vos vendeurs à relancer et vos concurrents à prospecter.
          </p>
        </div>
        <Link href="/acquereurs/nouveau" className={btnPrimary}>
          Nouvel acquéreur
        </Link>
      </div>

      {archive ? (
        <p role="status" className={alertOk} data-testid="buyer-archived-notice">
          La fiche de {archive} est archivée : elle n’apparaît plus dans vos listes.
        </p>
      ) : null}

      {/* Mission 135 — ce que le conseiller voit de son efficacité : rien d'autre, aucun classement. */}
      {month && !month.failed && all.length > 0 ? (
        <p
          className="text-sm font-semibold text-zinc-700 stage:text-white/80"
          data-testid="buyers-month"
        >
          {buyersMonthLine(month.month)}
        </p>
      ) : month?.failed ? (
        <p role="alert" className="text-sm font-semibold text-red-700">
          « Ce mois-ci » n’a pas pu être lu : rechargez la page.
        </p>
      ) : null}

      {/* Mission 145 — les mandats à proposer n'ont pas pu être lus : la liste le dit (M98). */}
      {loopProposals?.failed ? (
        <p role="alert" className={alertError}>
          Les mandats à proposer à vos acquéreurs n’ont pas pu être lus : rechargez la page.
        </p>
      ) : null}
      {relaunch?.failed ? (
        <p role="alert" className={alertError}>
          Les relances de vos acquéreurs n’ont pas pu être lues : rechargez la page.
        </p>
      ) : null}
      <BuyerList
        rows={rows}
        initialView={vue === 'agence' ? 'agency' : 'mine'}
        initialFilter={parseBuyerFilter(etat)}
        initialQuery={q?.trim() ?? ''}
      />
    </div>
  );
}
