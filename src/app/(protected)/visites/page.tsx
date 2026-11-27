import type { Metadata } from 'next';
import Link from 'next/link';

import { PersonMark } from '@/components/socle/task-card';
import {
  alertError,
  socleCardBordered,
  socleKicker,
  socleSubtitle,
  socleTitle,
} from '@/components/ui/styles';
import { VisitRow } from '@/features/buyer-presentation/components/visit-row';
import {
  getVisitLines,
  type VisitLine,
} from '@/features/buyer-presentation/queries/get-visit-requests';
import { getVisitLetters } from '@/features/buyer-prospecting/queries/get-visit-letters';
import { getVisitVouchers } from '@/features/visit-voucher/queries/get-visit-vouchers';
import { getVisitOfferAnswers } from '@/features/purchase-offer/queries/get-offer-answers';
import { createClient } from '@/lib/supabase/server';

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

// La refonte, lot F — sa ligne : « 2 visites à planifier · 3 faites ».
function visitsCount(pending: number, done: number): string {
  const visits = (n: number) => `${n}\u00a0${n > 1 ? 'visites' : 'visite'}`;
  if (pending === 0) return `${visits(done)} ${done > 1 ? 'faites' : 'faite'}`;
  const toPlan = `${visits(pending)} à planifier`;
  return done > 0 ? `${toPlan} · ${done}\u00a0${done > 1 ? 'faites' : 'faite'}` : toPlan;
}

// Mission 139 — `?messages=<visite>` : juste après « Visite faite », les deux messages de cette
// visite s'ouvrent aussitôt.
export default async function VisitsPage({
  searchParams,
}: {
  searchParams: Promise<{ messages?: string; faite?: string }>;
}) {
  // Lancement, mission 7 — `?faite=<visite>` : depuis « Aujourd'hui », son compte rendu ouvert.
  const { messages: openMessages, faite: openDone } = await searchParams;
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
  return (
    // La refonte, lot F (Jean-Guy, 26/11) — Visites aligné sur le socle : le titre et sa ligne, les
    // deux groupes sous leur sur-titre, une personne avec son rond aux initiales, chaque visite dans
    // la carte du socle, ses gestes avec les boutons du socle. Les mêmes blocs aux trois tailles.
    <div className="flex max-w-3xl flex-col gap-5 md:gap-6">
      <div className="flex flex-col gap-0.5">
        <h1 className={`${socleTitle} md:text-[26px] xl:text-[30px]`}>Visites</h1>
        {lines.length > 0 ? (
          <p className={socleSubtitle} data-testid="visits-count">
            {visitsCount(pending.length, done.length)}
          </p>
        ) : null}
      </div>
      {offerAnswers == null ? (
        <p role="alert" className={alertError}>
          Les réponses aux offres d’achat n’ont pas pu être lues&nbsp;: rechargez la page.
        </p>
      ) : null}
      {lines.length === 0 ? (
        <div className={`${socleCardBordered} p-6 text-[15px] text-[#5B6380] stage:text-white/60`}>
          Aucune demande de visite pour l’instant&nbsp;: elles naissent pendant une présentation ou
          depuis le dossier.
        </div>
      ) : null}
      {[
        { title: 'À planifier', items: pending, testId: 'visits-pending' },
        { title: 'Visites faites', items: done, testId: 'visits-done' },
      ].map((section) =>
        section.items.length > 0 ? (
          <section key={section.title} className="flex flex-col gap-3" data-testid={section.testId}>
            <h2 className={socleKicker}>
              {section.title} · {section.items.length}
            </h2>
            {groupByBuyer(section.items).map((group) => (
              <div key={group.buyerId} className="flex flex-col gap-2.5">
                <Link
                  href={`/acquereurs/${group.buyerId}`}
                  className="flex items-center gap-3 self-start rounded-2xl pr-2 hover:bg-white/60 stage:hover:bg-white/5"
                >
                  <PersonMark name={group.buyerName} />
                  <span className="text-[17px] font-bold text-brand-darker stage:text-white">
                    {group.buyerName}
                  </span>
                </Link>
                <ul className="flex flex-col gap-2.5">
                  {group.lines.map((line) => (
                    <VisitRow
                      key={line.id}
                      line={line}
                      openMessages={line.id === openMessages}
                      openDone={line.id === openDone}
                      letter={letters.get(line.id) ?? null}
                      voucher={vouchers.get(line.id) ?? null}
                      offerAnswer={offerAnswers?.get(line.id) ?? null}
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
