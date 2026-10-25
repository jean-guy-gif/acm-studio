import type {
  AvailabilitySlot,
  BuyerDeck,
  DeckItem,
  ItemResponse,
} from '@/features/buyer-deck/types';
import type {
  BuyerDossier,
  DossierAgency,
  DossierPhotoChoice,
} from '@/features/buyer-dossier/types';

// Mission 122 (partie B) — le déroulé que reçoit l'acquéreur, sur le lien comme sur le PDF : rien de
// ce qui est réservé au conseiller — ni les phrases proposées par l'outil quand il les a modifiées,
// ni le signalement d'un indispensable avant de présenter — et, pour un bien « Sans photo », aucune
// photo. Le reste est le déroulé lui-même (liste d'autorisation de M119, prix du 24/10). Pur.
export function publicDeck(deck: BuyerDeck, hidden: ReadonlyMap<string, boolean>): BuyerDeck {
  return {
    ...deck,
    wordsProposed: deck.words,
    items: deck.items.map((entry): DeckItem => {
      const noPhoto = hidden.get(entry.item.itemId) === true;
      return {
        ...entry,
        pitchProposed: entry.pitch,
        blocked: false,
        blockedBy: [],
        photos: noPhoto ? [] : entry.photos,
        item: { ...entry.item, photos: noPhoto ? [] : entry.item.photos },
      };
    }),
  };
}

export function buildBuyerDossier(input: {
  buyerId: string;
  selectionId: string;
  selectedAt: string;
  sector: string;
  deck: BuyerDeck;
  hidden: ReadonlyMap<string, boolean>;
  answers: ItemResponse[];
  availability: AvailabilitySlot[];
  agency: DossierAgency;
  brandDeclarations: string;
}): BuyerDossier {
  const photoChoices: DossierPhotoChoice[] = input.deck.items.map((entry) => ({
    itemId: entry.item.itemId,
    letter: entry.letter,
    label: entry.item.label,
    hasPhoto: entry.item.photos.length > 0,
    photoHidden: input.hidden.get(entry.item.itemId) === true,
  }));
  return {
    buyerId: input.buyerId,
    selectionId: input.selectionId,
    selectedAt: input.selectedAt,
    sector: input.sector,
    deck: publicDeck(input.deck, input.hidden),
    photoChoices,
    answers: input.answers,
    availability: input.availability,
    agency: input.agency,
    brandDeclarations: input.brandDeclarations,
  };
}
