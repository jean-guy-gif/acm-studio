import type {
  AvailabilitySlot,
  BuyerDeck,
  DeckItem,
  ItemResponse,
} from '@/features/buyer-deck/types';
import { allowedDeck } from '@/features/buyer-deck/services/frozen-deck';
import type {
  BuyerDossier,
  DossierAgency,
  DossierPhotoChoice,
} from '@/features/buyer-dossier/types';

// Mission 122 (partie B) — le déroulé que reçoit l'acquéreur, sur le lien comme sur le PDF : rien de
// ce qui est réservé au conseiller — ni les phrases proposées par l'outil quand il les a modifiées,
// ni le signalement d'un indispensable avant de présenter — et, pour un bien « Sans photo », aucune
// photo. Il part de la LISTE D'AUTORISATION du déroulé (`allowedDeck`, M51), puis retire ce qui est
// réservé au conseiller. Pur.
export function publicDeck(deck: BuyerDeck, hidden: ReadonlyMap<string, boolean>): BuyerDeck {
  const allowed = allowedDeck(deck);
  return {
    ...allowed,
    wordsProposed: allowed.words,
    items: allowed.items.map((entry): DeckItem => {
      const noPhoto = hidden.get(entry.item.itemId) === true;
      return {
        ...entry,
        item: { ...entry.item, photos: noPhoto ? [] : entry.item.photos },
        photos: noPhoto ? [] : entry.photos,
        pitchProposed: entry.pitch,
        blocked: false,
        blockedBy: [],
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
  answered: boolean;
  answers: ItemResponse[];
  availability: AvailabilitySlot[];
  meetingAnswers: ItemResponse[];
  meetingAvailability: AvailabilitySlot[];
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
    answered: input.answered,
    answers: input.answers,
    availability: input.availability,
    meetingAnswers: input.meetingAnswers,
    meetingAvailability: input.meetingAvailability,
    agency: input.agency,
    brandDeclarations: input.brandDeclarations,
  };
}
