import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { backLink, btnSecondary } from '@/components/ui/styles';
import { PrintButton } from '@/features/competitor-locator/components/print-button';
import { ProspectingList } from '@/features/competitor-locator/components/prospecting-list';
import { getSuiviDossiers } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import { competitorFacts } from '@/features/prospecting/components/prospecting-card';
import { getAgencyProspecting } from '@/features/prospecting/queries/get-agency-prospecting';
import {
  filterProspecting,
  parseProspectingTarget,
  parseSellerFilter,
  prospectionHref,
} from '@/features/prospecting/services/filter-prospecting';
import { sellersLabel } from '@/features/prospecting/services/group-prospecting';
import {
  TOUR_SCOPES,
  TOUR_SCOPE_LABELS,
  buildTour,
  filterByScope,
  parseTourScope,
  type TourScope,
} from '@/features/prospecting/services/tour';
import { getBuyerProspecting } from '@/features/buyer-prospecting/queries/get-buyer-prospecting';
import { buyerProspectingCard } from '@/features/buyer-prospecting/services/buyer-prospect-card';
import type { BuyerOriginLabel } from '@/features/buyer-prospecting/types';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Ma tournée — ACM Studio' };

type TourneePageProps = {
  searchParams: Promise<{ bien?: string; cible?: string; qui?: string }>;
};

// Mission 86 — « Imprimer ma tournée » : la liste filtrée de la page Prospection, en A4, par
// l'impression du navigateur. Document interne à l'agence.
// Mission 98 — la tournée ne garde que les portes où sonner : les propriétaires à adresse
// confirmée, ni en rendez-vous, ni en mandat, ni « pas intéressés », ni sur la liste « Ne plus
// solliciter », rangés par commune, puis par rue, puis par numéro. Les confrères sont listés à
// part, en bas, à appeler. Elle s'ouvre sur les dossiers du conseiller connecté ; « Toute
// l'agence » l'élargit. Filtrée sur un bien vendeur, elle est celle de ce bien, à qui qu'il soit.
export default async function TourneePage({ searchParams }: TourneePageProps) {
  const { bien, cible, qui } = await searchParams;
  const profile = await getProfile();
  if (!profile) {
    redirect('/onboarding');
  }

  const { sellers, cards } = await getAgencyProspecting(await getSuiviDossiers());
  const sellerId = parseSellerFilter(bien, sellers);
  const target = parseProspectingTarget(cible);
  const scope = parseTourScope(qui);
  const filtered = filterProspecting(cards, sellerId, target);
  // Mission 120 B — les biens démarchés depuis une recherche acquéreur entrent dans la tournée
  // (hors filtre par bien vendeur) ; « Mes dossiers » : les fiches dont je suis le conseiller.
  const buyerOrigins = new Map<string, BuyerOriginLabel[]>();
  let buyerCards: typeof cards = [];
  if (sellerId == null) {
    const supabase = await createClient();
    const prospecting = await getBuyerProspecting(supabase, profile.agency_id);
    let mine: Set<string> | null = null;
    if (scope === 'mine') {
      const { data: myBuyers } = await supabase
        .from('buyers')
        .select('id')
        .eq('agency_id', profile.agency_id)
        .eq('advisor_id', profile.id);
      mine = new Set((myBuyers ?? []).map((buyer) => buyer.id));
    }
    const kept = prospecting.cards.filter(
      (card) => mine == null || card.origins.some((origin) => mine.has(origin.buyerId)),
    );
    for (const card of kept) buyerOrigins.set(card.row.id, card.origins);
    buyerCards = filterProspecting(kept.map(buyerProspectingCard), null, target);
  }
  const tour = buildTour([
    ...(sellerId != null ? filtered : filterByScope(filtered, scope, profile.id)),
    ...buyerCards,
  ]);
  const pourLabel = (card: (typeof cards)[number]): string =>
    card.sellers.length > 0
      ? `Pour : ${sellersLabel(card.sellers)}`
      : `Recherche acquéreur : ${(buyerOrigins.get(card.row.id) ?? []).map((origin) => origin.buyerName).join(' ; ')}`;

  const communes: { name: string; start: number; stops: typeof tour.owners }[] = [];
  tour.owners.forEach((stop, index) => {
    const name = stop.commune ?? 'Commune non renseignée';
    const last = communes.at(-1);
    if (last && last.name.toLowerCase() === name.toLowerCase()) {
      last.stops.push(stop);
    } else {
      communes.push({ name, start: index + 1, stops: [stop] });
    }
  });
  const scopeHref = (value: TourScope): string => {
    const params = new URLSearchParams();
    if (target !== 'all') {
      params.set('cible', target);
    }
    if (value !== 'mine') {
      params.set('qui', value);
    }
    const query = params.toString();
    return query === '' ? '/prospection/tournee' : `/prospection/tournee?${query}`;
  };
  const seller = sellers.find((item) => item.projectId === sellerId);
  const empty = tour.owners.length === 0 && tour.colleagues.length === 0;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[210mm] flex-col gap-5 bg-white px-6 py-8 text-zinc-900 print:max-w-none print:p-0">
      <style>{'@page { size: A4; margin: 15mm; }'}</style>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={prospectionHref(sellerId, target)} className={backLink}>
          ← Retour à Prospection
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {sellerId == null
            ? TOUR_SCOPES.map((value) => (
                <Link
                  key={value}
                  href={scopeHref(value)}
                  aria-current={value === scope ? 'true' : undefined}
                  className={`${btnSecondary} ${value === scope ? 'border-brand font-semibold' : ''}`}
                >
                  {TOUR_SCOPE_LABELS[value]}
                </Link>
              ))
            : null}
          <PrintButton />
        </div>
      </div>

      <header className="flex flex-col gap-1 border-b border-zinc-300 pb-3">
        <h1 className="text-xl font-bold text-black">Ma tournée de prospection</h1>
        <p className="text-sm text-zinc-700">
          {seller ? `Pour : ${seller.name}` : TOUR_SCOPE_LABELS[scope]} · liste éditée le{' '}
          {new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })}
        </p>
        <p className="text-xs text-zinc-500">
          Document interne à l’agence. Propriétaires à adresse confirmée, par commune et par rue.
        </p>
      </header>

      {empty ? (
        <p className="text-sm text-zinc-600">
          Aucune porte où sonner ni confrère à appeler pour ce filtre.
          {sellerId == null && scope === 'mine' ? ' Voyez aussi « Toute l’agence ».' : ''}
        </p>
      ) : null}

      {communes.map((commune) => (
        <section
          key={`${commune.name}-${commune.start}`}
          data-testid="tour-commune"
          className="flex flex-col gap-1"
        >
          <h2 className="break-after-avoid text-base font-bold text-black">{commune.name}</h2>
          <ProspectingList
            rows={commune.stops.map((stop) => stop.card.row)}
            start={commune.start}
            notes={Object.fromEntries(
              commune.stops.map(({ card }) => [card.row.id, pourLabel(card)]),
            )}
          />
        </section>
      ))}

      {tour.colleagues.length > 0 ? (
        <section
          data-testid="tour-colleagues"
          className="flex flex-col gap-1 border-t border-zinc-300 pt-3"
        >
          <h2 className="break-after-avoid text-base font-bold text-black">
            Confrères à appeler (exclusivités)
          </h2>
          <ul className="flex flex-col divide-y divide-zinc-200 print:divide-zinc-300">
            {tour.colleagues.map((card) => (
              <li
                key={card.row.id}
                className="flex break-inside-avoid flex-col gap-0.5 py-3 text-sm"
              >
                <span className="font-semibold text-black">
                  {card.row.listingNumber
                    ? `Annonce n° ${card.row.listingNumber}`
                    : 'Annonce sans numéro'}
                  {card.row.portal ? ` · ${card.row.portal}` : ''}
                </span>
                <span className="text-zinc-800">{competitorFacts(card.row).join(' · ')}</span>
                {card.row.address ? (
                  <span className="text-zinc-700">{card.row.address}</span>
                ) : null}
                <span className="text-zinc-700">{pourLabel(card)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
