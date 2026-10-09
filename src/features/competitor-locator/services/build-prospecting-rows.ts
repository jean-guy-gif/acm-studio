import { deriveListingAge } from '@/features/comparable-import/services/derive-listing-age';
import { derivePriceChange } from '@/features/comparable-import/services/derive-price-change';
import type { ListingAge } from '@/features/comparable-import/types';
import {
  LISTING_PORTAL_LABELS,
  extractListingKey,
} from '@/features/comparable-import/utils/extract-listing-key';
import type { Comparable } from '@/features/comparables/types';
import { formatEuro, formatPercent } from '@/lib/format';

// Mission 75 — « Concurrents à prospecter » : la liste de tournée d'un dossier conclu « mandat
// signé ». Pure : chaque ligne est composée de ce qu'ACM sait déjà (annonce, observations,
// Localisateur). Rien n'est inventé : un champ absent reste absent.

// La section n'existe que pour un dossier en Suivi dont l'issue est « mandat signé ».
export function isProspectingOpen(status: string, outcome: string | null | undefined): boolean {
  return status === 'meeting_completed' && outcome === 'signed';
}

export type ProspectingObservation = {
  portal: string;
  listingKey: string;
  observedOn: string;
  price: number;
  boundLabel: string | null;
};

export type ProspectingRow = {
  id: string;
  title: string | null;
  // Adresse rendue par le Localisateur ; null tant qu'il n'en rend pas une seule.
  address: string | null;
  // Étiquette du Localisateur, affichée telle quelle.
  label: string | null;
  confirmed: boolean;
  price: number | null;
  surfaceArea: number | null;
  roomsCount: number | null;
  onlineSince: string | null;
  priceDrop: string | null;
  listingUrl: string | null;
};

const frDate = (iso: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

const days = (count: number): string => `${count} ${count > 1 ? 'jours' : 'jour'}`;

// Mêmes règles que l'historique d'une annonce (mission 47) : la source est nommée, une borne
// basse reste un texte, et une première observation dit « vue par ACM », jamais « en ligne ».
export function describeOnlineSince(age: ListingAge): string | null {
  if (!age) {
    return null;
  }
  if (age.kind === 'exact') {
    return `En ligne depuis le ${frDate(age.publishedAt)} · ${days(age.days)} — d’après ${age.source}`;
  }
  if (age.kind === 'lowerBound') {
    return `En ligne depuis ${age.label} (${age.source})`;
  }
  return `Vue par ACM depuis ${days(age.days)}`;
}

// La baisse validée par le conseiller d'abord ; sinon celle qu'ACM a constatée entre deux
// observations, avec ses deux dates. Une hausse n'est pas une baisse : rien.
function describePriceDrop(
  competitor: Comparable,
  observations: ProspectingObservation[],
): string | null {
  if (competitor.price_drop_amount != null && competitor.price_drop_amount > 0) {
    const percentage =
      competitor.price_drop_percentage != null && competitor.price_drop_percentage > 0
        ? ` (−${formatPercent(competitor.price_drop_percentage)})`
        : '';
    return `Baisse de ${formatEuro(competitor.price_drop_amount)}${percentage}`;
  }
  const change = derivePriceChange(
    observations.map((observation) => ({
      observedOn: observation.observedOn,
      price: observation.price,
    })),
  );
  if (!change || change.amount <= 0) {
    return null;
  }
  return `Baisse constatée par ACM : ${formatEuro(change.fromPrice)} le ${frDate(change.fromDate)}, ${formatEuro(change.toPrice)} le ${frDate(change.toDate)} (−${formatPercent(change.percentage)})`;
}

const clean = (value: string | null): string | null => value?.trim() || null;

export function buildProspectingRows(
  competitors: Comparable[],
  observations: ProspectingObservation[],
  now: Date = new Date(),
): ProspectingRow[] {
  return competitors
    .filter((competitor) => competitor.is_selected)
    .map((competitor) => {
      const identity = competitor.listing_url ? extractListingKey(competitor.listing_url) : null;
      const own = identity
        ? observations
            .filter(
              (observation) =>
                observation.portal === identity.portal &&
                observation.listingKey === identity.listingKey,
            )
            .sort((a, b) => a.observedOn.localeCompare(b.observedOn))
        : [];
      const boundLabel = [...own]
        .reverse()
        .find((observation) => observation.boundLabel)?.boundLabel;

      const age = deriveListingAge(
        {
          publishedAtExact: competitor.listing_published_at,
          lowerBoundLabel: boundLabel ?? null,
          source: identity
            ? (LISTING_PORTAL_LABELS[identity.portal] ?? identity.portal)
            : clean(competitor.source),
          firstObservedAt: own.length > 0 ? own[0].observedOn : null,
        },
        now,
      );

      return {
        id: competitor.id,
        title: clean(competitor.title),
        address: clean(competitor.locator_address),
        label: clean(competitor.locator_label),
        confirmed: competitor.locator_confirmed === true,
        price: competitor.price > 0 ? competitor.price : null,
        surfaceArea: competitor.surface_area,
        roomsCount: competitor.rooms_count,
        onlineSince: describeOnlineSince(age),
        priceDrop: describePriceDrop(competitor, own),
        listingUrl: clean(competitor.listing_url),
      };
    });
}
