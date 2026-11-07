import { AVAILABILITY_SLOTS, type BuyerDeck, type DeckItem } from '@/features/buyer-deck/types';
import { allowedItem } from '@/features/buyer-presentation/services/build-presentation';

// Un déroulé figé, relu de la base : écrit par le serveur seul (`finish_buyer_presentation`), il
// est repris tel quel ; une forme inattendue vaut « pas de déroulé figé ».
export function storedDeck(value: unknown): BuyerDeck | null {
  if (typeof value !== 'object' || value == null) return null;
  const deck = value as Partial<BuyerDeck>;
  return Array.isArray(deck.items) && Array.isArray(deck.criteria) && typeof deck.words === 'string'
    ? (deck as BuyerDeck)
    : null;
}

// La LISTE D'AUTORISATION du déroulé (M51) : champ par champ, rien d'autre ne sort — ni d'un
// déroulé figé relu de la base, ni du calcul ; les faits de chaque bien repassent par celle de la
// présentation (M119). Pur.
export function allowedDeck(deck: BuyerDeck): BuyerDeck {
  const slots: readonly unknown[] = Array.isArray(deck.meetingAvailability)
    ? deck.meetingAvailability
    : [];
  return {
    // Mission 140 — la langue du déroulé : un code de la liste, sinon le français (un déroulé figé
    // avant la mission est en français).
    language: deck.language === 'en' ? 'en' : 'fr',
    buyerId: deck.buyerId,
    buyerName: deck.buyerName,
    selectionId: deck.selectionId,
    selectedAt: deck.selectedAt,
    presentedAt: deck.presentedAt,
    words: deck.words,
    wordsProposed: deck.wordsProposed,
    criteria: deck.criteria.map((row) => ({
      criterion: row.criterion,
      label: row.label,
      mustHave: row.mustHave,
    })),
    items: deck.items.map((entry): DeckItem => ({
      letter: entry.letter,
      item: allowedItem(entry.item),
      photos: [...entry.photos],
      marks: entry.marks.map((mark) => ({
        criterion: mark.criterion,
        mark: mark.mark,
        text: mark.text,
        tone: mark.tone ?? null,
      })),
      okCount: entry.okCount,
      total: entry.total,
      priceLine: entry.priceLine,
      pricePerSqm: entry.pricePerSqm,
      pitch: entry.pitch,
      pitchProposed: entry.pitchProposed,
      datedFact: entry.datedFact,
      blocked: entry.blocked,
      blockedBy: [...entry.blockedBy],
    })),
    lead: deck.lead,
    leadLetter: deck.leadLetter,
    meetingAvailability: AVAILABILITY_SLOTS.filter((slot) => slots.includes(slot)),
  };
}

// Mission 122 (décisions de Jean-Guy, 25/10) — le déroulé que montre la présentation. Terminée,
// elle se relit TELLE QU'ELLE A ÉTÉ AFFICHÉE : rien ne se recalcule, sauf les photos d'un bien de
// l'agence, dont les liens sont signés pour une heure (M37) ; les photos d'une annonce ou d'un
// concurrent restent celles du déroulé figé. Une présentation terminée avant la mission n'a pas
// de déroulé figé : elle se recalcule, faute de mieux. Avant « Terminer », le calcul du moment.
// Le déroulé figé relu repasse en entier par la liste d'autorisation (`allowedDeck`) : une clé
// glissée dans le JSON stocké n'en sort pas.
export function deckForReading(input: {
  presentedAt: string | null;
  presentedDeck: unknown;
  computed: BuyerDeck;
}): BuyerDeck {
  const stored = input.presentedAt ? storedDeck(input.presentedDeck) : null;
  if (!stored) return input.computed;
  const frozen = allowedDeck(stored);
  const fresh = new Map(input.computed.items.map((item) => [item.item.itemId, item]));
  return {
    ...frozen,
    presentedAt: input.presentedAt,
    items: frozen.items.map((item) => {
      const now = fresh.get(item.item.itemId);
      return item.item.source === 'project' && now
        ? { ...item, photos: now.photos, item: { ...item.item, photos: now.item.photos } }
        : item;
    }),
  };
}
