import type {
  AvailabilitySlot,
  BuyerDeck,
  DeckItem,
  ItemResponse,
} from '@/features/buyer-deck/types';
import { allowedItem } from '@/features/buyer-presentation/services/build-presentation';
import type {
  BuyerDossier,
  DossierAgency,
  DossierPhotoChoice,
} from '@/features/buyer-dossier/types';

// Mission 122 (partie B) — le déroulé que reçoit l'acquéreur, sur le lien comme sur le PDF : rien de
// ce qui est réservé au conseiller — ni les phrases proposées par l'outil quand il les a modifiées,
// ni le signalement d'un indispensable avant de présenter — et, pour un bien « Sans photo », aucune
// photo. Une LISTE D'AUTORISATION, champ par champ (M51) : rien d'autre ne sort, même d'un déroulé
// figé relu de la base ; les faits d'un bien repassent par celle de la présentation (M119). Pur.
export function publicDeck(deck: BuyerDeck, hidden: ReadonlyMap<string, boolean>): BuyerDeck {
  return {
    buyerId: deck.buyerId,
    buyerName: deck.buyerName,
    selectionId: deck.selectionId,
    selectedAt: deck.selectedAt,
    presentedAt: deck.presentedAt,
    words: deck.words,
    wordsProposed: deck.words,
    criteria: deck.criteria.map((row) => ({
      criterion: row.criterion,
      label: row.label,
      mustHave: row.mustHave,
    })),
    items: deck.items.map((entry): DeckItem => {
      const noPhoto = hidden.get(entry.item.itemId) === true;
      const item = allowedItem(entry.item);
      return {
        letter: entry.letter,
        item: { ...item, photos: noPhoto ? [] : item.photos },
        photos: noPhoto ? [] : [...entry.photos],
        marks: entry.marks.map((mark) => ({
          criterion: mark.criterion,
          mark: mark.mark,
          text: mark.text,
        })),
        okCount: entry.okCount,
        total: entry.total,
        priceLine: entry.priceLine,
        pricePerSqm: entry.pricePerSqm,
        pitch: entry.pitch,
        pitchProposed: entry.pitch,
        datedFact: entry.datedFact,
        blocked: false,
        blockedBy: [],
      };
    }),
    lead: deck.lead,
    leadLetter: deck.leadLetter,
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
