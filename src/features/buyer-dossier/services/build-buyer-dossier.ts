import {
  allowedItem,
  criteriaLines,
  itemFacts,
  whyItMatches,
} from '@/features/buyer-presentation/services/build-presentation';
import type { PresentedItemInput } from '@/features/buyer-presentation/types';
import type { BuyerDossier, DossierAgency, DossierItem } from '@/features/buyer-dossier/types';
import type { BuyerInput } from '@/features/buyers/types';
import { seenOnLabel } from '@/features/ideal-properties/services/ideal-selection';

// Mission 119 (partie B) — le constructeur du dossier, PUR : les biens passent par la liste
// d'autorisation de la présentation (`allowedItem`), le prix et les écarts sont ceux figés à la
// sélection (M111), « Pourquoi » et « À savoir » sont ceux de la présentation ; une photo par bien,
// la première, sauf « Sans photo ».
export function buildBuyerDossier(input: {
  buyerId: string;
  selectionId: string;
  buyer: BuyerInput;
  selectedAt: string;
  items: (PresentedItemInput & { photoHidden: boolean; visitRequested: boolean })[];
  agency: DossierAgency;
  brandDeclarations: string;
}): BuyerDossier {
  const items: DossierItem[] = [...input.items]
    .sort((a, b) => a.position - b.position)
    .map((raw) => {
      const item = allowedItem(raw);
      return {
        itemId: item.itemId,
        position: item.position,
        label: item.label,
        where:
          [item.district, item.city]
            .filter((part): part is string => part != null && part !== '')
            .join(' · ') || null,
        price: item.price,
        pricePerSqm:
          item.price != null && item.surfaceArea != null && item.surfaceArea > 0
            ? Math.round(item.price / item.surfaceArea)
            : null,
        seenOnLabel: item.source === 'listing' ? seenOnLabel(item.priceSeenOn) : null,
        facts: itemFacts(item),
        why: whyItMatches(input.buyer, item),
        gaps: item.gaps,
        photoUrl: raw.photoHidden ? null : (item.photos[0] ?? null),
        hasPhoto: item.photos.length > 0,
        photoHidden: raw.photoHidden,
        visitRequested: raw.visitRequested,
      };
    });
  return {
    buyerId: input.buyerId,
    selectionId: input.selectionId,
    buyerName: input.buyer.name,
    selectedAt: input.selectedAt,
    sector: input.buyer.cities.join(', '),
    criteria: criteriaLines(input.buyer),
    items,
    agency: input.agency,
    brandDeclarations: input.brandDeclarations,
  };
}
