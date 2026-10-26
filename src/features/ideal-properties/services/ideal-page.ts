import { listingIdentityKey } from '@/features/comparable-import/utils/extract-listing-key';
import type { SelectionItemInput } from '@/features/ideal-properties/services/ideal-selection';

// Essai de Jean-Guy (26/10) — sur Biens idéaux, un même bien n'apparaît qu'une fois. Le bandeau
// « Sélection actuelle » : la sélection enregistrée, puis les biens cochés depuis. Les listes de
// l'agence et du marché n'y répètent rien : ni un bien du bandeau, ni une annonce du marché que
// l'agence connaît déjà comme concurrent, ni un concurrent dont l'annonce est dans le bandeau.
// « Le même bien » : même source et même référence, ou la même annonce publiée (portail + numéro).
// Service pur.
export type PageEntry = { item: SelectionItemInput; listingUrl: string | null };

export const selectionKey = (item: Pick<SelectionItemInput, 'source' | 'reference'>): string =>
  `${item.source}:${item.reference}`;

const listingKeys = (urls: (string | null)[]): Set<string> =>
  new Set(
    urls
      .map((url) => (url ? listingIdentityKey(url) : null))
      .filter((key): key is string => key != null),
  );

export function idealPageLayout({
  baseline,
  selected,
  agency,
}: {
  baseline: SelectionItemInput[];
  selected: SelectionItemInput[];
  agency: PageEntry[];
}): {
  banner: SelectionItemInput[];
  showAgency: (entry: PageEntry) => boolean;
  showMarket: (entry: PageEntry) => boolean;
} {
  const banner = [
    ...baseline,
    ...selected.filter(
      (item) => !baseline.some((kept) => selectionKey(kept) === selectionKey(item)),
    ),
  ];
  const inBanner = new Set(banner.map(selectionKey));
  const bannerListings = listingKeys(
    banner.filter((item) => item.source === 'listing').map((item) => item.reference),
  );
  const agencyListings = listingKeys(agency.map((entry) => entry.listingUrl));
  const sameListing = (entry: PageEntry, known: Set<string>): boolean => {
    const key = entry.listingUrl ? listingIdentityKey(entry.listingUrl) : null;
    return key != null && known.has(key);
  };
  return {
    banner,
    showAgency: (entry) =>
      !inBanner.has(selectionKey(entry.item)) && !sameListing(entry, bannerListings),
    showMarket: (entry) =>
      !inBanner.has(selectionKey(entry.item)) && !sameListing(entry, agencyListings),
  };
}
