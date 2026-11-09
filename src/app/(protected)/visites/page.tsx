import type { Metadata } from 'next';
import Link from 'next/link';

import {
  badgeBrand,
  card,
  emptyState,
  kickerLabel,
  pageSubtitle,
  pageTitle,
} from '@/components/ui/styles';
import { VisitRow } from '@/features/buyer-presentation/components/visit-row';
import {
  getVisitLines,
  type VisitLine,
} from '@/features/buyer-presentation/queries/get-visit-requests';
import { getVisitLetters } from '@/features/buyer-prospecting/queries/get-visit-letters';
import { getVisitVouchers } from '@/features/visit-voucher/queries/get-visit-vouchers';
import { getVisitOfferAnswers } from '@/features/purchase-offer/queries/get-offer-answers';
import { loadVisitLivingHere } from '@/features/living-here/queries/visit-living-here';
import { createClient } from '@/lib/supabase/server';

// Mission 142 — une demande de visite lance « Vivre ici » en tâche de fond (`after()`), dans la
// même fonction : OpenStreetMap peut prendre jusqu'à 45 s par bien. La limite, gardée large.
export const maxDuration = 300;

export const metadata: Metadata = { title: 'Visites — ACM Studio' };

// Mission 119 — la page Visites du mode Acquéreur : les demandes à planifier, puis les visites
// faites avec leur retour et leur issue, par acquéreur. Mission 120 — chaque visite demandée
// porte l'action qui convient à l'origine du bien, et l'état de son courrier. Mission 146 (partie B,
// I10) — chaque visite dit son chemin et UNE prochaine étape ; le bon de visite est l'étape d'une
// visite d'un bien de l'agence (plus en tête du groupe) ; « Ses autres réponses » sont sur la fiche
// de chaque acquéreur (« Ce qu'il a répondu », M122).
function groupByBuyer(
  lines: VisitLine[],
): { buyerId: string; buyerName: string; lines: VisitLine[] }[] {
  const groups = new Map<string, { buyerId: string; buyerName: string; lines: VisitLine[] }>();
  for (const line of lines) {
    const group = groups.get(line.buyerId) ?? {
      buyerId: line.buyerId,
      buyerName: line.buyerName,
      lines: [],
    };
    group.lines.push(line);
    groups.set(line.buyerId, group);
  }
  return [...groups.values()];
}

// Mission 139 — `?messages=<visite>` : juste après « Visite faite », les deux messages de cette
// visite s'ouvrent aussitôt.
export default async function VisitsPage({
  searchParams,
}: {
  searchParams: Promise<{ messages?: string }>;
}) {
  const { messages: openMessages } = await searchParams;
  const allLines = await getVisitLines();
  const lines = allLines.filter((line) => !line.buyerArchived);
  // Mission 120 — l'action de chaque visite et l'état de son courrier. Mission 146 (partie B) —
  // visites faites comprises : leur chemin dit si le bien est à l'agence (le bon de visite).
  const letters = await getVisitLetters(lines);
  // Mission 137 — le bon de visite signé de chaque visite.
  const supabase = await createClient();
  // Mission 138 — et la réponse du vendeur à l'offre née de chaque visite.
  const [vouchers, offerAnswers] = await Promise.all([
    getVisitVouchers(
      supabase,
      lines.map((line) => line.id),
    ),
    getVisitOfferAnswers(
      supabase,
      lines.map((line) => line.id),
    ),
  ]);
  const pending = lines.filter((line) => line.visitedAt == null);
  const done = lines.filter((line) => line.visitedAt != null);
  // Mission 142 — « Vivre ici » de chaque bien à visiter, et ce qui compte pour chaque acquéreur.
  const livingHere = await loadVisitLivingHere(supabase, lines);
  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-1.5">
        <span className={kickerLabel}>Acquéreurs</span>
        <h1 className={pageTitle}>Visites</h1>
        <p className={pageSubtitle}>
          Les visites demandées par vos acquéreurs, à planifier, puis faites avec leur retour.
        </p>
      </div>
      {offerAnswers == null ? (
        <p role="alert" className="text-sm font-semibold text-red-700">
          Les réponses aux offres d’achat n’ont pas pu être lues : rechargez la page.
        </p>
      ) : null}
      {lines.length === 0 ? (
        <div className={emptyState}>
          Aucune demande de visite pour l’instant : elles naissent pendant une présentation ou
          depuis le dossier.
        </div>
      ) : null}
      {[
        { title: 'À planifier', items: pending, testId: 'visits-pending' },
        { title: 'Visites faites', items: done, testId: 'visits-done' },
      ].map((section) =>
        section.items.length > 0 ? (
          <section
            key={section.title}
            className={`${card} flex flex-col gap-4 p-5`}
            data-testid={section.testId}
          >
            <h2 className="font-title text-lg font-semibold text-brand-deep stage:text-white">
              {section.title} <span className={badgeBrand}>{section.items.length}</span>
            </h2>
            {groupByBuyer(section.items).map((group) => (
              <div key={group.buyerId} className="flex flex-col gap-2">
                <Link
                  href={`/acquereurs/${group.buyerId}`}
                  className="self-start font-semibold text-zinc-800 hover:underline stage:text-white"
                >
                  {group.buyerName}
                </Link>
                <ul className="flex flex-col gap-2">
                  {group.lines.map((line) => (
                    <VisitRow
                      key={line.id}
                      line={line}
                      openMessages={line.id === openMessages}
                      letter={letters.get(line.id) ?? null}
                      voucher={vouchers.get(line.id) ?? null}
                      offerAnswer={offerAnswers?.get(line.id) ?? null}
                      livingHere={livingHere.get(line.id) ?? null}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ) : null,
      )}
    </div>
  );
}
